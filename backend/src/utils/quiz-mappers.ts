import type { QuizAttemptRow, QuizSessionRow } from '../types/database.js';

/**
 * Map snake_case (DB) → camelCase (API) cho quiz. Timestamps trả ra chuỗi ISO.
 * (Tách khỏi row-mappers.ts vì quiz không nằm trong 2 model local-first.)
 */

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export interface QuizAttemptDto {
  id: string;
  vocabularyId: string | null;
  prompt: string;
  userAnswer: string | null;
  isCorrect: boolean;
  answeredAt: string;
}

export function quizAttemptRowToDto(row: QuizAttemptRow): QuizAttemptDto {
  return {
    id: row.id,
    vocabularyId: row.vocabulary_id,
    prompt: row.prompt,
    userAnswer: row.user_answer,
    isCorrect: row.is_correct,
    answeredAt: toIso(row.answered_at) as string,
  };
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

export function quizSessionRowToDto(
  row: QuizSessionRow,
  attempts: QuizAttemptDto[],
): QuizSessionDto {
  return {
    id: row.id,
    mode: row.mode,
    score: row.score,
    total: row.total,
    startedAt: toIso(row.started_at) as string,
    finishedAt: toIso(row.finished_at),
    createdAt: toIso(row.created_at) as string,
    attempts,
  };
}
