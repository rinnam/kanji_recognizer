import { describe, expect, it } from 'vitest';
import type { LocalFolder } from '../../src/entities/folder';
import { markTombstoned, type LocalVocabulary } from '../../src/entities/vocabulary';
import { planFolderCascade } from '../../src/features/folder-tree/model/cascade';
import { selectDirty } from '../../src/features/sync/model/engine';

const OLD = '2026-01-01T00:00:00.000Z';
const NOW = '2026-03-01T00:00:00.000Z';

function folder(partial: Partial<LocalFolder> & { id: string }): LocalFolder {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    parentId: partial.parentId ?? null,
    order: partial.order ?? null,
    createdAt: partial.createdAt ?? OLD,
    updatedAt: partial.updatedAt ?? OLD,
    deletedAt: partial.deletedAt ?? null,
  };
}

function vocab(partial: Partial<LocalVocabulary> & { id: string }): LocalVocabulary {
  return {
    id: partial.id,
    word: partial.word ?? partial.id,
    meaning: partial.meaning ?? 'nghĩa',
    reading: partial.reading ?? null,
    sinoVietnamese: partial.sinoVietnamese ?? null,
    example: partial.example ?? null,
    exampleMeaning: partial.exampleMeaning ?? null,
    note: partial.note ?? null,
    tags: partial.tags ?? [],
    jlptLevel: partial.jlptLevel ?? null,
    srsInterval: partial.srsInterval ?? null,
    srsRepetition: partial.srsRepetition ?? null,
    srsEaseFactor: partial.srsEaseFactor ?? null,
    srsNextReview: partial.srsNextReview ?? null,
    folderIds: partial.folderIds ?? [],
    createdAt: partial.createdAt ?? OLD,
    updatedAt: partial.updatedAt ?? OLD,
    deletedAt: partial.deletedAt ?? null,
  };
}

// Cây 3 cấp: a → b → c; thêm z (sống, ngoài phạm vi) và d (đã xóa từ trước).
const folders: LocalFolder[] = [
  folder({ id: 'a' }),
  folder({ id: 'b', parentId: 'a' }),
  folder({ id: 'c', parentId: 'b' }),
  folder({ id: 'z' }),
  folder({ id: 'd', deletedAt: OLD }),
];

const vocabs: LocalVocabulary[] = [
  vocab({ id: 'v1', folderIds: ['b'] }), // chỉ thuộc thư mục bị xóa → tombstone
  vocab({ id: 'v2', folderIds: ['c', 'z'] }), // còn 'z' sống → giữ, mất liên kết 'c'
  vocab({ id: 'v3', folderIds: ['z'] }), // ngoài phạm vi → không đụng
  vocab({ id: 'v4', folderIds: [] }), // không thư mục → không đụng
  vocab({ id: 'v5', folderIds: ['a'], deletedAt: OLD }), // đã xóa từ trước → bỏ qua
  vocab({ id: 'v6', folderIds: ['a'] }), // thuộc chính thư mục gốc → tombstone
];

describe('folder-tree/cascade planFolderCascade', () => {
  const plan = planFolderCascade(folders, vocabs, 'a', NOW);

  it('tombstone chính nó + mọi con cháu, đặt deletedAt=updatedAt=now', () => {
    expect(plan.folders.map((f) => f.id).sort()).toEqual(['a', 'b', 'c']);
    expect(plan.folders.every((f) => f.deletedAt === NOW && f.updatedAt === NOW)).toBe(true);
  });

  it('số đếm F/V/K đúng (F=con cháu không tính gốc)', () => {
    expect(plan.counts).toEqual({
      folders: 3,
      childFolders: 2,
      vocabTombstoned: 2,
      vocabKept: 1,
    });
  });

  it('từ thuộc 2 thư mục (một bị xóa) → GIỮ, chỉ mất liên kết', () => {
    const kept = plan.vocabularies.find((v) => v.id === 'v2');
    expect(kept).toBeDefined();
    expect(kept?.deletedAt).toBeNull();
    expect(kept?.folderIds).toEqual(['z']);
    expect(kept?.updatedAt).toBe(NOW);
  });

  it('từ chỉ thuộc thư mục bị xóa (gồm cả thư mục gốc) → TOMBSTONE', () => {
    for (const id of ['v1', 'v6']) {
      const dead = plan.vocabularies.find((v) => v.id === id);
      expect(dead?.deletedAt).toBe(NOW);
      expect(dead?.updatedAt).toBe(NOW);
    }
  });

  it('từ ngoài phạm vi / không thư mục / đã xóa từ trước → KHÔNG đụng tới', () => {
    const touched = new Set(plan.vocabularies.map((v) => v.id));
    expect(touched.has('v3')).toBe(false);
    expect(touched.has('v4')).toBe(false);
    expect(touched.has('v5')).toBe(false);
  });

  it('selectDirty lấy được MỌI bản ghi bị ảnh hưởng (updatedAt = now)', () => {
    const affected = [...plan.folders, ...plan.vocabularies];
    expect(selectDirty(affected, OLD)).toHaveLength(affected.length);
  });

  it('thư mục đã xóa từ trước / không tồn tại → kế hoạch rỗng (idempotent)', () => {
    expect(planFolderCascade(folders, vocabs, 'd', NOW).folders).toHaveLength(0);
    expect(planFolderCascade(folders, vocabs, 'missing', NOW).counts.folders).toBe(0);
  });
});

describe('vocabulary/tombstone markTombstoned', () => {
  it('đặt deletedAt + updatedAt = now cho các id khớp còn sống', () => {
    const result = markTombstoned([vocab({ id: 'x' }), vocab({ id: 'y' })], ['x'], NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'x', deletedAt: NOW, updatedAt: NOW });
  });

  it('bỏ qua từ đã xóa từ trước và id rỗng', () => {
    expect(markTombstoned([vocab({ id: 'x', deletedAt: OLD })], ['x'], NOW)).toEqual([]);
    expect(markTombstoned([vocab({ id: 'x' })], [], NOW)).toEqual([]);
  });
});
