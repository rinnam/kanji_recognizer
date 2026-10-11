import type { VocabularyDto as LocalVocabulary } from '../dto';

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
