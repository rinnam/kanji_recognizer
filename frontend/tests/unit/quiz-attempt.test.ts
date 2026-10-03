import { describe, expect, it } from 'vitest';
import {
  applyAnswer,
  applyHint,
  initialAttemptState,
  MAX_ATTEMPTS,
  remainingAttempts,
  toOutcome,
} from '../../src/features/quiz/model/attempt';
import { selectFeedbackContent, type FeedbackVocab } from '../../src/features/quiz/model/feedback';

function vocab(partial: Partial<FeedbackVocab>): FeedbackVocab {
  return {
    word: partial.word ?? '水',
    reading: partial.reading ?? 'みず',
    meaning: partial.meaning ?? 'nước',
    sinoVietnamese: partial.sinoVietnamese ?? 'THỦY',
    example: partial.example ?? null,
    exampleMeaning: partial.exampleMeaning ?? null,
  };
}

describe('quiz/attempt applyAnswer (tối đa 3 lần)', () => {
  it('MAX_ATTEMPTS = 3', () => {
    expect(MAX_ATTEMPTS).toBe(3);
  });

  it('sai → sai → đúng: đúng ở lần 3', () => {
    let s = initialAttemptState();
    s = applyAnswer(s, false, 'a');
    expect(s.status).toBe('answering');
    expect(remainingAttempts(s)).toBe(2);
    s = applyAnswer(s, false, 'b');
    expect(s.status).toBe('answering');
    expect(remainingAttempts(s)).toBe(1);
    s = applyAnswer(s, true, 'みず');
    expect(s.status).toBe('correct');
    expect(s.attempts).toBe(3);
    expect(toOutcome(s)).toEqual({ isCorrect: true, userAnswer: 'みず', attemptNo: 3 });
  });

  it('sai → sai → sai: lộ đáp án (revealed) và sai', () => {
    let s = initialAttemptState();
    s = applyAnswer(s, false, 'a');
    s = applyAnswer(s, false, 'b');
    s = applyAnswer(s, false, 'c');
    expect(s.status).toBe('revealed');
    expect(remainingAttempts(s)).toBe(0);
    expect(toOutcome(s)).toEqual({ isCorrect: false, userAnswer: 'c', attemptNo: 3 });
  });

  it('gợi ý → revealed + usedHint; userAnswer null nếu chưa gõ', () => {
    const s = applyHint(initialAttemptState());
    expect(s.status).toBe('revealed');
    expect(s.usedHint).toBe(true);
    expect(toOutcome(s)).toEqual({ isCorrect: false, userAnswer: null, attemptNo: 0 });
  });

  it('sau khi chốt (correct/revealed) là bất biến', () => {
    const correct = applyAnswer(initialAttemptState(), true, 'x');
    expect(applyAnswer(correct, false, 'y')).toBe(correct);
    const revealed = applyHint(initialAttemptState());
    expect(applyAnswer(revealed, true, 'z')).toBe(revealed);
  });
});

describe('quiz/feedback selectFeedbackContent', () => {
  it('LUÔN có nghĩa; Dạng 1 (đúng): chip Cách đọc + Hán Việt', () => {
    const out = toOutcome(applyAnswer(initialAttemptState(), true, 'みず'));
    const fb = selectFeedbackContent(vocab({}), 'reading', out);
    expect(fb.isCorrect).toBe(true);
    expect(fb.meaning).toBe('nước');
    expect(fb.chips).toEqual([
      { label: 'Cách đọc', value: 'みず' },
      { label: 'Hán Việt', value: 'THỦY' },
    ]);
  });

  it('Dạng 1 + showSinoHint: BỎ chip Hán Việt (tránh lặp)', () => {
    const out = toOutcome(applyHint(initialAttemptState()));
    const fb = selectFeedbackContent(vocab({}), 'reading', out, true);
    expect(fb.isCorrect).toBe(false);
    expect(fb.chips).toEqual([{ label: 'Cách đọc', value: 'みず' }]);
  });

  it('Dạng 2 (sai): chip Từ + Cách đọc; không bị ảnh hưởng bởi showSinoHint', () => {
    const out = toOutcome(applyAnswer(initialAttemptState(), false, 'x'));
    const fb = selectFeedbackContent(vocab({}), 'meaning', out);
    expect(fb.chips).toEqual([
      { label: 'Từ', value: '水' },
      { label: 'Cách đọc', value: 'みず' },
    ]);
    expect(selectFeedbackContent(vocab({}), 'meaning', out, true).chips).toEqual(fb.chips);
  });

  it('ví dụ: có → kèm ví dụ + dịch; không có → null', () => {
    const out = toOutcome(applyAnswer(initialAttemptState(), true, 'みず'));
    const withEx = selectFeedbackContent(
      vocab({ example: '水を飲む', exampleMeaning: 'Uống nước' }),
      'reading',
      out,
    );
    expect(withEx.example).toBe('水を飲む');
    expect(withEx.exampleMeaning).toBe('Uống nước');
    const noEx = selectFeedbackContent(vocab({}), 'reading', out);
    expect(noEx.example).toBeNull();
    expect(noEx.exampleMeaning).toBeNull();
  });
});
