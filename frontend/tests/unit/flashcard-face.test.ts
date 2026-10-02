import { describe, expect, it } from 'vitest';
import type { LocalVocabulary } from '../../src/entities/vocabulary';
import { selectFaceContent } from '../../src/features/flashcard/model/face';

function vocab(partial: Partial<LocalVocabulary>): LocalVocabulary {
  return {
    id: 'id',
    word: '水',
    meaning: 'nước',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...partial,
  };
}

describe('flashcard/face selectFaceContent', () => {
  it('mặt trước gồm word + Hán Việt (ẩn khi rỗng)', () => {
    expect(selectFaceContent(vocab({ word: '水', sinoVietnamese: 'THỦY' }), 'front')).toEqual({
      face: 'front',
      word: '水',
      sinoVietnamese: 'THỦY',
    });
    const trimmed = selectFaceContent(vocab({ sinoVietnamese: '   ' }), 'front');
    expect(trimmed).toEqual({ face: 'front', word: '水', sinoVietnamese: null });
  });

  it('mặt sau gồm cách đọc / nghĩa / ví dụ / dịch ví dụ (ẩn trường rỗng)', () => {
    expect(
      selectFaceContent(
        vocab({
          reading: 'みず',
          meaning: 'nước',
          example: '水を飲む',
          exampleMeaning: 'uống nước',
        }),
        'back',
      ),
    ).toEqual({
      face: 'back',
      reading: 'みず',
      meaning: 'nước',
      example: '水を飲む',
      exampleMeaning: 'uống nước',
    });

    expect(
      selectFaceContent(vocab({ reading: '', example: '', exampleMeaning: null }), 'back'),
    ).toEqual({
      face: 'back',
      reading: null,
      meaning: 'nước',
      example: null,
      exampleMeaning: null,
    });
  });
});
