import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { libraryEndpoint } from '../../library-source';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Records spoken Japanese audio via MediaRecorder and transcribes verbatim through
 * Backend Gemini Audio (/api/interview/transcribe-audio), preserving fillers (えーと, あのー, うーん).
 * Works reliably on both Edge and Chrome without Web Speech API "network" errors.
 */
export function useJapaneseMic() {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioFillers, setAudioFillers] = useState<string[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    setSupported(
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
        typeof MediaRecorder !== 'undefined',
    );
    return () => {
      try {
        recorderRef.current?.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Trình duyệt không hỗ trợ ghi âm Micro. Bạn có thể gõ câu trả lời trực tiếp.');
      return;
    }
    setMicError(null);
    setAudioFillers([]);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeType.split(';')[0] || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size < 200) {
          setListening(false);
          return;
        }
        setTranscribing(true);
        void blobToBase64(blob)
          .then(async (base64Data) => {
            const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
            const res = await fetch(`${base}/interview/transcribe-audio`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mimeType: blob.type || 'audio/webm',
                base64Data,
              }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { transcript?: string; fillers?: string[] };
            if (data.transcript) {
              setTranscript(data.transcript);
            } else {
              setMicError('Không nghe rõ tiếng Nhật trong đoạn ghi âm. Hãy thử nói to và rõ hơn.');
            }
            setAudioFillers(Array.isArray(data.fillers) ? data.fillers : []);
          })
          .catch(() => {
            setMicError('Không nhận diện được giọng nói từ Backend. Hãy kiểm tra Backend cổng 3000.');
          })
          .finally(() => {
            setTranscribing(false);
          });
      };

      recorderRef.current = recorder;
      recorder.start();
      setListening(true);
    } catch {
      setMicError('Không truy cập được Micro. Hãy cấp quyền Micro trên thanh địa chỉ trình duyệt.');
      setListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  return {
    supported,
    listening,
    transcribing,
    transcript,
    setTranscript,
    audioFillers,
    setAudioFillers,
    micError,
    startListening,
    stopListening,
  };
}
