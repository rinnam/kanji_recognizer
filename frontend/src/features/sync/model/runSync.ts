import { pull, push, type FolderDto, type SyncCounts, type VocabularyDto } from '../../../shared/api';
import { STORE } from '../../../shared/config';
import { idbBulkPut, idbGetAll } from '../../../shared/lib';
import { readSyncCursor, writeLastPulledAt, writeLastPushedAt } from './cursor';
import { latestIso, maxUpdatedAt, pickIncomingWinners, selectDirty } from './engine';

export interface SyncRunSummary {
  pushed: { folders: SyncCounts; vocabularies: SyncCounts };
  merged: { folders: number; vocabularies: number };
  serverTime: string;
}

const EMPTY_COUNTS: SyncCounts = { applied: 0, skipped: 0 };

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

  // 1) PUSH các bản ghi bẩn.
  const dirtyFolders = selectDirty(localFolders, cursor.lastPushedAt);
  const dirtyVocabularies = selectDirty(localVocabularies, cursor.lastPushedAt);

  let pushed = { folders: EMPTY_COUNTS, vocabularies: EMPTY_COUNTS };
  if (dirtyFolders.length > 0 || dirtyVocabularies.length > 0) {
    const result = await push({ folders: dirtyFolders, vocabularies: dirtyVocabularies });
    pushed = { folders: result.folders, vocabularies: result.vocabularies };
    const nextPushedAt = latestIso([
      cursor.lastPushedAt,
      maxUpdatedAt(dirtyFolders),
      maxUpdatedAt(dirtyVocabularies),
    ]);
    if (nextPushedAt !== null) await writeLastPushedAt(db, nextPushedAt);
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
