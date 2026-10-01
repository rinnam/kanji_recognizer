import { describe, expect, it } from 'vitest';
import type { LocalFolder } from '../../src/entities/folder';
import {
  ORDER_STEP,
  buildTree,
  isAncestor,
  reorderBefore,
  reparentAppend,
} from '../../src/features/folder-tree/model/tree';

function folder(partial: Partial<LocalFolder> & { id: string }): LocalFolder {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    parentId: partial.parentId ?? null,
    order: partial.order ?? null,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-01-01T00:00:00.000Z',
    deletedAt: partial.deletedAt ?? null,
  };
}

describe('folder-tree/tree', () => {
  it('buildTree lồng theo parent và sắp theo order', () => {
    const folders = [
      folder({ id: 'a', order: 2000 }),
      folder({ id: 'b', order: 1000 }),
      folder({ id: 'a1', parentId: 'a', order: 2000 }),
      folder({ id: 'a2', parentId: 'a', order: 1000 }),
    ];
    const tree = buildTree(folders);
    expect(tree.map((n) => n.folder.id)).toEqual(['b', 'a']);
    const a = tree[1];
    expect(a.children.map((n) => n.folder.id)).toEqual(['a2', 'a1']);
  });

  it('buildTree bỏ tombstone và re-root orphan', () => {
    const folders = [
      folder({ id: 'a', deletedAt: '2026-02-01T00:00:00.000Z' }),
      folder({ id: 'child', parentId: 'a' }),
      folder({ id: 'ghost', parentId: 'missing' }),
    ];
    const ids = buildTree(folders).map((n) => n.folder.id).sort();
    expect(ids).toEqual(['child', 'ghost']);
  });

  it('isAncestor phát hiện quan hệ cha–con', () => {
    const folders = [
      folder({ id: 'a' }),
      folder({ id: 'b', parentId: 'a' }),
      folder({ id: 'c', parentId: 'b' }),
    ];
    expect(isAncestor(folders, 'a', 'c')).toBe(true);
    expect(isAncestor(folders, 'c', 'a')).toBe(false);
  });

  it('reparentAppend chặn kéo vào chính con cháu', () => {
    const folders = [
      folder({ id: 'a' }),
      folder({ id: 'b', parentId: 'a' }),
    ];
    expect(reparentAppend(folders, 'a', 'b')).toEqual([]);
  });

  it('reparentAppend nối vào cuối danh sách con', () => {
    const folders = [
      folder({ id: 'root' }),
      folder({ id: 'x', parentId: 'root', order: 1000 }),
      folder({ id: 'y' }),
    ];
    expect(reparentAppend(folders, 'y', 'root')).toEqual([
      { id: 'y', parentId: 'root', order: 2 * ORDER_STEP },
    ]);
  });

  it('reorderBefore đặt phần tử ngay trước mục đích + đánh lại order', () => {
    const folders = [
      folder({ id: 'a', order: 1000 }),
      folder({ id: 'b', order: 2000 }),
      folder({ id: 'c', order: 3000 }),
    ];
    const patches = reorderBefore(folders, 'c', 'a');
    const final = patches.sort((p, q) => p.order - q.order).map((p) => p.id);
    expect(final).toEqual(['c', 'a', 'b']);
    expect(patches.every((p) => p.parentId === null)).toBe(true);
  });
});
