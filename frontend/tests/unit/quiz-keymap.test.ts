import { describe, expect, it } from 'vitest';
import { decideQuizKey, type QuizKeyContext } from '../../src/features/quiz/model/keymap';

function ctx(partial: Partial<QuizKeyContext>): QuizKeyContext {
  return {
    key: partial.key ?? 'Enter',
    composing: partial.composing ?? false,
    submitted: partial.submitted ?? false,
    canSubmit: partial.canSubmit ?? true,
  };
}

describe('quiz/keymap decideQuizKey', () => {
  it('IME đang gõ dở (composing) → Enter/Tab KHÔNG nộp/bỏ qua', () => {
    expect(decideQuizKey(ctx({ key: 'Enter', composing: true }))).toBe('none');
    expect(decideQuizKey(ctx({ key: 'Tab', composing: true, submitted: false }))).toBe('none');
  });

  it('Enter: chưa nộp + có nội dung → submit; rỗng → none; đã nộp → advance', () => {
    expect(decideQuizKey(ctx({ key: 'Enter', submitted: false, canSubmit: true }))).toBe('submit');
    expect(decideQuizKey(ctx({ key: 'Enter', submitted: false, canSubmit: false }))).toBe('none');
    expect(decideQuizKey(ctx({ key: 'Enter', submitted: true }))).toBe('advance');
  });

  it('Tab: chưa nộp → gợi ý (hint); đã nộp → none', () => {
    expect(decideQuizKey(ctx({ key: 'Tab', submitted: false }))).toBe('hint');
    expect(decideQuizKey(ctx({ key: 'Tab', submitted: true }))).toBe('none');
  });

  it('phím khác → none', () => {
    expect(decideQuizKey(ctx({ key: 'a' }))).toBe('none');
  });
});
