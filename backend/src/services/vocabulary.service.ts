import { db } from '../config/database.js';
import { env } from '../config/env.js';
import * as vocabRepo from '../repositories/vocabulary.repo.js';
import * as vocabFoldersRepo from '../repositories/vocabulary-folders.repo.js';
import type { JlptLevel, NewVocabularyRow } from '../types/database.js';
import {
  DuplicateError,
  NotFoundError,
  isPgUniqueViolation,
} from '../utils/errors.js';
import { newVocabId } from '../utils/id.js';
import { vocabularyRowToDto, type VocabularyDto } from '../utils/row-mappers.js';
import type {
  CreateVocabularyInput,
  ListVocabulariesQuery,
  UpdateVocabularyInput,
} from '../validators/vocabulary.js';

const ownerId = (): string => env.LOCAL_OWNER_ID;

function easeToColumn(value: number | null | undefined): string | number | null | undefined {
  if (value === undefined) return undefined;
  return value;
}

export async function createVocabulary(
  input: CreateVocabularyInput,
): Promise<VocabularyDto> {
  const reading = input.reading ?? null;

  // Quick Add chống trùng: cùng owner + word + reading còn sống → 409.
  const dup = await vocabRepo.findDuplicate(ownerId(), input.word, reading);
  if (dup) {
    throw new DuplicateError(
      `A vocabulary with the same word and reading already exists (id: ${dup.id})`,
    );
  }

  const id = input.id ?? newVocabId();
  const now = new Date();

  const row: NewVocabularyRow = {
    id,
    owner_id: ownerId(),
    word: input.word,
    meaning: input.meaning,
    reading,
    sino_vietnamese: input.sinoVietnamese ?? null,
    example: input.example ?? null,
    example_meaning: input.exampleMeaning ?? null,
    note: input.note ?? null,
    tags: input.tags ?? [],
    jlpt_level: input.jlptLevel ?? null,
    srs_interval: input.srsInterval ?? null,
    srs_repetition: input.srsRepetition ?? null,
    srs_ease_factor: input.srsEaseFactor ?? null,
    srs_next_review: input.srsNextReview ?? null,
    created_at: input.createdAt ?? now,
    updated_at: input.updatedAt ?? now,
  };

  const folderIds = input.folderIds ?? [];

  try {
    const dto = await db.transaction().execute(async (trx) => {
      const created = await vocabRepo.insert(row, trx);
      await vocabFoldersRepo.linkFolders(created.id, folderIds, trx);
      const linked = await vocabFoldersRepo.listFolderIds(created.id, trx);
      return vocabularyRowToDto(created, linked);
    });
    return dto;
  } catch (err) {
    // Chống đua: unique partial index (owner, word, coalesce(reading,'')) → 409.
    if (isPgUniqueViolation(err)) {
      throw new DuplicateError(
        'A vocabulary with the same word and reading already exists',
      );
    }
    throw err;
  }
}

export async function listVocabularies(
  query: ListVocabulariesQuery,
): Promise<VocabularyDto[]> {
  const filters: vocabRepo.VocabularyListFilters = {
    limit: query.limit,
    offset: query.offset,
  };
  if (query.folderId !== undefined) filters.folderId = query.folderId;
  if (query.jlptLevel !== undefined) filters.jlptLevel = query.jlptLevel;
  if (query.search !== undefined) filters.search = query.search;

  const rows = await vocabRepo.list(ownerId(), filters);
  const result: VocabularyDto[] = [];
  for (const row of rows) {
    const folderIds = await vocabFoldersRepo.listFolderIds(row.id);
    result.push(vocabularyRowToDto(row, folderIds));
  }
  return result;
}

export async function getVocabulary(id: string): Promise<VocabularyDto> {
  const row = await vocabRepo.selectById(ownerId(), id);
  if (!row) throw new NotFoundError(`Vocabulary "${id}" not found`);
  const folderIds = await vocabFoldersRepo.listFolderIds(row.id);
  return vocabularyRowToDto(row, folderIds);
}

export async function updateVocabulary(
  id: string,
  input: UpdateVocabularyInput,
): Promise<VocabularyDto> {
  const existing = await vocabRepo.selectById(ownerId(), id);
  if (!existing) throw new NotFoundError(`Vocabulary "${id}" not found`);

  const patch: Parameters<typeof vocabRepo.update>[2] = {};
  if (input.word !== undefined) patch.word = input.word;
  if (input.meaning !== undefined) patch.meaning = input.meaning;
  if (input.reading !== undefined) patch.reading = input.reading;
  if (input.sinoVietnamese !== undefined) patch.sino_vietnamese = input.sinoVietnamese;
  if (input.example !== undefined) patch.example = input.example;
  if (input.exampleMeaning !== undefined) patch.example_meaning = input.exampleMeaning;
  if (input.note !== undefined) patch.note = input.note;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.jlptLevel !== undefined) patch.jlpt_level = input.jlptLevel as JlptLevel | null;
  if (input.srsInterval !== undefined) patch.srs_interval = input.srsInterval;
  if (input.srsRepetition !== undefined) patch.srs_repetition = input.srsRepetition;
  if (input.srsEaseFactor !== undefined) {
    patch.srs_ease_factor = easeToColumn(input.srsEaseFactor) ?? null;
  }
  if (input.srsNextReview !== undefined) patch.srs_next_review = input.srsNextReview;

  try {
    const dto = await db.transaction().execute(async (trx) => {
      const hasFieldUpdate = Object.keys(patch).length > 0;
      const updatedRow = hasFieldUpdate
        ? await vocabRepo.update(ownerId(), id, patch, trx)
        : existing;
      if (!updatedRow) throw new NotFoundError(`Vocabulary "${id}" not found`);

      if (input.folderIds !== undefined) {
        await vocabFoldersRepo.replaceLinks(id, input.folderIds, trx);
      }
      const linked = await vocabFoldersRepo.listFolderIds(id, trx);
      return vocabularyRowToDto(updatedRow, linked);
    });
    return dto;
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      throw new DuplicateError(
        'A vocabulary with the same word and reading already exists',
      );
    }
    throw err;
  }
}

export async function deleteVocabulary(id: string): Promise<VocabularyDto> {
  const deleted = await vocabRepo.softDelete(ownerId(), id);
  if (!deleted) throw new NotFoundError(`Vocabulary "${id}" not found`);
  const folderIds = await vocabFoldersRepo.listFolderIds(deleted.id);
  return vocabularyRowToDto(deleted, folderIds);
}
