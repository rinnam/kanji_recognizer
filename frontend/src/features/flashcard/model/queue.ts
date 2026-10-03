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

/**
 * Thống kê bộ thẻ sống (tổng / tới hạn / mới / đã học).
 *
 * "Mới" (fresh) = CHỈ thẻ CHƯA TỪNG học, tức `srsNextReview === null`. Thẻ bị chấm
 * Again có `srsRepetition = 0` nhưng ĐÃ có lịch ôn (`srsNextReview !== null`) → KHÔNG
 * phải "Mới" mà là "đã có lịch" (learned). Bất biến: Tới hạn >= Mới (mọi thẻ mới đều
 * tới hạn vì `isDue(null)` = true); Tổng = chưa học (fresh) + đã có lịch (learned).
 */
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
    if (vocab.srsNextReview === null) fresh += 1;
    else learned += 1;
  }
  return { total: living.length, due, fresh, learned };
}

/**
 * Hàng đợi "Ôn trước hạn" (THUẦN): các thẻ sống ĐÃ có lịch nhưng CHƯA tới hạn
 * (`srsNextReview !== null` và `!isDue`), sắp theo `srsNextReview` tăng dần (sớm → muộn).
 * Thẻ mới (null) đã nằm trong hàng đợi Anki thường nên không gồm ở đây. Chấm bình thường
 * theo SM-2 (giống chế độ Anki) — chỉ khác ở việc nạp thẻ chưa tới hạn.
 */
export function buildReviewAheadQueue(
  vocabs: readonly LocalVocabulary[],
  now: Date,
): LocalVocabulary[] {
  return vocabs
    .filter(isLiving)
    .filter((v) => v.srsNextReview !== null && !isDue(v.srsNextReview, now))
    .sort((a, b) => {
      const ra = a.srsNextReview as string;
      const rb = b.srsNextReview as string;
      if (ra !== rb) return ra < rb ? -1 : 1;
      return byCreatedAtAsc(a, b);
    });
}

/**
 * Mốc tới hạn kế tiếp (THUẦN): `srsNextReview` SỚM NHẤT trong các thẻ sống CHƯA tới hạn
 * (lịch nằm ở tương lai). Trả `null` nếu không có thẻ nào đang chờ tới hạn.
 */
export function nextDueAt(
  vocabs: readonly LocalVocabulary[],
  now: Date,
): string | null {
  let earliest: string | null = null;
  for (const vocab of vocabs) {
    if (!isLiving(vocab)) continue;
    const at = vocab.srsNextReview;
    if (at === null || isDue(at, now)) continue;
    if (earliest === null || at < earliest) earliest = at;
  }
  return earliest;
}
