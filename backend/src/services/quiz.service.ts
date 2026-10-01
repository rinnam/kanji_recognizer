import { db } from '../config/database.js';
import { env } from '../config/env.js';
import * as quizRepo from '../repositories/quiz.repo.js';
import type { NewQuizAttemptRow } from '../types/database.js';
import { NotFoundError } from '../utils/errors.js';
import {
  quizAttemptRowToDto,
  quizSessionRowToDto,
  type QuizSessionDto,
} from '../utils/quiz-mappers.js';
import type { CreateQuizSessionInput } from '../validators/quiz.js';

const ownerId = (): string => env.LOCAL_OWNER_ID;

// ---------------------------------------------------------------------------
// Chấm điểm (logic THUẦN — không phụ thuộc DB, unit test được).
// ---------------------------------------------------------------------------

/** Một câu cần chấm: so khớp userAnswer với danh sách đáp án chấp nhận. */
export interface GradeableAttempt {
  vocabularyId?: string | null | undefined;
  prompt: string;
  userAnswer?: string | null | undefined;
  acceptedAnswers: string[];
}

export interface GradedAttempt {
  vocabularyId: string | null;
  prompt: string;
  userAnswer: string | null;
  isCorrect: boolean;
}

export interface ScoreResult {
  score: number;
  total: number;
  graded: GradedAttempt[];
}

/** Chuẩn hóa đáp án trước khi so khớp: NFC + trim + gộp khoảng trắng + hạ chữ thường. */
export function normalizeAnswer(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Đúng khi userAnswer (sau chuẩn hóa) khớp 1 trong các đáp án chấp nhận. */
export function gradeAnswer(
  userAnswer: string | null | undefined,
  acceptedAnswers: string[],
): boolean {
  if (userAnswer === null || userAnswer === undefined) return false;
  const normalized = normalizeAnswer(userAnswer);
  if (normalized === '') return false;
  return acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalized);
}

/** Chấm toàn bộ câu trong một phiên → score / total / chi tiết từng câu. */
export function scoreAttempts(attempts: readonly GradeableAttempt[]): ScoreResult {
  const graded: GradedAttempt[] = attempts.map((attempt) => ({
    vocabularyId: attempt.vocabularyId ?? null,
    prompt: attempt.prompt,
    userAnswer: attempt.userAnswer ?? null,
    isCorrect: gradeAnswer(attempt.userAnswer, attempt.acceptedAnswers),
  }));
  const score = graded.filter((item) => item.isCorrect).length;
  return { score, total: graded.length, graded };
}

// ---------------------------------------------------------------------------
// Điều phối (ghi quiz_sessions + quiz_attempts trong một transaction).
// ---------------------------------------------------------------------------

/** Chấm điểm một phiên quiz rồi lưu phiên + từng lần trả lời, trả về kết quả. */
export async function createSession(
  input: CreateQuizSessionInput,
  now: Date = new Date(),
): Promise<QuizSessionDto> {
  const { score, total, graded } = scoreAttempts(input.attempts);

  const result = await db.transaction().execute(async (trx) => {
    const session = await quizRepo.insertSession(
      {
        owner_id: ownerId(),
        mode: input.mode ?? 'typing',
        score,
        total,
        started_at: input.startedAt ?? now,
        finished_at: input.finishedAt ?? now,
      },
      trx,
    );

    const attemptRows: NewQuizAttemptRow[] = graded.map((item) => ({
      session_id: session.id,
      vocabulary_id: item.vocabularyId,
      prompt: item.prompt,
      user_answer: item.userAnswer,
      is_correct: item.isCorrect,
    }));
    const attempts = await quizRepo.insertAttempts(attemptRows, trx);

    return { session, attempts };
  });

  return quizSessionRowToDto(result.session, result.attempts.map(quizAttemptRowToDto));
}

/** Đọc lại một phiên quiz (kèm các lần trả lời). */
export async function getSession(id: string): Promise<QuizSessionDto> {
  const session = await quizRepo.selectSessionById(ownerId(), id);
  if (!session) throw new NotFoundError(`Quiz session "${id}" not found`);
  const attempts = await quizRepo.listAttemptsBySession(session.id);
  return quizSessionRowToDto(session, attempts.map(quizAttemptRowToDto));
}
