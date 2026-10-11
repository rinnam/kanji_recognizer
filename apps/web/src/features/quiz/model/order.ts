import type { QuizQuestion } from './types';

/** PRNG tất định mulberry32: từ seed số nguyên → hàm sinh số thực trong [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** So sánh ổn định theo createdAt tăng dần, tie-break theo vocabularyId (tất định). */
function byCreatedAtAsc(a: QuizQuestion, b: QuizQuestion): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.vocabularyId === b.vocabularyId) return 0;
  return a.vocabularyId < b.vocabularyId ? -1 : 1;
}

/**
 * Sắp thứ tự câu hỏi — THUẦN, KHÔNG đụng mảng gốc.
 * - `shuffle=false` → "thứ tự thêm": createdAt tăng dần (ổn định, tie-break vocabularyId).
 * - `shuffle=true`  → xáo trộn Fisher–Yates TẤT ĐỊNH theo `seed` (cùng seed ⇒ cùng thứ tự).
 */
export function orderQuestions(
  questions: readonly QuizQuestion[],
  shuffle: boolean,
  seed: number,
): QuizQuestion[] {
  if (!shuffle) {
    return [...questions].sort(byCreatedAtAsc);
  }
  const copy = [...questions];
  const rand = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
