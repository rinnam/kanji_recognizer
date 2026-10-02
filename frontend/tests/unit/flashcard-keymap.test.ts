import { describe, expect, it } from 'vitest';
import {
  decideFlashcardAction,
  type FlashcardKeyContext,
} from '../../src/features/flashcard/model/keymap';

function ctx(partial: Partial<FlashcardKeyContext>): FlashcardKeyContext {
  return {
    key: partial.key ?? ' ',
    mode: partial.mode ?? 'normal',
    revealed: partial.revealed ?? false,
    index: partial.index ?? 0,
    total: partial.total ?? 5,
    hasModifier: partial.hasModifier ?? false,
    typing: partial.typing ?? false,
  };
}

describe('flashcard/keymap decideFlashcardAction', () => {
  it('Space ở mặt trước → lật (mọi chế độ)', () => {
    expect(decideFlashcardAction(ctx({ key: ' ', revealed: false }))).toEqual({ type: 'flip' });
    expect(
      decideFlashcardAction(ctx({ key: ' ', revealed: false, mode: 'anki' })),
    ).toEqual({ type: 'flip' });
  });

  it('Space ở mặt sau, Normal/Progress → qua thẻ tiếp', () => {
    expect(
      decideFlashcardAction(ctx({ key: ' ', revealed: true, mode: 'normal', index: 1, total: 5 })),
    ).toEqual({ type: 'next' });
    expect(
      decideFlashcardAction(ctx({ key: ' ', revealed: true, mode: 'progress', index: 1, total: 5 })),
    ).toEqual({ type: 'next' });
  });

  it('Space ở mặt sau, Anki → chỉ lật (KHÔNG qua thẻ)', () => {
    expect(
      decideFlashcardAction(ctx({ key: ' ', revealed: true, mode: 'anki' })),
    ).toEqual({ type: 'flip' });
  });

  it('Space ở mặt sau Normal nhưng là thẻ cuối → none', () => {
    expect(
      decideFlashcardAction(ctx({ key: ' ', revealed: true, mode: 'normal', index: 4, total: 5 })),
    ).toEqual({ type: 'none' });
  });

  it('đang gõ trong ô nhập → none (kể cả Space)', () => {
    expect(decideFlashcardAction(ctx({ key: ' ', revealed: false, typing: true }))).toEqual({
      type: 'none',
    });
  });

  it('giữ Ctrl/Alt/Meta → none', () => {
    expect(decideFlashcardAction(ctx({ key: 'ArrowRight', hasModifier: true }))).toEqual({
      type: 'none',
    });
  });

  it('ArrowRight/ArrowLeft điều hướng, chặn ở biên', () => {
    expect(decideFlashcardAction(ctx({ key: 'ArrowRight', index: 1, total: 5 }))).toEqual({
      type: 'next',
    });
    expect(decideFlashcardAction(ctx({ key: 'ArrowRight', index: 4, total: 5 }))).toEqual({
      type: 'none',
    });
    expect(decideFlashcardAction(ctx({ key: 'ArrowLeft', index: 2 }))).toEqual({ type: 'prev' });
    expect(decideFlashcardAction(ctx({ key: 'ArrowLeft', index: 0 }))).toEqual({ type: 'none' });
  });

  it('1/2/3/4 chấm điểm chỉ khi Anki + đã lật', () => {
    expect(
      decideFlashcardAction(ctx({ key: '1', mode: 'anki', revealed: true })),
    ).toEqual({ type: 'grade', rating: 'again' });
    expect(
      decideFlashcardAction(ctx({ key: '4', mode: 'anki', revealed: true })),
    ).toEqual({ type: 'grade', rating: 'easy' });
    // chưa lật → none
    expect(
      decideFlashcardAction(ctx({ key: '2', mode: 'anki', revealed: false })),
    ).toEqual({ type: 'none' });
    // không phải Anki → none
    expect(
      decideFlashcardAction(ctx({ key: '3', mode: 'normal', revealed: true })),
    ).toEqual({ type: 'none' });
  });
});
