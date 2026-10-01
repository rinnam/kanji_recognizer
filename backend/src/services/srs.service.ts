/**
 * SRS (Anki SM-2) — logic THUẦN, KHÔNG phụ thuộc DB/mạng, tất định.
 *
 * Công thức: docs/reference/kotobase-feature-audit.md §2.
 * Thang điểm (ĐÃ CHỐT — CONTEXT.md): Again=0, Hard=3, Good=4, Easy=5.
 * Áp công thức EF' cho MỌI lần đánh giá (sàn 1.3). KHÔNG thêm biến thể
 * Hard×1.2 / Easy-bonus của Anki.
 *
 * Tách khỏi DB để unit test tất định (xem services/flashcard.service.ts cho
 * phần điều phối đọc/ghi vocabulary).
 */

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

/** Trạng thái SRS hiện tại của một thẻ (field có thể chưa khởi tạo = null). */
export interface SrsState {
  interval: number | null; // srsInterval (số ngày)
  repetition: number | null; // srsRepetition (số lần nhớ liên tiếp)
  easeFactor: number | null; // srsEaseFactor
}

/** Kết quả sau một lần ôn: trạng thái SRS mới + ngày ôn kế tiếp. */
export interface SrsReviewResult {
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReview: Date;
}

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
const FIRST_INTERVAL_DAYS = 1;
const SECOND_INTERVAL_DAYS = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Ánh xạ nút đánh giá → q của SM-2 (ĐÃ CHỐT). */
const RATING_TO_QUALITY: Record<SrsRating, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export function ratingToQuality(rating: SrsRating): number {
  return RATING_TO_QUALITY[rating];
}

/** Làm tròn 2 chữ số thập phân (khớp cột numeric(4,2) trong DB). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)); sàn MIN_EASE_FACTOR.
 * Áp cho mọi lần đánh giá (kể cả Again).
 */
export function nextEaseFactor(easeFactor: number, quality: number): number {
  const gap = 5 - quality;
  const delta = 0.1 - gap * (0.08 + gap * 0.02);
  const updated = round2(easeFactor + delta);
  return updated < MIN_EASE_FACTOR ? MIN_EASE_FACTOR : updated;
}

/**
 * Thẻ tới hạn ôn khi srsNextReview <= now. Chưa có lịch (null/undefined) →
 * coi như tới hạn (thẻ mới cần học). (§2.3)
 */
export function isDue(
  nextReview: Date | string | null | undefined,
  now: Date,
): boolean {
  if (nextReview === null || nextReview === undefined) return true;
  return new Date(nextReview).getTime() <= now.getTime();
}

/**
 * Áp một lần đánh giá SM-2 lên trạng thái hiện tại.
 * - q < 3 (Again): repetition = 0, interval = 1.
 * - q >= 3: repetition += 1; interval = rep==1 ? 1 : rep==2 ? 6 : round(interval_trước × EF').
 * - nextReview = now + interval ngày.
 */
export function review(
  state: SrsState,
  rating: SrsRating,
  now: Date,
): SrsReviewResult {
  const quality = ratingToQuality(rating);
  const prevEase = state.easeFactor ?? DEFAULT_EASE_FACTOR;
  const prevRepetition = state.repetition ?? 0;
  const prevInterval = state.interval ?? 0;

  const easeFactor = nextEaseFactor(prevEase, quality);

  let repetition: number;
  let interval: number;

  if (quality < 3) {
    repetition = 0;
    interval = FIRST_INTERVAL_DAYS;
  } else {
    repetition = prevRepetition + 1;
    if (repetition === 1) {
      interval = FIRST_INTERVAL_DAYS;
    } else if (repetition === 2) {
      interval = SECOND_INTERVAL_DAYS;
    } else {
      interval = Math.round(prevInterval * easeFactor);
    }
  }

  const nextReview = new Date(now.getTime() + interval * MS_PER_DAY);
  return { interval, repetition, easeFactor, nextReview };
}
