import { describe, expect, it } from 'vitest';
import {
  gradeAnswer,
  missingVocabularyIds,
  normalizeAnswer,
  scoreAttempts,
  type GradeableAttempt,
} from '../../src/services/quiz.service.js';

/**
 * Unit test THUẦN cho chấm điểm quiz. KHÔNG cần DB/mạng, tất định.
 */

describe('normalizeAnswer', () => {
  it('chuẩn hóa NFC + trim + gộp khoảng trắng + hạ chữ thường', () => {
    expect(normalizeAnswer('  Hello   World ')).toBe('hello world');
  });
  it('giữ nguyên ký tự tiếng Nhật', () => {
    expect(normalizeAnswer('みず')).toBe('みず');
  });
});

describe('gradeAnswer', () => {
  it('đúng khi khớp 1 đáp án chấp nhận (bất kể hoa/thường, khoảng trắng thừa)', () => {
    expect(gradeAnswer('Konnichiwa', ['konnichiwa'])).toBe(true);
    expect(gradeAnswer(' water ', ['water', 'みず'])).toBe(true);
    expect(gradeAnswer('みず', ['water', 'みず'])).toBe(true);
  });
  it('sai khi không khớp / rỗng / null / undefined', () => {
    expect(gradeAnswer('nope', ['water'])).toBe(false);
    expect(gradeAnswer('', ['water'])).toBe(false);
    expect(gradeAnswer('   ', ['water'])).toBe(false);
    expect(gradeAnswer(null, ['water'])).toBe(false);
    expect(gradeAnswer(undefined, ['water'])).toBe(false);
  });
});

describe('scoreAttempts', () => {
  it('đếm đúng số câu đúng và tổng số câu, giữ chi tiết từng câu', () => {
    const attempts: GradeableAttempt[] = [
      { prompt: '水', userAnswer: 'みず', acceptedAnswers: ['みず'] },
      { prompt: '火', userAnswer: 'wrong', acceptedAnswers: ['ひ'] },
      { prompt: '木', userAnswer: 'き', acceptedAnswers: ['き'], vocabularyId: 'vocab_1' },
    ];
    const result = scoreAttempts(attempts);
    expect(result.total).toBe(3);
    expect(result.score).toBe(2);
    expect(result.graded.map((item) => item.isCorrect)).toEqual([true, false, true]);
    expect(result.graded[2]?.vocabularyId).toBe('vocab_1');
    expect(result.graded[0]?.vocabularyId).toBeNull();
  });

  it('phiên rỗng → score 0, total 0', () => {
    const result = scoreAttempts([]);
    expect(result.score).toBe(0);
    expect(result.total).toBe(0);
    expect(result.graded).toEqual([]);
  });
});

describe('missingVocabularyIds', () => {
  it('trả về id tham chiếu nhưng không tồn tại (loại trùng, giữ thứ tự, bỏ null/undefined)', () => {
    const missing = missingVocabularyIds(
      [
        { vocabularyId: 'vocab_1' },
        { vocabularyId: 'vocab_x' },
        { vocabularyId: 'vocab_x' },
        {},
        { vocabularyId: null },
      ],
      ['vocab_1'],
    );
    expect(missing).toEqual(['vocab_x']);
  });

  it('rỗng khi mọi tham chiếu đều tồn tại hoặc không có tham chiếu', () => {
    expect(missingVocabularyIds([{}, { vocabularyId: null }], [])).toEqual([]);
    expect(missingVocabularyIds([{ vocabularyId: 'v1' }], ['v1', 'v2'])).toEqual([]);
  });
});
