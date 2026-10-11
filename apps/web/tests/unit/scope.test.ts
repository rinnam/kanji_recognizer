import { describe, expect, it } from 'vitest';
import {
  collectDescendantFolderIds,
  selectWordsInScope,
  type LocalVocabulary,
  type ScopeFolder,
} from '../../src/entities/vocabulary';

function folder(id: string, parentId: string | null, deleted = false): ScopeFolder {
  return { id, parentId, deletedAt: deleted ? '2026-02-01T00:00:00.000Z' : null };
}

function word(
  id: string,
  folderIds: string[],
  opts: { deleted?: boolean; createdAt?: string } = {},
): LocalVocabulary {
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
    folderIds,
    createdAt: opts.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: opts.deleted ? '2026-02-01T00:00:00.000Z' : null,
  };
}

// Cây: N3 > { Bai1 > Bai1a, Bai2 }, Del (đã xóa)
const folders: ScopeFolder[] = [
  folder('N3', null),
  folder('Bai1', 'N3'),
  folder('Bai1a', 'Bai1'),
  folder('Bai2', 'N3'),
  folder('Del', 'N3', true),
];

describe('entities/vocabulary/scope — collectDescendantFolderIds', () => {
  it('gồm chính nó + mọi con cháu (nhánh lồng nhiều cấp)', () => {
    expect([...collectDescendantFolderIds(folders, 'N3')].sort()).toEqual([
      'Bai1',
      'Bai1a',
      'Bai2',
      'N3',
    ]);
  });

  it('nhánh con chỉ gồm con cháu của chính nó', () => {
    expect([...collectDescendantFolderIds(folders, 'Bai1')].sort()).toEqual(['Bai1', 'Bai1a']);
    expect([...collectDescendantFolderIds(folders, 'Bai2')]).toEqual(['Bai2']);
  });

  it('thư mục đã xóa hoặc id lạ → tập rỗng', () => {
    expect(collectDescendantFolderIds(folders, 'Del').size).toBe(0);
    expect(collectDescendantFolderIds(folders, 'khong-co').size).toBe(0);
  });
});

describe('entities/vocabulary/scope — selectWordsInScope', () => {
  it('null → tất cả từ còn sống (bỏ từ đã xóa)', () => {
    const vocabs = [
      word('a', ['Bai1']),
      word('b', ['Bai2']),
      word('c', [], { deleted: true }),
    ];
    expect(selectWordsInScope(vocabs, folders, null).map((v) => v.id)).toEqual(['a', 'b']);
  });

  it('cộng dồn con cháu, từ thuộc 2 thư mục chỉ tính một lần', () => {
    const vocabs = [
      word('a', ['Bai1']),
      word('b', ['Bai1a']),
      word('c', ['Bai2']),
      word('both', ['Bai1', 'Bai2']),
    ];
    expect(selectWordsInScope(vocabs, folders, 'N3').map((v) => v.id)).toEqual([
      'a',
      'b',
      'c',
      'both',
    ]);
    expect(selectWordsInScope(vocabs, folders, 'Bai1').map((v) => v.id)).toEqual([
      'a',
      'b',
      'both',
    ]);
  });

  it('từ đã xóa và từ chỉ thuộc thư mục đã xóa không được tính', () => {
    const vocabs = [
      word('live', ['Bai1']),
      word('gone', ['Bai1'], { deleted: true }),
      word('inDel', ['Del']),
    ];
    expect(selectWordsInScope(vocabs, folders, 'N3').map((v) => v.id)).toEqual(['live']);
  });

  it('thư mục rỗng → mảng rỗng', () => {
    const vocabs = [word('a', ['Bai1'])];
    expect(selectWordsInScope(vocabs, folders, 'Bai2')).toEqual([]);
  });
});
