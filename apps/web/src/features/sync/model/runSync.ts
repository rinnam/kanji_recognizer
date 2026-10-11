import { pull, push, type FolderDto, type SyncCounts, type VocabularyDto } from '../../../shared/api';
import { STORE } from '../../../shared/config';
import { idbBulkPut, idbGetAll } from '../../../shared/lib';
import { readSyncCursor, writeLastPulledAt, writeLastPushedAt } from './cursor';
import {
  chunk,
  latestIso,
  maxUpdatedAt,
  orderFoldersParentsFirst,
  pickIncomingWinners,
  selectDirty,
} from './engine';

export interface SyncRunSummary {
  pushed: { folders: SyncCounts; vocabularies: SyncCounts };
  merged: { folders: number; vocabularies: number };
  serverTime: string;
}

const EMPTY_COUNTS: SyncCounts = { applied: 0, skipped: 0 };

/** Số bản ghi tối đa mỗi lô push (giữ body dưới giới hạn ~1 MiB mặc định của Fastify). */
const PUSH_BATCH_SIZE = 200;

/** Một bản ghi bẩn kèm loại, để gộp folders + vocabularies vào MỘT dòng thời gian push. */
type TaggedDirty =
  | { kind: 'folder'; record: FolderDto }
  | { kind: 'vocabulary'; record: VocabularyDto };

function addCounts(a: SyncCounts, b: SyncCounts): SyncCounts {
  return { applied: a.applied + b.applied, skipped: a.skipped + b.skipped };
}

/**
 * Một vòng đồng bộ hai chiều (local-first):
 *  1) PUSH các bản ghi local "bẩn" (`updatedAt` > `lastPushedAt`; chưa có con trỏ → tất cả),
 *     bao gồm cả tombstone để xóa lan truyền. Push thành công → lưu `lastPushedAt` =
 *     `updatedAt` LỚN NHẤT của tập vừa đẩy (KHÔNG dùng giờ máy client).
 *  2) PULL delta kể từ `lastPulledAt` → merge LWW (giữ tombstone) vào IndexedDB →
 *     lưu `lastPulledAt` = `serverTime` do server trả về.
 *
 * Push trước Pull để không đẩy ngược các bản vừa kéo về trong cùng một vòng. Thao tác
 * ở tầng store thô (`shared/lib` idb + `STORE`) vì sync là việc hạ tầng chung mọi entity;
 * local record = DTO (LocalFolder = FolderDto, LocalVocabulary = VocabularyDto).
 */
export async function runSync(db: IDBDatabase): Promise<SyncRunSummary> {
  const cursor = await readSyncCursor(db);

  const localFolders = await idbGetAll<FolderDto>(db, STORE.folders);
  const localVocabularies = await idbGetAll<VocabularyDto>(db, STORE.vocabularies);

  // 1) PUSH các bản ghi bẩn — ĐẨY THEO LÔ (tránh vượt giới hạn body ~1 MiB của server).
  // THỨ TỰ AN TOÀN KHÓA NGOẠI: đẩy TẤT CẢ folder TRƯỚC (cha trước con, theo độ sâu), RỒI tới
  // vocabulary. Nếu trộn theo `updatedAt` rồi chia lô, một thư mục con có thể vào lô TRƯỚC thư
  // mục cha (hoặc một từ lên trước thư mục nó tham chiếu): BE set `parent_id`/link tới bản ghi
  // CHƯA tồn tại ở lô này ⇒ FK violation ⇒ "Lỗi đồng bộ". Folder-trước-vocab + cha-trước-con
  // khử triệt để lỗi đó (BE còn xử lý tự-tham-chiếu trong MỘT request bằng 2 pha).
  const dirtyFolders = selectDirty(localFolders, cursor.lastPushedAt);
  const dirtyVocabularies = selectDirty(localVocabularies, cursor.lastPushedAt);

  let pushed = { folders: EMPTY_COUNTS, vocabularies: EMPTY_COUNTS };
  if (dirtyFolders.length > 0 || dirtyVocabularies.length > 0) {
    const orderedFolders = orderFoldersParentsFirst(dirtyFolders);
    const orderedVocabularies = [...dirtyVocabularies].sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );
    const timeline: TaggedDirty[] = [
      ...orderedFolders.map((record): TaggedDirty => ({ kind: 'folder', record })),
      ...orderedVocabularies.map((record): TaggedDirty => ({ kind: 'vocabulary', record })),
    ];

    let folderCounts: SyncCounts = { applied: 0, skipped: 0 };
    let vocabularyCounts: SyncCounts = { applied: 0, skipped: 0 };

    for (const batch of chunk(timeline, PUSH_BATCH_SIZE)) {
      const folders: FolderDto[] = [];
      const vocabularies: VocabularyDto[] = [];
      for (const item of batch) {
        if (item.kind === 'folder') folders.push(item.record);
        else vocabularies.push(item.record);
      }
      const result = await push({ folders, vocabularies });
      folderCounts = addCounts(folderCounts, result.folders);
      vocabularyCounts = addCounts(vocabularyCounts, result.vocabularies);
    }

    // Vì thứ tự đẩy KHÔNG còn tăng đơn điệu theo `updatedAt` (folder-trước-vocab), không thể
    // dời con trỏ an toàn giữa chừng. Chỉ dời con trỏ SAU KHI đẩy xong TOÀN BỘ: nếu một lô ném
    // lỗi thì con trỏ GIỮ nguyên và vòng sau đẩy lại từ đầu (push idempotent ⇒ không mất dữ liệu).
    const mark = latestIso([
      cursor.lastPushedAt,
      maxUpdatedAt([...dirtyFolders, ...dirtyVocabularies]),
    ]);
    if (mark !== null) await writeLastPushedAt(db, mark);

    pushed = { folders: folderCounts, vocabularies: vocabularyCounts };
  }

  // 2) PULL delta + merge LWW.
  const pullResult = await pull(cursor.lastPulledAt ?? undefined);
  const folderWinners = pickIncomingWinners(localFolders, pullResult.folders);
  const vocabularyWinners = pickIncomingWinners(localVocabularies, pullResult.vocabularies);
  await idbBulkPut(db, STORE.folders, folderWinners);
  await idbBulkPut(db, STORE.vocabularies, vocabularyWinners);
  await writeLastPulledAt(db, pullResult.serverTime);

  return {
    pushed,
    merged: { folders: folderWinners.length, vocabularies: vocabularyWinners.length },
    serverTime: pullResult.serverTime,
  };
}
