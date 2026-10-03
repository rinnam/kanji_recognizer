import { describe, expect, it } from 'vitest';
import type { LocalVocabulary, ScopeSelection } from '../../src/entities/vocabulary';
import { selectQuizPool } from '../../src/features/quiz/model/pool';

function word(id: string, createdAt: string): LocalVocabulary {
  return {
    id,
    word: id,
    meaning: 'nghĩa',
    reading: null,
    sinoVietnamese: null,
    example: null,
    exampleMeaning: null,
    note: null,
    tags: [],
    jlptLevel: null,
    srsInterval: null,
    srsRepetition: null,
    srsEaseFactor: null,
    srsNextReview: null,
    folderIds: [],
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };
}

function sel(mode: ScopeSelection['mode'], n: number, seed = 0): ScopeSelection {
  return { mode, n, seed };
}

// Thứ tự nhập cố tình xáo so với createdAt.
const base: LocalVocabulary[] = [
  word('c', '2026-01-03T00:00:00.000Z'),
  word('a', '2026-01-01T00:00:00.000Z'),
  word('d', '2026-01-04T00:00:00.000Z'),
  word('b', '2026-01-02T00:00:00.000Z'),
];

describe('quiz/pool selectQuizPool', () => {
  it("'first' chọn đúng bộ N theo createdAt tăng dần", () => {
    expect(selectQuizPool(base, sel('first', 2)).map((v) => v.id)).toEqual(['a', 'b']);
  });

  it("'random' cùng seed cho cùng bộ; khác seed cho bộ khác (đủ phần tử)", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      word(`w${String(i)}`, `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    const a = selectQuizPool(many, sel('random', 6, 42)).map((v) => v.id);
    const b = selectQuizPool(many, sel('random', 6, 42)).map((v) => v.id);
    const c = selectQuizPool(many, sel('random', 6, 7)).map((v) => v.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(6);
  });

  it("'all' giữ toàn bộ bộ từ trong phạm vi", () => {
    expect(selectQuizPool(base, sel('all', 2))).toHaveLength(base.length);
  });
});
