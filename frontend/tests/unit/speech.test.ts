import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanJapaneseSpeechText,
  findJapaneseVoice,
  isSpeechSupported,
  selectSpeechPrompt,
  speakJapanese,
  speakWebSpeech,
  stopSpeech,
} from '../../src/shared/lib/speech';

describe('speech lib (cleanJapaneseSpeechText & selectSpeechPrompt)', () => {
  it('xử lý chuỗi rỗng hoặc undefined', () => {
    expect(cleanJapaneseSpeechText('')).toBe('');
    expect(cleanJapaneseSpeechText('   ')).toBe('');
  });

  it('giữ nguyên từ vựng đơn lẻ', () => {
    expect(cleanJapaneseSpeechText('重要')).toBe('重要');
    expect(cleanJapaneseSpeechText('じゅうよう')).toBe('じゅうよう');
  });

  it('tách lấy lựa chọn đầu tiên khi có dấu phân cách /', () => {
    expect(cleanJapaneseSpeechText('じゅうよう / おも')).toBe('じゅうよう');
    expect(cleanJapaneseSpeechText('たべる／くらう')).toBe('たべる');
  });

  it('tách lấy lựa chọn đầu tiên khi có dấu phẩy hoặc chấm phẩy', () => {
    expect(cleanJapaneseSpeechText('じゅうよう, おも')).toBe('じゅうよう');
    expect(cleanJapaneseSpeechText('じゅうような、おもな')).toBe('じゅうような');
    expect(cleanJapaneseSpeechText('いく; ゆく')).toBe('いく');
    expect(cleanJapaneseSpeechText('いく；ゆく')).toBe('いく');
  });

  it('cắt bỏ khoảng trắng thừa ở hai đầu', () => {
    expect(cleanJapaneseSpeechText('  ねこ  / いぬ ')).toBe('ねこ');
  });

  it('selectSpeechPrompt ưu tiên chữ Hán (Kanji) để giữ trọng âm pitch accent', () => {
    expect(selectSpeechPrompt('重要な', 'じゅうような')).toBe('重要な');
    expect(selectSpeechPrompt('雨', 'あめ')).toBe('雨');
    // Khi không có word, dùng reading
    expect(selectSpeechPrompt('', 'ねこ')).toBe('ねこ');
    expect(selectSpeechPrompt('   ', 'いぬ')).toBe('いぬ');
  });
});

describe('speech lib (findJapaneseVoice & isSpeechSupported)', () => {
  it('isSpeechSupported trả về boolean an toàn', () => {
    expect(typeof isSpeechSupported()).toBe('boolean');
  });

  it('findJapaneseVoice trả về voice tiếng Nhật ưu tiên', () => {
    const mockVoices = [
      { name: 'Alex', lang: 'en-US' },
      { name: 'Microsoft Ichiro - Japanese', lang: 'ja-JP' },
      { name: 'Microsoft Haruka - Japanese (Japan)', lang: 'ja-JP' },
      { name: 'Google 日本語', lang: 'ja' },
    ] as unknown as SpeechSynthesisVoice[];

    const synth = {
      getVoices: () => mockVoices,
    } as unknown as SpeechSynthesis;

    const chosen = findJapaneseVoice(synth);
    expect(chosen).toBeDefined();
    expect(chosen?.name).toContain('Haruka');
  });

  it('findJapaneseVoice trả về undefined nếu không có voice tiếng Nhật', () => {
    const mockVoices = [
      { name: 'David', lang: 'en-US' },
      { name: 'Zira', lang: 'en-US' },
    ] as unknown as SpeechSynthesisVoice[];

    const synth = {
      getVoices: () => mockVoices,
    } as unknown as SpeechSynthesis;

    expect(findJapaneseVoice(synth)).toBeUndefined();
  });
});

describe('speech lib (speakWebSpeech fallback)', () => {
  let originalSpeechSynthesis: SpeechSynthesis | undefined;
  let originalUtterance: typeof SpeechSynthesisUtterance | undefined;

  beforeEach(() => {
    originalSpeechSynthesis = window.speechSynthesis;
    originalUtterance = window.SpeechSynthesisUtterance;
  });

  afterEach(() => {
    if (originalSpeechSynthesis !== undefined) {
      Object.defineProperty(window, 'speechSynthesis', {
        value: originalSpeechSynthesis,
        configurable: true,
        writable: true,
      });
    }
    if (originalUtterance !== undefined) {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: originalUtterance,
        configurable: true,
        writable: true,
      });
    }
    vi.restoreAllMocks();
  });

  it('bỏ qua khi văn bản rỗng và gọi onEnd ngay', () => {
    const onEnd = vi.fn();
    const cancel = speakWebSpeech('', { onEnd });
    expect(typeof cancel).toBe('function');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('báo lỗi onError khi trình duyệt không hỗ trợ Web Speech', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const onError = vi.fn();
    speakWebSpeech('テスト', { onError });
    expect(onError).toHaveBeenCalledWith('Trình duyệt chưa hỗ trợ phát âm tiếng Nhật.');
  });

  it('gọi synth.speak với utterance cấu hình ja-JP', () => {
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    const mockGetVoices = vi.fn(() => [
      { name: 'Haruka', lang: 'ja-JP' } as unknown as SpeechSynthesisVoice,
    ]);

    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: mockGetVoices,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        speaking: false,
        pending: false,
      },
      configurable: true,
      writable: true,
    });

    class MockUtterance {
      public text: string;
      public lang = '';
      public rate = 1;
      public pitch = 1;
      public volume = 1;
      public voice: SpeechSynthesisVoice | null = null;
      public onstart: (() => void) | null = null;
      public onend: (() => void) | null = null;
      public onerror: ((ev: unknown) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockUtterance,
      configurable: true,
      writable: true,
    });

    const onStart = vi.fn();
    const onEnd = vi.fn();
    const cancel = speakWebSpeech('重要な / じゅうような', {
      rate: 0.9,
      onStart,
      onEnd,
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalledTimes(1);

    const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
    expect(utterance.text).toBe('重要な');
    expect(utterance.lang).toBe('ja-JP');
    expect(utterance.rate).toBe(0.9);

    utterance.onstart?.();
    expect(onStart).toHaveBeenCalled();

    utterance.onend?.();
    expect(onEnd).toHaveBeenCalled();

    cancel();
  });
});

describe('speech lib (speakJapanese Hybrid & Audio)', () => {
  it('phát audio qua Google TTS proxy khi preferNeural=true', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    const mockPause = vi.fn();

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
      pause = mockPause;
    }

    vi.stubGlobal('Audio', MockAudio);

    const onStart = vi.fn();
    const onEnd = vi.fn();
    const cancel = speakJapanese('重要な', {
      preferNeural: true,
      onStart,
      onEnd,
    });

    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(typeof cancel).toBe('function');

    cancel();
    expect(mockPause).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('stopSpeech dừng phát âm thanh', () => {
    const mockCancel = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel: mockCancel,
      },
      configurable: true,
      writable: true,
    });

    stopSpeech();
    expect(mockCancel).toHaveBeenCalled();
  });
});
