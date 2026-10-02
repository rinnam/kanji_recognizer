import { isDue } from '../../../entities/card';
import type { LocalVocabulary } from '../../../entities/vocabulary';
import type { FlashcardMode, FlashcardSummary } from './types';

/**
 * Dựng hàng đợi ôn + thống kê bộ thẻ — THUẦN (không DOM/DB), tất định để unit test.
 * Chỉ xét thẻ còn sống (deletedAt === null); "tới hạn" dùng lại `isDue` của entities/card
 * (null = thẻ mới → coi là tới hạn).
 */

function isLiving(vocab: LocalVocabulary): boolean {
  return vocab.deletedAt === null;
}

/** So sánh ổn định theo createdAt tăng dần, tie-break bằng id (kết quả tất định). */
function byCreatedAtAsc(a: LocalVocabulary, b: LocalVocabulary): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/** Mức tiến độ = số lần nhớ liên tiếp (null = 0 = thẻ mới). */
function progressOf(vocab: LocalVocabulary): number {
  return vocab.srsRepetition ?? 0;
}

/**
 * Hàng đợi theo chế độ:
 * - normal: tất cả thẻ sống, cũ → mới.
 * - progress: tất cả thẻ sống, ít tiến độ nhất trước, rồi cũ → mới.
 * - anki: chỉ thẻ tới hạn; thẻ mới (srsNextReview null) trước, rồi hạn ôn sớm hơn trước.
 */
export function buildQueue(
  vocabs: readonly LocalVocabulary[],
  mode: FlashcardMode,
  now: Date,
): LocalVocabulary[] {
  const living = vocabs.filter(isLiving);

  if (mode === 'normal') {
    return [...living].sort(byCreatedAtAsc);
  }

  if (mode === 'progress') {
    return [...living].sort((a, b) => {
      const diff = progressOf(a) - progressOf(b);
      return diff !== 0 ? diff : byCreatedAtAsc(a, b);
    });
  }

  // anki
  return living
    .filter((vocab) => isDue(vocab.srsNextReview, now))
    .sort((a, b) => {
      const ra = a.srsNextReview;
      const rb = b.srsNextReview;
      if (ra === null && rb === null) return byCreatedAtAsc(a, b);
      if (ra === null) return -1;
      if (rb === null) return 1;
      if (ra !== rb) return ra < rb ? -1 : 1;
      return byCreatedAtAsc(a, b);
    });
}

/** Thống kê bộ thẻ sống (tổng / tới hạn / mới / đã học). */
export function summarize(
  vocabs: readonly LocalVocabulary[],
  now: Date,
): FlashcardSummary {
  const living = vocabs.filter(isLiving);
  let due = 0;
  let fresh = 0;
  let learned = 0;
  for (const vocab of living) {
    if (isDue(vocab.srsNextReview, now)) due += 1;
    if (progressOf(vocab) === 0) fresh += 1;
    else learned += 1;
  }
  return { total: living.length, due, fresh, learned };
}
