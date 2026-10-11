import { describe, expect, it } from 'vitest';
import {
  applyScope,
  type LocalVocabulary,
  type ScopeSelection,
} from '../../src/entities/vocabulary';

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

const ids = (list: LocalVocabulary[]): string[] => list.map((v) => v.id);

// Thứ tự nhập cố tình xáo so với createdAt để kiểm việc sắp xếp 'first'.
const words: LocalVocabulary[] = [
  word('c', '2026-01-03T00:00:00.000Z'),
  word('a', '2026-01-01T00:00:00.000Z'),
  word('e', '2026-01-05T00:00:00.000Z'),
  word('b', '2026-01-02T00:00:00.000Z'),
  word('d', '2026-01-04T00:00:00.000Z'),
];

describe('entities/vocabulary/scope-apply — applyScope', () => {
  it("'all' trả toàn bộ, giữ nguyên thứ tự nhập", () => {
    expect(ids(applyScope(words, sel('all', 2)))).toEqual(['c', 'a', 'e', 'b', 'd']);
  });

  it("'first' lấy n thẻ đầu theo createdAt tăng dần", () => {
    expect(ids(applyScope(words, sel('first', 3)))).toEqual(['a', 'b', 'c']);
  });

  it("'first' tie-break theo id khi cùng createdAt", () => {
    const same = [
      word('y', '2026-01-01T00:00:00.000Z'),
      word('x', '2026-01-01T00:00:00.000Z'),
      word('z', '2026-01-01T00:00:00.000Z'),
    ];
    expect(ids(applyScope(same, sel('first', 2)))).toEqual(['x', 'y']);
  });

  it("'random' cùng seed cho cùng kết quả; khác seed cho kết quả khác", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      word(`w${String(i)}`, `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    const a = ids(applyScope(many, sel('random', 10, 123)));
    const b = ids(applyScope(many, sel('random', 10, 123)));
    const c = ids(applyScope(many, sel('random', 10, 999)));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(10);
  });

  it('n > length → lấy tất cả; n < 1 → lấy 1', () => {
    expect(applyScope(words, sel('first', 99))).toHaveLength(words.length);
    expect(applyScope(words, sel('first', 0))).toHaveLength(1);
    expect(applyScope(words, sel('random', -5, 1))).toHaveLength(1);
  });

  it('mảng rỗng → []', () => {
    expect(applyScope([], sel('first', 3))).toEqual([]);
    expect(applyScope([], sel('all', 3))).toEqual([]);
  });

  it('không làm thay đổi mảng/thứ tự đầu vào', () => {
    const before = ids(words);
    applyScope(words, sel('first', 2));
    applyScope(words, sel('random', 3, 7));
    applyScope(words, sel('all', 1));
    expect(ids(words)).toEqual(before);
  });
});
