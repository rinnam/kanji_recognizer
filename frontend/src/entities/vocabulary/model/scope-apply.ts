import type { LocalVocabulary } from './types';

/**
 * Kiểu lấy phạm vi con của bộ từ (dùng chung Flashcard & Quiz):
 * - `all`    → dùng toàn bộ.
 * - `first`  → N thẻ đầu theo createdAt tăng dần (ổn định, tie-break id).
 * - `random` → N thẻ ngẫu nhiên nhưng TẤT ĐỊNH theo `seed` (cùng seed ⇒ cùng kết quả).
 */
export interface ScopeSelection {
  mode: 'all' | 'first' | 'random';
  /** Số thẻ mong muốn cho 'first'/'random'; được kẹp trong [1, words.length]. */
  n: number;
  /** Seed cho PRNG mulberry32 (chỉ dùng ở 'random') để kết quả tất định. */
  seed: number;
}

/** So sánh ổn định theo createdAt tăng dần, tie-break bằng id (tất định). */
function byCreatedAtAsc(a: LocalVocabulary, b: LocalVocabulary): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/** PRNG tất định mulberry32: từ một seed số nguyên trả hàm sinh số thực trong [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Xáo trộn Fisher–Yates trên BẢN SAO với PRNG có seed (KHÔNG đụng mảng gốc). */
function shuffleSeeded(words: readonly LocalVocabulary[], seed: number): LocalVocabulary[] {
  const copy = [...words];
  const rand = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Chọn phạm vi con từ danh sách từ — THUẦN, tất định, KHÔNG làm thay đổi mảng đầu vào.
 * `n` được kẹp trong [1, words.length]; danh sách rỗng trả `[]`.
 */
export function applyScope(
  words: readonly LocalVocabulary[],
  selection: ScopeSelection,
): LocalVocabulary[] {
  if (words.length === 0) return [];
  if (selection.mode === 'all') return [...words];
  const count = Math.max(1, Math.min(Math.round(selection.n), words.length));
  if (selection.mode === 'first') {
    return [...words].sort(byCreatedAtAsc).slice(0, count);
  }
  return shuffleSeeded(words, selection.seed).slice(0, count);
}
