import { describe, expect, it } from 'vitest';
import { orderFoldersParentsFirst } from '../../src/features/sync/model/engine';

interface Rec {
  id: string;
  parentId: string | null;
  updatedAt: string;
}

const T = {
  a: '2026-01-01T00:00:00.000Z',
  b: '2026-01-02T00:00:00.000Z',
  c: '2026-01-03T00:00:00.000Z',
};

describe('sync/engine orderFoldersParentsFirst', () => {
  it('cha trước con dù con có updatedAt sớm hơn (chống FK khi chia lô)', () => {
    const input: Rec[] = [
      { id: 'c', parentId: 'b', updatedAt: T.b }, // cháu
      { id: 'b', parentId: 'a', updatedAt: T.a }, // con
      { id: 'a', parentId: null, updatedAt: T.c }, // gốc, updatedAt muộn nhất
    ];
    expect(orderFoldersParentsFirst(input).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('cùng độ sâu → sắp theo updatedAt tăng dần, rồi id', () => {
    const input: Rec[] = [
      { id: 'y', parentId: null, updatedAt: T.c },
      { id: 'x', parentId: null, updatedAt: T.a },
    ];
    expect(orderFoldersParentsFirst(input).map((r) => r.id)).toEqual(['x', 'y']);
  });

  it('cha không nằm trong tập (đã đẩy trước) → coi như gốc, không lỗi', () => {
    const input: Rec[] = [{ id: 'child', parentId: 'absent', updatedAt: T.a }];
    expect(orderFoldersParentsFirst(input).map((r) => r.id)).toEqual(['child']);
  });

  it('không làm biến đổi mảng gốc', () => {
    const input: Rec[] = [
      { id: 'b', parentId: 'a', updatedAt: T.a },
      { id: 'a', parentId: null, updatedAt: T.b },
    ];
    orderFoldersParentsFirst(input);
    expect(input.map((r) => r.id)).toEqual(['b', 'a']);
  });
});
