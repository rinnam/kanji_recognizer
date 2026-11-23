import type { FolderDto, VocabularyDto } from '../../src/shared/api';

export const baselineTime = '2026-11-22T09:00:00.000Z';
export const parentFolder: FolderDto = {
  id: 'folder_mobile_parent', name: 'JLPT N3', parentId: null, order: null,
  createdAt: baselineTime, updatedAt: baselineTime, deletedAt: null,
};
export const childFolder: FolderDto = {
  ...parentFolder, id: 'folder_mobile_child', name: '01', parentId: parentFolder.id,
};
export const sampleWord: VocabularyDto = {
  id: 'vocab_mobile_sample', word: 'つまり', meaning: 'nói cách khác', reading: 'つまり',
  sinoVietnamese: null, example: null, exampleMeaning: null, note: null, tags: [],
  jlptLevel: 'N3', srsInterval: 1, srsRepetition: 1, srsEaseFactor: 2.5,
  srsNextReview: '2026-11-23T09:00:00.000Z', folderIds: [parentFolder.id, childFolder.id],
  createdAt: baselineTime, updatedAt: baselineTime, deletedAt: null,
};
export const deletedWord: VocabularyDto = {
  ...sampleWord, id: 'vocab_mobile_deleted', word: 'また', reading: 'また', deletedAt: baselineTime,
};
