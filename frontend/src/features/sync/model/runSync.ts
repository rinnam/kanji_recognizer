import { pull, push, type FolderDto, type SyncCounts, type VocabularyDto } from '../../../shared/api';
import { STORE } from '../../../shared/config';
import { idbBulkPut, idbGetAll } from '../../../shared/lib';
import { readSyncCursor, writeLastPulledAt, writeLastPushedAt } from './cursor';
import { chunk, highWaterMarkAfter, pickIncomingWinners, selectDirty } from './engine';

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

  // 1) PUSH các bản ghi bẩn — ĐẨY THEO LÔ (tránh vượt giới hạn body ~1 MiB của server khi
  // import lớn). Gộp folders + vocabularies thành MỘT dòng thời gian tăng theo `updatedAt`
  // (chung một con trỏ `lastPushedAt`); sau MỖI lô thành công lưu con trỏ an toàn, nên lô sau
  // lỗi sẽ KHÔNG làm mất phần chưa đẩy (vòng kế đẩy tiếp).
  const dirtyFolders = selectDirty(localFolders, cursor.lastPushedAt);
  const dirtyVocabularies = selectDirty(localVocabularies, cursor.lastPushedAt);

  let pushed = { folders: EMPTY_COUNTS, vocabularies: EMPTY_COUNTS };
  if (dirtyFolders.length > 0 || dirtyVocabularies.length > 0) {
    const timeline: TaggedDirty[] = [
      ...dirtyFolders.map((record): TaggedDirty => ({ kind: 'folder', record })),
      ...dirtyVocabularies.map((record): TaggedDirty => ({ kind: 'vocabulary', record })),
    ].sort(
      (a, b) => new Date(a.record.updatedAt).getTime() - new Date(b.record.updatedAt).getTime(),
    );
    const sortedRecords = timeline.map((item) => item.record);

    let folderCounts: SyncCounts = { applied: 0, skipped: 0 };
    let vocabularyCounts: SyncCounts = { applied: 0, skipped: 0 };
    let done = 0;

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
      done += batch.length;
      const mark = highWaterMarkAfter(sortedRecords, done, cursor.lastPushedAt);
      if (mark !== null) await writeLastPushedAt(db, mark);
    }
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
