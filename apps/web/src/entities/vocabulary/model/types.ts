import type { JlptLevel, VocabularyDto } from '../../../shared/api';

/** Từ vựng phía client — nguồn sự thật local-first (AGENTS §7.1), map 1-1 DTO/DB. */
export type LocalVocabulary = VocabularyDto;

/** Input tạo từ vựng (khớp validators/vocabulary.ts của BE). */
export interface CreateVocabularyInput {
  id?: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  exampleMeaning?: string | null;
  note?: string | null;
  tags?: string[];
  jlptLevel?: JlptLevel | null;
  srsInterval?: number | null;
  srsRepetition?: number | null;
  srsEaseFactor?: number | null;
  srsNextReview?: string | null;
  folderIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Input cập nhật (ít nhất một field; không đổi id/createdAt). */
export type UpdateVocabularyInput = Partial<
  Omit<CreateVocabularyInput, 'id' | 'createdAt'>
>;

/** Tham số lọc danh sách (khớp listVocabulariesQuerySchema). */
export interface ListVocabulariesQuery {
  folderId?: string;
  jlptLevel?: JlptLevel;
  search?: string;
  limit?: number;
  offset?: number;
}
