/**
 * Tiện ích phát âm tiếng Nhật thông minh (Hybrid Neural TTS + Web Speech API fallback).
 *
 * 1. Tầng ưu tiên cao nhất: Google Translate Neural TTS qua proxy backend (/api/tts).
 *    - Đọc chuẩn ngữ điệu người thật, chuẩn trọng âm cao-thấp Tokyo (Pitch Accent).
 *    - Tự động cache âm thanh trong bộ nhớ client để phát lại tức thì 0ms.
 * 2. Tầng dự phòng (Fallback): Web Speech API cục bộ của thiết bị khi offline hoặc mất mạng.
 */

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  /** Ưu tiên giọng Google Neural TTS có pitch accent (mặc định: true). */
  preferNeural?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/** Tách lấy phần đọc đầu tiên, loại bỏ các ký tự phân cách lựa chọn (/ , ; 、). */
export function cleanJapaneseSpeechText(raw: string): string {
  if (!raw) return '';
  const firstSegment = raw.split(/[/／;；、,\n]/)[0] ?? '';
  return firstSegment.trim();
}

/**
 * Chọn chuỗi tối ưu để đưa vào bộ phát âm:
 * Ưu tiên chữ Hán (Kanji) để engine NLP nhận diện đúng từ loại và tra từ điển
 * trọng âm Tokyo (Pitch Accent).
 */
export function selectSpeechPrompt(word: string, reading?: string | null): string {
  const cleanWord = cleanJapaneseSpeechText(word);
  if (cleanWord) return cleanWord;
  return cleanJapaneseSpeechText(reading ?? '');
}

/** Kiểm tra thiết bị và trình duyệt có hỗ trợ Web Speech API không. */
export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );
}

/** Tìm giọng tiếng Nhật tốt nhất trong danh sách voice của hệ thống. */
export function findJapaneseVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices();
  const jaVoices = voices.filter((v) => {
    const lang = v.lang.toLowerCase();
    return lang.startsWith('ja') || lang.includes('jp');
  });

  if (jaVoices.length === 0) return undefined;

  const preferred = jaVoices.find((v) => {
    const name = v.name.toLowerCase();
    return (
      name.includes('natural') ||
      name.includes('haruka') ||
      name.includes('kyoko') ||
      name.includes('google')
    );
  });

  return preferred ?? jaVoices[0];
}

/** Tham chiếu âm thanh đang phát để ngắt kịp thời. */
let activeAudio: HTMLAudioElement | null = null;
const audioCache = new Map<string, HTMLAudioElement>();
const MAX_CACHE_SIZE = 60;

/** Dừng tất cả âm thanh đang phát (cả audio element lẫn Web Speech). */
export function stopSpeech(): void {
  if (activeAudio !== null) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/** Phát âm qua Web Speech API cục bộ của trình duyệt. */
export function speakWebSpeech(rawText: string, options: SpeakOptions): () => void {
  const clean = cleanJapaneseSpeechText(rawText);
  if (!clean) {
    options.onEnd?.();
    return () => undefined;
  }

  if (!isSpeechSupported()) {
    options.onError?.('Trình duyệt chưa hỗ trợ phát âm tiếng Nhật.');
    return () => undefined;
  }

  const synth = window.speechSynthesis;
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingListener: (() => void) | null = null;

  const clearPendingVoices = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (pendingListener !== null) {
      synth.removeEventListener('voiceschanged', pendingListener);
      pendingListener = null;
    }
  };

  const doSpeak = (): void => {
    if (!active) return;
    clearPendingVoices();

    try {
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'ja-JP';
      utterance.rate = options.rate ?? 0.85;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = Math.max(0, Math.min(1, options.volume ?? 1.0));

      const voice = findJapaneseVoice(synth);
      if (voice !== undefined) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        if (active) options.onStart?.();
      };

      utterance.onend = () => {
        if (active) {
          active = false;
          options.onEnd?.();
        }
      };

      utterance.onerror = (event) => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
          if (active) {
            active = false;
            options.onEnd?.();
          }
          return;
        }
        if (active) {
          active = false;
          options.onError?.('Không phát được âm thanh. Hãy kiểm tra cài đặt âm lượng thiết bị.');
        }
      };

      synth.speak(utterance);
    } catch {
      if (active) {
        active = false;
        options.onError?.('Không khởi tạo được giọng đọc trên thiết bị này.');
      }
    }
  };

  const voices = synth.getVoices();
  const hasJa = voices.some((v) => v.lang.toLowerCase().startsWith('ja'));

  if (!voices.length || !hasJa) {
    pendingListener = () => {
      if (synth.getVoices().some((v) => v.lang.toLowerCase().startsWith('ja'))) {
        doSpeak();
      }
    };
    synth.addEventListener('voiceschanged', pendingListener);
    timer = setTimeout(doSpeak, 700);
  } else {
    doSpeak();
  }

  return () => {
    active = false;
    clearPendingVoices();
    if (synth.speaking || synth.pending) {
      synth.cancel();
    }
  };
}

/**
 * Phát âm một đoạn văn bản tiếng Nhật.
 * Ưu tiên tải audio chất lượng cao từ Google Neural TTS kèm Pitch Accent;
 * tự động fallback sang Web Speech API nếu thiết bị offline.
 */
export function speakJapanese(text: string, options: SpeakOptions = {}): () => void {
  const clean = cleanJapaneseSpeechText(text);
  if (!clean) {
    options.onEnd?.();
    return () => undefined;
  }

  // Dừng âm thanh cũ trước khi phát mới
  stopSpeech();

  const preferNeural = options.preferNeural ?? true;

  // Nếu trình duyệt hỗ trợ Audio và được bật preferNeural -> thử Google TTS trước
  if (preferNeural && typeof Audio !== 'undefined') {
    let cancelled = false;
    let cancelFallback: (() => void) | null = null;

    const audioUrl = `/api/tts?text=${encodeURIComponent(clean)}`;

    let audio = audioCache.get(clean);
    if (!audio) {
      try {
        audio = new Audio(audioUrl);
        if (audioCache.size >= MAX_CACHE_SIZE) {
          const firstKey = audioCache.keys().next().value;
          if (firstKey !== undefined) audioCache.delete(firstKey);
        }
        audioCache.set(clean, audio);
      } catch {
        audio = undefined;
      }
    }

    if (audio) {
      activeAudio = audio;
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, options.volume ?? 1.0));

      audio.onplay = () => {
        if (!cancelled) options.onStart?.();
      };

      audio.onended = () => {
        if (!cancelled) {
          if (activeAudio === audio) activeAudio = null;
          options.onEnd?.();
        }
      };

      const handleFallback = (): void => {
        if (cancelled) return;
        if (activeAudio === audio) activeAudio = null;
        cancelFallback = speakWebSpeech(clean, options);
      };

      audio.onerror = handleFallback;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Lỗi do abort khi bấm liên tục thì bỏ qua
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          handleFallback();
        });
      }

      return () => {
        cancelled = true;
        if (activeAudio === audio) {
          audio.pause();
          audio.currentTime = 0;
          activeAudio = null;
        }
        if (cancelFallback !== null) {
          cancelFallback();
        }
      };
    }
  }

  // Fallback trực tiếp nếu không thể dùng Audio element
  return speakWebSpeech(clean, options);
}
