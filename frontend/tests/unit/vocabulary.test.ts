import { describe, expect, it } from 'vitest';
import type { LocalVocabulary } from '../../src/entities/vocabulary';
import { dedupeKey, findDuplicate } from '../../src/features/vocabulary/model/dedupe';
import { filterVocabularies } from '../../src/features/vocabulary/model/filter';

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
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-01-01T00:00:00.000Z',
    deletedAt: partial.deletedAt ?? null,
  };
}

describe('vocabulary/dedupe', () => {
  it('reading null coi như rỗng', () => {
    expect(dedupeKey('水', null)).toBe(dedupeKey('水', ''));
  });

  it('findDuplicate khớp (word, reading) và bỏ qua tombstone', () => {
    const list = [
      vocab({ id: 'a', word: '水', reading: 'みず' }),
      vocab({ id: 'b', word: '火', reading: 'ひ', deletedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    expect(findDuplicate(list, '水', 'みず')?.id).toBe('a');
    expect(findDuplicate(list, '水', 'べつ')).toBeUndefined();
    expect(findDuplicate(list, '火', 'ひ')).toBeUndefined();
  });
});

describe('vocabulary/filter', () => {
  const list = [
    vocab({ id: 'a', word: '水', meaning: 'nước', jlptLevel: 'N5', folderIds: ['f1'], createdAt: '2026-01-01T00:00:00.000Z' }),
    vocab({ id: 'b', word: '火', meaning: 'lửa', jlptLevel: 'N4', folderIds: ['f2'], createdAt: '2026-01-02T00:00:00.000Z' }),
    vocab({ id: 'c', word: '木', meaning: 'cây', jlptLevel: 'N5', folderIds: ['f1'], deletedAt: '2026-02-01T00:00:00.000Z' }),
  ];

  it('lọc theo thư mục + bỏ tombstone', () => {
    const ids = filterVocabularies(list, { folderId: 'f1', search: '', jlpt: null }).map((v) => v.id);
    expect(ids).toEqual(['a']);
  });

  it('lọc theo JLPT', () => {
    const ids = filterVocabularies(list, { folderId: null, search: '', jlpt: 'N4' }).map((v) => v.id);
    expect(ids).toEqual(['b']);
  });

  it('tìm kiếm theo nghĩa, mới nhất trước', () => {
    const ids = filterVocabularies(list, { folderId: null, search: 'l', jlpt: null }).map((v) => v.id);
    expect(ids).toEqual(['b']);
  });
});
