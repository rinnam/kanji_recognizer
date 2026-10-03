import { describe, expect, it } from 'vitest';
import { chunk, highWaterMarkAfter, type SyncRecord } from '../../src/features/sync/model/engine';

function rec(id: string, updatedAt: string): SyncRecord {
  return { id, updatedAt, deletedAt: null };
}

const T = {
  a: '2026-01-01T00:00:00.000Z',
  b: '2026-01-02T00:00:00.000Z',
  c: '2026-01-03T00:00:00.000Z',
  d: '2026-01-04T00:00:00.000Z',
};

describe('sync/engine chunk', () => {
  it('chia theo kích thước lô', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ]);
  });

  it('rỗng → []; size>=len → một lô', () => {
    expect(chunk([], 3)).toEqual([]);
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it('size<=0 → một lô chứa tất cả (hoặc [] nếu rỗng)', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
    expect(chunk([], 0)).toEqual([]);
  });
});

describe('sync/engine highWaterMarkAfter', () => {
  const asc = [rec('1', T.a), rec('2', T.b), rec('3', T.c), rec('4', T.d)];

  it('pushedCount 0 → giữ previous', () => {
    expect(highWaterMarkAfter(asc, 0, T.a)).toBe(T.a);
    expect(highWaterMarkAfter(asc, 0, null)).toBeNull();
  });

  it('đẩy hết → updatedAt lớn nhất', () => {
    expect(highWaterMarkAfter(asc, 4, null)).toBe(T.d);
  });

  it('đẩy một phần (mốc phân biệt) → updatedAt bản cuối đã đẩy', () => {
    expect(highWaterMarkAfter(asc, 2, null)).toBe(T.b);
  });

  it('ranh giới trùng mốc → lùi về mốc < ranh giới (push lại idempotent)', () => {
    const tie = [rec('1', T.a), rec('2', T.b), rec('3', T.b), rec('4', T.c)];
    expect(highWaterMarkAfter(tie, 2, null)).toBe(T.a);
  });

  it('không bao giờ lùi dưới previous', () => {
    expect(highWaterMarkAfter(asc, 2, T.c)).toBe(T.c);
  });
});
