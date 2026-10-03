/**
 * Ba chế độ học flashcard (CONTEXT.md §"SRS phase / chế độ Flashcard"):
 * - normal: lật thẻ thường, đi hết bộ (không ghi SRS).
 * - progress: ưu tiên thẻ ít tiến độ nhất (không ghi SRS).
 * - anki: chỉ thẻ tới hạn, áp SM-2 + lưu lịch ôn (có ghi srs*).
 */
export type FlashcardMode = 'normal' | 'progress' | 'anki';

/** Thống kê nhanh bộ thẻ (chỉ tính thẻ còn sống) cho bộ chọn chế độ. */
export interface FlashcardSummary {
  total: number;
  due: number;
  fresh: number; // thẻ mới: CHƯA TỪNG học (srsNextReview === null)
  learned: number; // đã có lịch ôn (srsNextReview !== null)
}
