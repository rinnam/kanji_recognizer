import type { SrsRating } from '../../../entities/card';
import type { FlashcardMode } from './types';

/** Hành động suy ra từ một phím (THUẦN — để component thực thi). */
export type FlashcardAction =
  | { type: 'flip' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'grade'; rating: SrsRating }
  | { type: 'none' };

export interface FlashcardKeyContext {
  key: string; // event.key
  mode: FlashcardMode;
  revealed: boolean;
  index: number;
  total: number;
  hasModifier: boolean; // Ctrl/Alt/Meta đang giữ
  typing: boolean; // con trỏ ở input/textarea/select hoặc có modal mở
}

const NONE: FlashcardAction = { type: 'none' };

const NUMBER_TO_RATING: Record<string, SrsRating> = {
  '1': 'again',
  '2': 'hard',
  '3': 'good',
  '4': 'easy',
};

function isSpace(key: string): boolean {
  return key === ' ' || key === 'Spacebar';
}

/**
 * Quyết định hành động flashcard từ một phím — THUẦN, tất định (không DOM/DB).
 *
 * Quy tắc (brief phím tắt):
 * - Bỏ qua khi đang gõ (`typing`) hoặc giữ Ctrl/Alt/Meta → `none`.
 * - Space: mặt trước → lật. Mặt sau: Normal/Progress → qua thẻ (nếu chưa cuối);
 *   Anki → chỉ lật lại (KHÔNG qua thẻ, tránh vô tình chấm điểm).
 * - ArrowRight/ArrowLeft → tiếp/trước, chặn ở biên.
 * - 1/2/3/4 → chấm Again/Hard/Good/Easy, CHỈ khi Anki và đã lật.
 */
export function decideFlashcardAction(ctx: FlashcardKeyContext): FlashcardAction {
  if (ctx.typing || ctx.hasModifier) return NONE;

  if (isSpace(ctx.key)) {
    if (!ctx.revealed) return { type: 'flip' };
    if (ctx.mode === 'anki') return { type: 'flip' };
    return ctx.index < ctx.total - 1 ? { type: 'next' } : NONE;
  }

  if (ctx.key === 'ArrowRight') {
    return ctx.index < ctx.total - 1 ? { type: 'next' } : NONE;
  }
  if (ctx.key === 'ArrowLeft') {
    return ctx.index > 0 ? { type: 'prev' } : NONE;
  }

  const rating = NUMBER_TO_RATING[ctx.key];
  if (rating !== undefined && ctx.mode === 'anki' && ctx.revealed) {
    return { type: 'grade', rating };
  }

  return NONE;
}
