/**
 * SRS (Anki Modified SM-2) — logic THUẦN, KHÔNG phụ thuộc DB/mạng, tất định.
 *
 * Thuật toán Anki chuẩn:
 * - Thẻ mới (rep = 0):
 *   + Again: rep = 0, interval = 1, EF - 0.20 (sàn 1.30)
 *   + Hard:  rep = 1, interval = 1, EF - 0.15
 *   + Good:  rep = 1, interval = 1, EF giữ nguyên
 *   + Easy:  rep = 1, interval = 4 (Easy interval mặc định Anki), EF + 0.15
 *
 * - Thẻ lần 2 (rep = 1):
 *   + Again: rep = 0, interval = 1, EF - 0.20
 *   + Hard:  rep = 2, interval = 3 (Hard giãn nhẹ), EF - 0.15
 *   + Good:  rep = 2, interval = 6 (Good interval chuẩn), EF giữ nguyên
 *   + Easy:  rep = 2, interval = 8 (6 × 1.3 Easy bonus), EF + 0.15
 *
 * - Thẻ ôn tập (rep >= 2):
 *   + Again: rep = 0, interval = 1, EF - 0.20
 *   + Hard:  rep += 1, interval = max(prevInterval + 1, round(prevInterval × 1.2)), EF - 0.15
 *   + Good:  rep += 1, interval = max(prevInterval + 1, round(prevInterval × EF)), EF giữ nguyên
 *   + Easy:  rep += 1, interval = max(prevInterval + 1, round(prevInterval × EF × 1.3)), EF + 0.15
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
export const HARD_FACTOR = 1.2;
export const EASY_BONUS = 1.3;

export const FIRST_INTERVAL_DAYS = 1;
export const SECOND_INTERVAL_DAYS = 6;
export const EASY_FIRST_INTERVAL_DAYS = 4;
export const HARD_SECOND_INTERVAL_DAYS = 3;
export const EASY_SECOND_INTERVAL_DAYS = 8;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Ánh xạ nút đánh giá → q của SM-2 để tương thích. */
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
 * Cập nhật Ease Factor theo chuẩn Anki:
 * - again: -0.20
 * - hard:  -0.15
 * - good:   0.00 (giữ nguyên)
 * - easy:  +0.15
 * Sàn tối thiểu MIN_EASE_FACTOR = 1.30.
 */
export function nextEaseFactor(
  easeFactor: number,
  ratingOrQuality: SrsRating | number,
): number {
  let delta = 0;
  if (typeof ratingOrQuality === 'string') {
    switch (ratingOrQuality) {
      case 'again':
        delta = -0.20;
        break;
      case 'hard':
        delta = -0.15;
        break;
      case 'good':
        delta = 0;
        break;
      case 'easy':
        delta = 0.15;
        break;
    }
  } else {
    if (ratingOrQuality <= 0) delta = -0.20;
    else if (ratingOrQuality <= 3) delta = -0.15;
    else if (ratingOrQuality === 4) delta = 0;
    else delta = 0.15;
  }
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
 * Áp một lần đánh giá Anki SM-2 lên trạng thái hiện tại.
 */
export function review(
  state: SrsState,
  rating: SrsRating,
  now: Date,
): SrsReviewResult {
  const prevEase = state.easeFactor ?? DEFAULT_EASE_FACTOR;
  const prevRepetition = state.repetition ?? 0;
  const prevInterval = state.interval ?? 0;

  const easeFactor = nextEaseFactor(prevEase, rating);

  let repetition: number;
  let interval: number;

  if (rating === 'again') {
    repetition = 0;
    interval = FIRST_INTERVAL_DAYS;
  } else if (prevRepetition === 0) {
    // Thẻ mới đánh giá lần đầu
    repetition = 1;
    if (rating === 'easy') {
      interval = EASY_FIRST_INTERVAL_DAYS;
    } else {
      interval = FIRST_INTERVAL_DAYS;
    }
  } else if (prevRepetition === 1) {
    // Thẻ lần 2
    repetition = 2;
    if (rating === 'hard') {
      interval = HARD_SECOND_INTERVAL_DAYS;
    } else if (rating === 'easy') {
      interval = EASY_SECOND_INTERVAL_DAYS;
    } else {
      interval = SECOND_INTERVAL_DAYS;
    }
  } else {
    // Thẻ review lâu dài (repetition >= 2)
    repetition = prevRepetition + 1;
    if (rating === 'hard') {
      interval = Math.max(prevInterval + 1, Math.round(prevInterval * HARD_FACTOR));
    } else if (rating === 'easy') {
      interval = Math.max(
        prevInterval + 1,
        Math.round(prevInterval * prevEase * EASY_BONUS),
      );
    } else {
      interval = Math.max(prevInterval + 1, Math.round(prevInterval * prevEase));
    }
  }

  const nextReview = new Date(now.getTime() + interval * MS_PER_DAY);
  return { interval, repetition, easeFactor, nextReview };
}

/**
 * Định dạng nhãn thời gian dự báo (forecast label).
 */
export function formatIntervalLabel(days: number, isAgainSession = false): string {
  if (isAgainSession) return '<10p';
  if (days <= 1) return '1 ngày';
  if (days < 30) return `${days} ngày`;
  const months = Math.round((days / 30) * 10) / 10;
  return `${months} tháng`;
}

/**
 * Lấy nhãn thời gian dự báo cho một trạng thái thẻ khi người dùng ấn rating.
 */
export function previewIntervalLabel(
  state: SrsState,
  rating: SrsRating,
  inSession = true,
): string {
  if (rating === 'again' && inSession) {
    return '<10p';
  }
  const res = review(state, rating, new Date());
  return formatIntervalLabel(res.interval);
}
