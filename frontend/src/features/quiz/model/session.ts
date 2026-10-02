import type { CreateQuizSessionInput, QuizAttemptInput } from '../../../shared/api';
import { gradeAnswer } from './grade';
import type { GradedQuizItem, QuizQuestion, QuizResult } from './types';

/**
 * Chấm cả phiên cục bộ — THUẦN. `answers` canh theo index của `questions`
 * (phần tử null/rỗng = chưa trả lời → sai). Mirror cách chấm của BE (gradeAnswer).
 */
export function gradeSession(
  questions: readonly QuizQuestion[],
  answers: readonly (string | null)[],
): QuizResult {
  const items: GradedQuizItem[] = questions.map((question, i) => {
    const raw = answers[i] ?? null;
    const userAnswer = raw !== null && raw.trim() !== '' ? raw : null;
    return {
      vocabularyId: question.vocabularyId,
      prompt: question.prompt,
      userAnswer,
      acceptedAnswers: question.acceptedAnswers,
      isCorrect: gradeAnswer(userAnswer, question.acceptedAnswers),
    };
  });
  const score = items.filter((item) => item.isCorrect).length;
  return { score, total: items.length, items };
}

/**
 * Dựng payload POST /quiz/sessions từ kết quả đã chấm — THUẦN.
 * attempts khớp validators/quiz.ts của BE (vocabularyId, prompt, userAnswer, acceptedAnswers).
 * BE sẽ tự chấm lại; vì cùng công thức nên điểm server == điểm cục bộ.
 */
export function toCreateSessionInput(
  result: QuizResult,
  meta: { mode?: string; startedAt?: string; finishedAt?: string },
): CreateQuizSessionInput {
  const attempts: QuizAttemptInput[] = result.items.map((item) => ({
    vocabularyId: item.vocabularyId,
    prompt: item.prompt,
    userAnswer: item.userAnswer,
    acceptedAnswers: item.acceptedAnswers,
  }));
  return {
    mode: meta.mode,
    startedAt: meta.startedAt,
    finishedAt: meta.finishedAt,
    attempts,
  };
}
