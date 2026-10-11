import type { LocalVocabulary } from '../../../entities/vocabulary';
import type { AttemptOutcome } from './attempt';
import type { QuizType } from './types';

/** Dữ liệu từ cần cho phản hồi (THUẦN — UI tự render chip/dòng từ đây). */
export type FeedbackVocab = Pick<
  LocalVocabulary,
  'word' | 'reading' | 'meaning' | 'sinoVietnamese' | 'example' | 'exampleMeaning'
>;

/** Một chip đáp án: nhãn + giá trị. */
export interface FeedbackChip {
  label: string;
  value: string;
}

/** Nội dung phản hồi sau khi chốt một câu — THUẦN, chưa gắn UI. */
export interface FeedbackContent {
  isCorrect: boolean;
  /** Chữ người dùng gõ cuối (null nếu chưa gõ). */
  userAnswer: string | null;
  /** LUÔN có: nghĩa tiếng Việt. */
  meaning: string;
  /** Chip đáp án theo dạng câu (Cách đọc / Từ / Hán Việt). */
  chips: FeedbackChip[];
  /** Câu ví dụ (null nếu không có). */
  example: string | null;
  /** Bản dịch câu ví dụ (null nếu không có ví dụ hoặc không có bản dịch). */
  exampleMeaning: string | null;
}

function hasText(value: string | null | undefined): value is string {
  if (value === null || value === undefined) return false;
  const text = value.trim();
  // Coi placeholder gạch ngang như rỗng (không hiện chip 'Hán Việt: —').
  return text !== '' && text !== '—' && text !== '-' && text !== '–';
}

/**
 * Dựng nội dung phản hồi — THUẦN, tất định.
 * - LUÔN có dòng NGHĨA tiếng Việt.
 * - Dạng 1 (reading, đề là CHỮ): chip Cách đọc (đáp án) + Hán Việt.
 * - Dạng 2 (meaning, đề là NGHĨA): chip Từ + Cách đọc.
 * - Kèm câu ví dụ + bản dịch nếu có.
 * `showSinoHint` = true (công tắc gợi ý Hán Việt đang bật) -> BỎ chip Hán Việt (tránh lặp).
 */
export function selectFeedbackContent(
  vocab: FeedbackVocab,
  questionType: QuizType,
  outcome: AttemptOutcome,
  showSinoHint = false,
): FeedbackContent {
  const chips: FeedbackChip[] = [];
  if (questionType === 'reading') {
    if (hasText(vocab.reading)) chips.push({ label: 'Cách đọc', value: vocab.reading });
    if (!showSinoHint && hasText(vocab.sinoVietnamese)) {
      chips.push({ label: 'Hán Việt', value: vocab.sinoVietnamese });
    }
  } else {
    if (hasText(vocab.word)) chips.push({ label: 'Từ', value: vocab.word });
    if (hasText(vocab.reading)) chips.push({ label: 'Cách đọc', value: vocab.reading });
  }

  const example = hasText(vocab.example) ? vocab.example : null;
  const exampleMeaning =
    example !== null && hasText(vocab.exampleMeaning) ? vocab.exampleMeaning : null;

  return {
    isCorrect: outcome.isCorrect,
    userAnswer: outcome.userAnswer,
    meaning: vocab.meaning,
    chips,
    example,
    exampleMeaning,
  };
}
