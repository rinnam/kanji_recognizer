import { describe, expect, it } from 'vitest';
import type { LocalVocabulary } from '../../src/entities/vocabulary';
import { gradeAnswer, normalizeAnswer } from '../../src/features/quiz/model/grade';
import { buildQuestions } from '../../src/features/quiz/model/questions';
import {
  gradeSession,
  toCreateSessionInput,
} from '../../src/features/quiz/model/session';

function vocab(partial: Partial<LocalVocabulary> & { id: string }): LocalVocabulary {
  return {
    id: partial.id,
    word: partial.word ?? partial.id,
    meaning: partial.meaning ?? 'nghĩa',
    reading: partial.reading ?? null,
    sinoVietnamese: partial.sinoVietnamese ?? null,
    example: partial.example ?? null,
    exampleMeaning: partial.exampleMeaning ?? null,
    note: partial.note ?? null,
    tags: partial.tags ?? [],
    jlptLevel: partial.jlptLevel ?? null,
    srsInterval: partial.srsInterval ?? null,
    srsRepetition: partial.srsRepetition ?? null,
    srsEaseFactor: partial.srsEaseFactor ?? null,
    srsNextReview: partial.srsNextReview ?? null,
    folderIds: partial.folderIds ?? [],
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-01-01T00:00:00.000Z',
    deletedAt: partial.deletedAt ?? null,
  };
}

describe('quiz/grade normalizeAnswer', () => {
  it('trim + gộp khoảng trắng + hạ chữ thường (mirror BE)', () => {
    expect(normalizeAnswer('  Hello   World ')).toBe('hello world');
    expect(normalizeAnswer('MIZU')).toBe('mizu');
  });
});

describe('quiz/grade gradeAnswer', () => {
  it('khớp 1 trong các đáp án, bỏ qua hoa/thường + khoảng trắng', () => {
    expect(gradeAnswer('みず', ['水', 'みず'])).toBe(true);
    expect(gradeAnswer('  Mizu  ', ['mizu'])).toBe(true);
  });

  it('rỗng/null/sai → false', () => {
    expect(gradeAnswer('', ['水'])).toBe(false);
    expect(gradeAnswer(null, ['水'])).toBe(false);
    expect(gradeAnswer('ひ', ['水', 'みず'])).toBe(false);
  });
});

describe('quiz/questions buildQuestions', () => {
  const list = [
    vocab({ id: 'a', word: '水', reading: 'みず', meaning: 'nước' }),
    vocab({ id: 'b', word: '火', reading: null, meaning: 'lửa' }),
    vocab({ id: 'c', word: '木', meaning: 'cây', deletedAt: '2026-02-01T00:00:00.000Z' }),
  ];

  it('viToJa: prompt = nghĩa, đáp án = [word, reading]; bỏ tombstone', () => {
    const qs = buildQuestions(list, 'viToJa');
    expect(qs.map((q) => q.vocabularyId)).toEqual(['a', 'b']);
    expect(qs[0]).toEqual({
      vocabularyId: 'a',
      prompt: 'nước',
      acceptedAnswers: ['水', 'みず'],
    });
    expect(qs[1].acceptedAnswers).toEqual(['火']); // reading null → chỉ word
  });

  it('jaToVi: prompt = từ (+（đọc）), đáp án = [nghĩa]', () => {
    const qs = buildQuestions(list, 'jaToVi');
    expect(qs[0]).toEqual({
      vocabularyId: 'a',
      prompt: '水（みず）',
      acceptedAnswers: ['nước'],
    });
    expect(qs[1].prompt).toBe('火');
  });

  it('limit cắt số câu', () => {
    expect(buildQuestions(list, 'viToJa', 1)).toHaveLength(1);
  });
});

describe('quiz/session gradeSession + toCreateSessionInput', () => {
  const questions = buildQuestions(
    [
      vocab({ id: 'a', word: '水', reading: 'みず', meaning: 'nước' }),
      vocab({ id: 'b', word: '火', meaning: 'lửa' }),
    ],
    'viToJa',
  );

  it('chấm cục bộ: canh theo index, rỗng = sai', () => {
    const result = gradeSession(questions, ['みず', '']);
    expect(result.score).toBe(1);
    expect(result.total).toBe(2);
    expect(result.items[0].isCorrect).toBe(true);
    expect(result.items[1].isCorrect).toBe(false);
    expect(result.items[1].userAnswer).toBeNull();
  });

  it('toCreateSessionInput dựng attempts khớp schema BE', () => {
    const result = gradeSession(questions, ['水', 'lửa']);
    const input = toCreateSessionInput(result, {
      mode: 'typing',
      startedAt: '2026-03-01T00:00:00.000Z',
      finishedAt: '2026-03-01T00:05:00.000Z',
    });
    expect(input.mode).toBe('typing');
    expect(input.attempts).toHaveLength(2);
    expect(input.attempts[0]).toEqual({
      vocabularyId: 'a',
      prompt: 'nước',
      userAnswer: '水',
      acceptedAnswers: ['水', 'みず'],
    });
  });
});
