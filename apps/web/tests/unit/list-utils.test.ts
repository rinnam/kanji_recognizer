import { describe, expect, it } from 'vitest';
import {
  pageState,
  paginate,
  selectRange,
  setMany,
  sortVocabs,
  toggleId,
} from '../../src/features/vocabulary/model/list-utils';
import type { LocalVocabulary } from '../../src/entities/vocabulary';

function vocab(id: string, createdAt: string): LocalVocabulary {
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

const ids = (list: LocalVocabulary[]): string[] => list.map((v) => v.id);
const range10 = Array.from({ length: 10 }, (_, i) => i + 1);

describe('features/vocabulary/list-utils — paginate', () => {
  it('trang đầu: cắt đúng lát + siêu dữ liệu', () => {
    expect(paginate(range10, 1, 3)).toEqual({
      items: [1, 2, 3],
      page: 1,
      pageCount: 4,
      total: 10,
      from: 1,
      to: 3,
    });
  });

  it('trang giữa: from/to theo đúng offset', () => {
    const result = paginate(range10, 2, 3);
    expect(result.items).toEqual([4, 5, 6]);
    expect(result).toMatchObject({ page: 2, from: 4, to: 6 });
  });

  it('trang cuối lẻ: chỉ còn phần dư', () => {
    expect(paginate(range10, 4, 3)).toMatchObject({
      items: [10],
      page: 4,
      pageCount: 4,
      from: 10,
      to: 10,
    });
  });

  it('trang vượt giới hạn → kẹp về trang cuối', () => {
    expect(paginate(range10, 99, 3)).toEqual(paginate(range10, 4, 3));
  });

  it('trang < 1 → kẹp về 1', () => {
    expect(paginate(range10, 0, 3).page).toBe(1);
    expect(paginate(range10, -5, 3).page).toBe(1);
  });

  it('size lớn hơn tổng → một trang chứa tất cả', () => {
    expect(paginate(range10, 1, 100)).toMatchObject({
      items: range10,
      page: 1,
      pageCount: 1,
      total: 10,
      from: 1,
      to: 10,
    });
  });

  it('size <= 0 → trang rỗng an toàn (pageCount 1, from=to=0)', () => {
    expect(paginate(range10, 1, 0)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 10,
      from: 0,
      to: 0,
    });
    expect(paginate(range10, 3, -2)).toMatchObject({ items: [], pageCount: 1, from: 0, to: 0 });
  });

  it('danh sách rỗng → an toàn', () => {
    expect(paginate([], 5, 3)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      from: 0,
      to: 0,
    });
  });

  it('không sửa mảng đầu vào', () => {
    const src = [1, 2, 3, 4, 5];
    paginate(src, 2, 2);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('features/vocabulary/list-utils — chọn nhiều (Set bất biến)', () => {
  it('toggleId thêm khi vắng, bỏ khi có; trả Set mới', () => {
    const base = new Set(['a']);
    const added = toggleId(base, 'b');
    const removed = toggleId(base, 'a');
    expect([...added].sort()).toEqual(['a', 'b']);
    expect([...removed]).toEqual([]);
    expect(added).not.toBe(base);
    expect([...base]).toEqual(['a']);
  });

  it('setMany: checked=true thêm, checked=false bỏ; không sửa Set gốc', () => {
    const base = new Set(['a', 'b']);
    expect([...setMany(base, ['b', 'c'], true)].sort()).toEqual(['a', 'b', 'c']);
    expect([...setMany(base, ['a', 'x'], false)].sort()).toEqual(['b']);
    expect([...base].sort()).toEqual(['a', 'b']);
  });

  it('selectRange: xuôi, ngược, một phần tử, id không tồn tại', () => {
    const order = ['a', 'b', 'c', 'd', 'e'];
    expect(selectRange(order, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(selectRange(order, 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(selectRange(order, 'c', 'c')).toEqual(['c']);
    expect(selectRange(order, 'a', 'z')).toEqual([]);
    expect(selectRange(order, 'x', 'c')).toEqual([]);
  });

  it('pageState: none / some / all / trang rỗng', () => {
    const sel = new Set(['a', 'c']);
    expect(pageState(sel, ['a', 'b', 'c'])).toBe('some');
    expect(pageState(sel, ['a', 'c'])).toBe('all');
    expect(pageState(sel, ['x', 'y'])).toBe('none');
    expect(pageState(sel, [])).toBe('none');
    expect(pageState(new Set<string>(), ['a'])).toBe('none');
  });
});

describe('features/vocabulary/list-utils — sortVocabs', () => {
  const items = [
    vocab('c', '2026-01-03T00:00:00.000Z'),
    vocab('a', '2026-01-01T00:00:00.000Z'),
    vocab('b', '2026-01-02T00:00:00.000Z'),
  ];

  it("'added' = createdAt tăng dần", () => {
    expect(ids(sortVocabs(items, 'added'))).toEqual(['a', 'b', 'c']);
  });

  it("'newest' = createdAt giảm dần", () => {
    expect(ids(sortVocabs(items, 'newest'))).toEqual(['c', 'b', 'a']);
  });

  it('tie-break theo id (ổn định) khi cùng createdAt', () => {
    const same = [
      vocab('y', '2026-01-01T00:00:00.000Z'),
      vocab('x', '2026-01-01T00:00:00.000Z'),
      vocab('z', '2026-01-01T00:00:00.000Z'),
    ];
    expect(ids(sortVocabs(same, 'added'))).toEqual(['x', 'y', 'z']);
    expect(ids(sortVocabs(same, 'newest'))).toEqual(['x', 'y', 'z']);
  });

  it('không sửa mảng đầu vào', () => {
    const before = ids(items);
    sortVocabs(items, 'newest');
    sortVocabs(items, 'added');
    expect(ids(items)).toEqual(before);
  });
});
