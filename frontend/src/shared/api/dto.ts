/**
 * Kiểu DTO vận chuyển (transport) — khớp NGUYÊN VĂN mapper của backend
 * (backend/src/utils/row-mappers.ts & quiz-mappers.ts): camelCase, timestamp ISO,
 * KHÔNG có owner_id (server-only). Entities alias Local* = *Dto (map 1-1 với DB).
 */
export type JlptLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

/** 4 nút đánh giá SM-2 (ánh xạ q: Again=0, Hard=3, Good=4, Easy=5). */
export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

export interface FolderDto {
  id: string;
  name: string;
  parentId: string | null;
  order: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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

export interface QuizAttemptDto {
  id: string;
  vocabularyId: string | null;
  prompt: string;
  userAnswer: string | null;
  isCorrect: boolean;
  answeredAt: string;
}

export interface QuizSessionDto {
  id: string;
  mode: string;
  score: number;
  total: number;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  attempts: QuizAttemptDto[];
}

export interface SyncCounts {
  applied: number;
  skipped: number;
}

export interface PullResult {
  serverTime: string;
  folders: FolderDto[];
  vocabularies: VocabularyDto[];
}

export interface PushResult {
  serverTime: string;
  folders: SyncCounts;
  vocabularies: SyncCounts;
}
