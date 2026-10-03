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
  /** ISO createdAt của từ nguồn — để sắp "thứ tự thêm" khi TẮT Xáo trộn (Phần 5A). */
  createdAt: string;
}

/** Kết quả chấm MỘT câu (dùng cho hiển thị + dựng attempt gửi BE). */
export interface GradedQuizItem {
  vocabularyId: string;
  prompt: string;
  userAnswer: string | null;
  acceptedAnswers: string[];
  isCorrect: boolean;
  /** Số lần đã nhập để chốt câu (0 nếu chỉ gợi ý mà chưa gõ). Tùy chọn (6B). */
  attemptNo?: number;
  /** Có bấm gợi ý để lộ đáp án không. Tùy chọn (6B). */
  usedHint?: boolean;
}

/** Kết quả chấm cả phiên (cục bộ). */
export interface QuizResult {
  score: number;
  total: number;
  items: GradedQuizItem[];
}
