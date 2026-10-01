import { z } from 'zod';

/** Chuỗi ISO datetime có offset (giữ nguyên quy ước với validators khác). */
const isoDateTime = z.string().datetime({ offset: true });

/** Một câu trong phiên quiz: câu hỏi + đáp án người học + các đáp án chấp nhận. */
const quizAttemptSchema = z.object({
  vocabularyId: z.string().min(1).nullable().optional(),
  prompt: z.string().min(1, 'prompt is required'),
  userAnswer: z.string().nullable().optional(),
  acceptedAnswers: z
    .array(z.string().min(1))
    .min(1, 'at least one accepted answer is required'),
});

/** Body tạo phiên quiz (chấm điểm + lưu). */
export const createQuizSessionSchema = z.object({
  mode: z.string().min(1).optional(),
  startedAt: isoDateTime.optional(),
  finishedAt: isoDateTime.optional(),
  attempts: z.array(quizAttemptSchema).min(1, 'at least one attempt is required'),
});

export const quizSessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type QuizAttemptInput = z.infer<typeof quizAttemptSchema>;
export type CreateQuizSessionInput = z.infer<typeof createQuizSessionSchema>;
