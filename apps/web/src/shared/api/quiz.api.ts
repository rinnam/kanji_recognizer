import type { QuizSessionDto } from './dto';
import type { CreateQuizSessionInput } from '@kanji-nest/core';
import { request } from './http';

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
