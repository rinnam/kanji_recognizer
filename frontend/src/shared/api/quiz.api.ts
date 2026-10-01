import type { QuizSessionDto } from './dto';
import { request } from './http';

/** Một câu trong phiên quiz (khớp validators/quiz.ts của BE). */
export interface QuizAttemptInput {
  vocabularyId?: string | null;
  prompt: string;
  userAnswer?: string | null;
  acceptedAnswers: string[];
}

export interface CreateQuizSessionInput {
  mode?: string;
  startedAt?: string;
  finishedAt?: string;
  attempts: QuizAttemptInput[];
}

/**
 * Chấm điểm + lưu phiên quiz (POST /quiz/sessions). Lưu ý: vocabularyId không tồn tại
 * → BE trả 400 (ApiError), không còn 500 (xem fix BE-1).
 */
export function createQuizSession(input: CreateQuizSessionInput): Promise<QuizSessionDto> {
  return request<QuizSessionDto>('/quiz/sessions', { method: 'POST', body: input });
}

export function getQuizSession(id: string): Promise<QuizSessionDto> {
  return request<QuizSessionDto>(`/quiz/sessions/${encodeURIComponent(id)}`);
}
