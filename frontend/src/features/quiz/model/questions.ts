import type { LocalVocabulary } from '../../../entities/vocabulary';
import type { QuizDirection, QuizQuestion } from './types';

function isLiving(vocab: LocalVocabulary): boolean {
  return vocab.deletedAt === null;
}

function hasText(value: string | null): value is string {
  return value !== null && value.trim() !== '';
}

/** Đáp án tiếng Nhật chấp nhận = word (+ reading nếu có), loại trùng. */
function japaneseAnswers(vocab: LocalVocabulary): string[] {
  const answers = [vocab.word];
  if (hasText(vocab.reading)) answers.push(vocab.reading);
  return [...new Set(answers)];
}

/**
 * Sinh câu hỏi từ danh sách từ vựng — THUẦN, tất định (GIỮ thứ tự đầu vào).
 * - viToJa: prompt = Nghĩa; đáp án = [word, reading].
 * - jaToVi: prompt = Từ (+（Cách đọc）); đáp án = [Nghĩa].
 * Bỏ thẻ tombstone và thẻ thiếu word/meaning. `limit` (nếu có) cắt bớt số câu.
 */
export function buildQuestions(
  vocabs: readonly LocalVocabulary[],
  direction: QuizDirection,
  limit?: number,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  for (const vocab of vocabs) {
    if (!isLiving(vocab)) continue;
    if (!hasText(vocab.word) || !hasText(vocab.meaning)) continue;

    if (direction === 'viToJa') {
      questions.push({
        vocabularyId: vocab.id,
        prompt: vocab.meaning,
        acceptedAnswers: japaneseAnswers(vocab),
      });
    } else {
      const prompt = hasText(vocab.reading)
        ? `${vocab.word}（${vocab.reading}）`
        : vocab.word;
      questions.push({
        vocabularyId: vocab.id,
        prompt,
        acceptedAnswers: [vocab.meaning],
      });
    }
  }
  return limit !== undefined && limit >= 0 ? questions.slice(0, limit) : questions;
}
