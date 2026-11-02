import { useEffect, useRef, useState, type MouseEvent, type ReactElement } from 'react';
import { isSpeechSupported, speakJapanese } from '../lib/speech';
import { IconVolume } from './icons';
import './speak-button.css';

export interface SpeakButtonProps {
  /** Văn bản tiếng Nhật cần phát âm (từ vựng hoặc cách đọc). */
  text: string;
  /** Nhãn hỗ trợ screen-reader/tooltip (mặc định: 'Nghe phát âm'). */
  label?: string;
  /** Kích cỡ: 'sm' cho bảng / dòng phụ, 'md' cho thẻ flashcard lớn. */
  size?: 'sm' | 'md';
  /** Tốc độ phát âm (mặc định 0.85x cho người học). */
  rate?: number;
  /** Ưu tiên giọng Google Neural TTS có pitch accent (mặc định: true). */
  preferNeural?: boolean;
  /** Class CSS bổ sung. */
  className?: string;
  disabled?: boolean;
}

/**
 * Nút nghe phát âm tiếng Nhật dùng chung (Google Neural TTS + Web Speech API fallback).
 * Tự động chọn giọng ja-JP tốt nhất, ngắt âm thanh cũ khi bấm lại.
 * Chặn nổi bọt sự kiện (e.stopPropagation()) để an toàn khi đặt trong Card hoặc Table row.
 */
export function SpeakButton({
  text,
  label = 'Nghe phát âm',
  size = 'md',
  rate,
  preferNeural = true,
  className,
  disabled = false,
}: SpeakButtonProps): ReactElement {
  const [speaking, setSpeaking] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  // Dọn dẹp utterance khi unmount
  useEffect(() => {
    return () => {
      if (cancelRef.current !== null) {
        cancelRef.current();
        cancelRef.current = null;
      }
    };
  }, []);

  const supported = isSpeechSupported() || typeof Audio !== 'undefined';

  const handleClick = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    if (disabled || !text.trim()) return;

    if (cancelRef.current !== null) {
      cancelRef.current();
      cancelRef.current = null;
    }

    const cancel = speakJapanese(text, {
      rate,
      preferNeural,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });

    cancelRef.current = cancel;
  };

  const classes = [
    'kn-speak-btn',
    `kn-speak-btn--${size}`,
    speaking ? 'is-speaking' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const title = !supported
    ? 'Trình duyệt chưa hỗ trợ phát âm trực tiếp'
    : label;

  return (
    <button
      type="button"
      className={classes}
      onClick={handleClick}
      disabled={disabled || !supported || !text.trim()}
      aria-label={label}
      title={title}
    >
      <IconVolume className="kn-speak-btn__icon" />
    </button>
  );
}
