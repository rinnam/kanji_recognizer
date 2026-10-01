import type { FolderRow, JlptLevel, VocabularyRow } from '../types/database.js';

/**
 * Map snake_case (DB) ↔ camelCase (API/client) theo docs/database/schema.md.
 * Timestamps trả ra client dưới dạng chuỗi ISO.
 */

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export interface FolderDto {
  id: string;
  name: string;
  parentId: string | null;
  order: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function folderRowToDto(row: FolderRow): FolderDto {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    order: row.sort_order,
    createdAt: toIso(row.created_at) as string,
    updatedAt: toIso(row.updated_at) as string,
    deletedAt: toIso(row.deleted_at),
  };
}

export interface VocabularyDto {
  id: string;
  word: string;
  meaning: string;
  reading: string | null;
  sinoVietnamese: string | null;
  example: string | null;
  exampleMeaning: string | null;
  note: string | null;
  tags: string[];
  jlptLevel: JlptLevel | null;
  srsInterval: number | null;
  srsRepetition: number | null;
  srsEaseFactor: number | null;
  srsNextReview: string | null;
  folderIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function vocabularyRowToDto(
  row: VocabularyRow,
  folderIds: string[],
): VocabularyDto {
  return {
    id: row.id,
    word: row.word,
    meaning: row.meaning,
    reading: row.reading,
    sinoVietnamese: row.sino_vietnamese,
    example: row.example,
    exampleMeaning: row.example_meaning,
    note: row.note,
    tags: row.tags,
    jlptLevel: row.jlpt_level,
    srsInterval: row.srs_interval,
    srsRepetition: row.srs_repetition,
    srsEaseFactor: row.srs_ease_factor === null ? null : Number(row.srs_ease_factor),
    srsNextReview: toIso(row.srs_next_review),
    folderIds,
    createdAt: toIso(row.created_at) as string,
    updatedAt: toIso(row.updated_at) as string,
    deletedAt: toIso(row.deleted_at),
  };
}
