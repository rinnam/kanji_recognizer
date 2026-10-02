import { useEffect, useRef } from 'react';
import type { SrsRating } from '../../../entities/card';
import { decideFlashcardAction } from './keymap';
import type { FlashcardMode } from './types';

export interface FlashcardKeyHandlers {
  mode: FlashcardMode;
  revealed: boolean;
  index: number;
  total: number;
  onFlip: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGrade: (rating: SrsRating) => void;
}

/** Phím cần chặn mặc định (Space cuộn trang, mũi tên cuộn). */
const PREVENT_KEYS = new Set([' ', 'Spacebar', 'ArrowLeft', 'ArrowRight']);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

function isModalOpen(): boolean {
  return document.querySelector('.kn-ui-modal__backdrop') !== null;
}

/**
 * Gắn phím tắt flashcard ở cấp document. Đọc trạng thái mới nhất qua ref nên
 * listener chỉ gắn/gỡ MỘT lần (không re-attach khi đổi chế độ/thẻ → không gọi 2 lần).
 */
export function useFlashcardKeys(handlers: FlashcardKeyHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const current = ref.current;
      // Nếu đang focus một <button>, để Space kích hoạt nút đó (tránh double với lật thẻ).
      if (
        (event.key === ' ' || event.key === 'Spacebar') &&
        document.activeElement instanceof HTMLElement &&
        document.activeElement.tagName === 'BUTTON'
      ) {
        return;
      }
      const action = decideFlashcardAction({
        key: event.key,
        mode: current.mode,
        revealed: current.revealed,
        index: current.index,
        total: current.total,
        hasModifier: event.ctrlKey || event.altKey || event.metaKey,
        typing: isTypingTarget(event.target) || isModalOpen(),
      });
      if (action.type === 'none') return;
      if (PREVENT_KEYS.has(event.key)) event.preventDefault();
      if (action.type === 'flip') current.onFlip();
      else if (action.type === 'next') current.onNext();
      else if (action.type === 'prev') current.onPrev();
      else current.onGrade(action.rating);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
