/**
 * Hướng hỏi của typing quiz:
 * - viToJa: hiện Nghĩa (tiếng Việt), người học gõ tiếng Nhật (word/reading).
 * - jaToVi: hiện Từ (tiếng Nhật), người học gõ Nghĩa.
 */
export type QuizDirection = 'viToJa' | 'jaToVi';

/** Một câu hỏi sinh từ một từ vựng local. */
export interface QuizQuestion {
  vocabularyId: string;
  prompt: string;
  acceptedAnswers: string[];
}

/** Kết quả chấm MỘT câu (dùng cho hiển thị + dựng attempt gửi BE). */
export interface GradedQuizItem {
  vocabularyId: string;
  prompt: string;
  userAnswer: string | null;
  acceptedAnswers: string[];
  isCorrect: boolean;
}

/** Kết quả chấm cả phiên (cục bộ). */
export interface QuizResult {
  score: number;
  total: number;
  items: GradedQuizItem[];
}
