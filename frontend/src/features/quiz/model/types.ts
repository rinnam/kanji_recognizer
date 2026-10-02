/**
 * Loại câu hỏi typing quiz:
 * - reading (Dạng 1): nhìn CHỮ (word), nhập CÁCH ĐỌC (reading).
 * - meaning (Dạng 2): nhìn NGHĨA, dịch sang tiếng Nhật (word hoặc reading).
 */
export type QuizType = 'reading' | 'meaning';

/** Một câu hỏi sinh từ một từ vựng local. */
export interface QuizQuestion {
  vocabularyId: string;
  type: QuizType;
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
