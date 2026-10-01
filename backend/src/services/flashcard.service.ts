import { env } from '../config/env.js';
import * as vocabRepo from '../repositories/vocabulary.repo.js';
import * as vocabFoldersRepo from '../repositories/vocabulary-folders.repo.js';
import { NotFoundError } from '../utils/errors.js';
import { vocabularyRowToDto, type VocabularyDto } from '../utils/row-mappers.js';
import { review, type SrsRating } from './srs.service.js';

/**
 * Điều phối tính năng Flashcard: đọc hàng đợi ôn và áp SM-2 khi người học đánh
 * giá một thẻ. Logic SM-2 thuần nằm ở srs.service; tầng này chỉ ghép DB
 * (vocabulary.repo) với kết quả tính toán.
 */

const ownerId = (): string => env.LOCAL_OWNER_ID;

/** Danh sách thẻ tới hạn ôn (hoặc thẻ mới) để học flashcard theo SRS. */
export async function listDueVocabularies(
  limit: number,
  now: Date = new Date(),
): Promise<VocabularyDto[]> {
  const rows = await vocabRepo.listDue(ownerId(), now, limit);
  const result: VocabularyDto[] = [];
  for (const row of rows) {
    const folderIds = await vocabFoldersRepo.listFolderIds(row.id);
    result.push(vocabularyRowToDto(row, folderIds));
  }
  return result;
}

/** Áp một lần đánh giá SM-2 lên thẻ rồi lưu lịch ôn mới, trả về thẻ đã cập nhật. */
export async function reviewVocabulary(
  id: string,
  rating: SrsRating,
  now: Date = new Date(),
): Promise<VocabularyDto> {
  const existing = await vocabRepo.selectById(ownerId(), id);
  if (!existing) throw new NotFoundError(`Vocabulary "${id}" not found`);

  const next = review(
    {
      interval: existing.srs_interval,
      repetition: existing.srs_repetition,
      easeFactor:
        existing.srs_ease_factor === null ? null : Number(existing.srs_ease_factor),
    },
    rating,
    now,
  );

  const updated = await vocabRepo.update(ownerId(), id, {
    srs_interval: next.interval,
    srs_repetition: next.repetition,
    srs_ease_factor: next.easeFactor,
    srs_next_review: next.nextReview,
  });
  if (!updated) throw new NotFoundError(`Vocabulary "${id}" not found`);

  const folderIds = await vocabFoldersRepo.listFolderIds(updated.id);
  return vocabularyRowToDto(updated, folderIds);
}
