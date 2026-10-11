import { STORE } from '../../../shared/config';
import { emitDataChanged, idbBulkPut, idbGetAll } from '../../../shared/lib';
import type { LocalVocabulary } from './types';

/**
 * THUẦN (tất định, không đụng DB): trả về BẢN SAO của các từ có `id ∈ ids` và CÒN SỐNG,
 * đã đặt `deletedAt = updatedAt = now` (tombstone). Từ đã xóa trước đó hoặc không khớp id
 * → bỏ qua. Bất biến đồng bộ: tombstone LUÔN nâng `updatedAt` để LWW ở server không bỏ qua.
 */
export function markTombstoned(
  records: readonly LocalVocabulary[],
  ids: readonly string[],
  now: string,
): LocalVocabulary[] {
  const idSet = new Set(ids);
  return records
    .filter((item) => idSet.has(item.id) && item.deletedAt === null)
    .map((item) => ({ ...item, deletedAt: now, updatedAt: now }));
}

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
