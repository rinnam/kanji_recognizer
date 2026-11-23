import type { PullResult, VocabularyDto } from '../../packages/contracts/src/study';

const date = '2026-11-23T00:00:00.000Z';
const words = [
  ['つまり', 'nói cách khác'],
  ['それとも', 'hoặc'],
  ['または', 'hoặc'],
  ['また', 'lại, mặt khác'],
  ['そのうえ', 'hơn nữa'],
  ['そこで', 'thế là, nhân đó'],
] as const;

export const sampleLibrary: PullResult = {
  serverTime: date,
  folders: [
    { id: 'sample-vocabulary', name: 'Từ vựng', parentId: null, order: 0, createdAt: date, updatedAt: date, deletedAt: null },
    { id: 'sample-01', name: '01', parentId: 'sample-vocabulary', order: 0, createdAt: date, updatedAt: date, deletedAt: null },
  ],
  vocabularies: words.map(([word, meaning], index): VocabularyDto => ({
    id: `sample-word-${index}`, word, reading: word, meaning, sinoVietnamese: null,
    example: null, exampleMeaning: null, note: null, tags: [], jlptLevel: 'N3',
    srsInterval: null, srsRepetition: null, srsEaseFactor: null, srsNextReview: null,
    folderIds: ['sample-01'], createdAt: date, updatedAt: date, deletedAt: null,
  })),
};
