import type { LocalVocabulary } from '../../../entities/vocabulary';
import type { QuizQuestion } from './types';

/** 3 chế độ chọn loại câu: Ngẫu nhiên / Dạng 1 (cách đọc) / Dạng 2 (dịch Nhật). */
export type QuizMode = 'random' | 'reading' | 'meaning';

function hasText(value: string | null): value is string {
  return value !== null && value.trim() !== '';
}

/** Dạng 1: nhìn chữ (word) → nhập cách đọc (reading). */
function readingQuestion(
  id: string,
  word: string,
  reading: string,
  createdAt: string,
): QuizQuestion {
  return { vocabularyId: id, type: 'reading', prompt: word, acceptedAnswers: [reading], createdAt };
}

/** Dạng 2: nhìn nghĩa → dịch sang tiếng Nhật (chấp nhận word hoặc reading). */
function meaningQuestion(vocab: LocalVocabulary): QuizQuestion {
  const answers = [vocab.word];
  if (hasText(vocab.reading)) answers.push(vocab.reading);
  return {
    vocabularyId: vocab.id,
    type: 'meaning',
    prompt: vocab.meaning,
    acceptedAnswers: [...new Set(answers)],
    createdAt: vocab.createdAt,
  };
}

/**
 * Sinh câu hỏi từ danh sách từ — THUẦN, giữ thứ tự đầu vào. Bỏ tombstone + thiếu word/meaning.
 * - 'reading' (Dạng 1): CHỈ từ có cách đọc (từ không có reading bị loại).
 * - 'meaning' (Dạng 2): mọi từ.
 * - 'random': mỗi từ bốc ngẫu nhiên 1 trong 2 dạng; từ KHÔNG có cách đọc → luôn Dạng 2.
 * `pickReading` chỉ dùng cho 'random' (để test tất định); mặc định Math.random.
 */
export function buildQuestions(
  vocabs: readonly LocalVocabulary[],
  mode: QuizMode,
  pickReading: (vocab: LocalVocabulary) => boolean = () => Math.random() < 0.5,
): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const vocab of vocabs) {
    if (vocab.deletedAt !== null) continue;
    if (!hasText(vocab.word) || !hasText(vocab.meaning)) continue;

    if (mode === 'reading') {
      if (hasText(vocab.reading)) out.push(readingQuestion(vocab.id, vocab.word, vocab.reading, vocab.createdAt));
    } else if (mode === 'meaning') {
      out.push(meaningQuestion(vocab));
    } else if (hasText(vocab.reading) && pickReading(vocab)) {
      out.push(readingQuestion(vocab.id, vocab.word, vocab.reading, vocab.createdAt));
    } else {
      out.push(meaningQuestion(vocab));
    }
  }
  return out;
}
