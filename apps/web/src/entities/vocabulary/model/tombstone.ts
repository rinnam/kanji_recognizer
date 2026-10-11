import { markTombstoned } from '@kanji-nest/core';
import { STORE } from '../../../shared/config';
import { emitDataChanged, idbBulkPut, idbGetAll } from '../../../shared/lib';
import type { LocalVocabulary } from './types';

export { markTombstoned };

/**
 * Tombstone hàng loạt từ vựng trong MỘT transaction IndexedDB, rồi emit change-bus MỘT lần
 * (để sync đẩy thao tác xóa lên server). Dùng cho xóa hàng loạt ở Tổng quan (Commit 4).
 * Trả về danh sách bản ghi đã cập nhật (rỗng nếu không có gì để xóa).
 */
export async function tombstoneVocabularies(
  db: IDBDatabase,
  ids: readonly string[],
  now: string,
): Promise<LocalVocabulary[]> {
  if (ids.length === 0) return [];
  const all = await idbGetAll<LocalVocabulary>(db, STORE.vocabularies);
  const updated = markTombstoned(all, ids, now);
  if (updated.length === 0) return [];
  await idbBulkPut(db, STORE.vocabularies, updated);
  emitDataChanged();
  return updated;
}
