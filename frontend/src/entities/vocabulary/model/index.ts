export type {
  LocalVocabulary,
  CreateVocabularyInput,
  UpdateVocabularyInput,
  ListVocabulariesQuery,
} from './types';
export {
  getAllVocabulariesLocal,
  getVocabularyLocal,
  getVocabulariesByFolderLocal,
  putVocabularyLocal,
  putVocabulariesLocal,
  deleteVocabularyLocal,
  countVocabularies,
} from './vocab.local';
