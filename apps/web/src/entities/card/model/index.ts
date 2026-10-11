/** Re-export SM-2 từ @kanji-nest/core (nguồn sự thật duy nhất phía client). */
export type { SrsState, SrsReviewResult } from '@kanji-nest/core';
export {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  ratingToQuality,
  nextEaseFactor,
  isDue,
  review,
} from '@kanji-nest/core';
