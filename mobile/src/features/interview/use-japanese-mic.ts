import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useJapaneseMic() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setSupported(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) {
      setMicError('Trình duyệt chưa hỗ trợ Web Speech API. Hãy dùng Chrome/Edge hoặc gõ trực tiếp.');
      return;
    }
    setMicError(null);
    setTranscript('');
    try {
      const rec = new Ctor();
      rec.lang = 'ja-JP';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let full = '';
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i]?.[0]?.transcript ?? '';
        }
        setTranscript(full.trim());
      };
      rec.onerror = (ev) => {
        if (ev.error === 'not-allowed') {
          setMicError('Trình duyệt đang chặn quyền Micro. Hãy cho phép Micro ở thanh địa chỉ.');
        } else if (ev.error !== 'no-speech') {
          setMicError(`Lỗi Micro: ${ev.error ?? 'không xác định'}`);
        }
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setMicError('Không thể bật Micro. Hãy thử lại hoặc gõ câu trả lời.');
      setListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  return {
    supported,
    listening,
    transcript,
    setTranscript,
    micError,
    startListening,
    stopListening,
  };
}
