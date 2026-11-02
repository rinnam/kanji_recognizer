import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SpeakButton } from '../../src/shared/ui';

describe('shared/ui SpeakButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        getVoices: () => [
          { name: 'Haruka', lang: 'ja-JP' } as unknown as SpeechSynthesisVoice,
        ],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });
    class MockUtterance {
      public text: string;
      public lang = '';
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockUtterance,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('render nút với aria-label mặc định hoặc tùy chỉnh', () => {
    render(<SpeakButton text="こんにちは" label="Nghe こんにちは" />);
    const btn = screen.getByRole('button', { name: 'Nghe こんにちは' });
    expect(btn).toBeInTheDocument();
  });

  it('bấm nút gọi phát âm và dừng nổi bọt sự kiện (stopPropagation)', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <SpeakButton text="ねこ" label="Phát âm con mèo" preferNeural={false} />
      </div>,
    );

    const btn = screen.getByRole('button', { name: 'Phát âm con mèo' });
    fireEvent.click(btn);

    // Không kích hoạt sự kiện click của thẻ cha (tránh lật flashcard)
    expect(parentClick).not.toHaveBeenCalled();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('phát âm Google Neural TTS khi có Audio element', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      public src: string;
      public currentTime = 0;
      public volume = 1;
      public onplay: (() => void) | null = null;
      public onended: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      constructor(src: string) {
        this.src = src;
      }
      play = mockPlay;
      pause = vi.fn();
    }
    vi.stubGlobal('Audio', MockAudio);

    render(<SpeakButton text="重要な" label="Phát âm 重要な" preferNeural={true} />);
    const btn = screen.getByRole('button', { name: 'Phát âm 重要な' });
    fireEvent.click(btn);

    expect(mockPlay).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('bị disable khi text rỗng hoặc whitespace', () => {
    render(<SpeakButton text="   " label="Nút rỗng" />);
    const btn = screen.getByRole('button', { name: 'Nút rỗng' });
    expect(btn).toBeDisabled();
  });
});
