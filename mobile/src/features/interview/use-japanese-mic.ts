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

export interface RecordedAudioPayload {
  base64Data: string;
  mimeType: string;
}

/**
 * Compact 24kbps Opus MediaRecorder hook.
 * Supports 1-Shot Direct Audio Mode (skips separate transcription round-trip during Q&A)
 * as well as standalone transcription for etiquette steps.
 */
export function useJapaneseMic(options?: {
  onDirectAudio?: (payload: RecordedAudioPayload) => void;
  directMode?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [audioFillers, setAudioFillers] = useState<string[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const directModeRef = useRef(Boolean(options?.directMode));
  const onDirectAudioRef = useRef(options?.onDirectAudio);

  directModeRef.current = Boolean(options?.directMode);
  onDirectAudioRef.current = options?.onDirectAudio;

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

  useEffect(() => {
    if (!listening) {
      setRecordSeconds(0);
      return;
    }
    const t = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  const startListening = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
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

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 24000,
      });

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const cleanMime = mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: cleanMime });
        chunksRef.current = [];
        if (blob.size < 200) {
          setListening(false);
          return;
        }

        // 1-Shot Direct Voice Turn: pass compact audio directly to /interview/turn (zero extra round-trip!)
        if (directModeRef.current && onDirectAudioRef.current) {
          void blobToBase64(blob)
            .then((base64Data) => {
              onDirectAudioRef.current?.({ base64Data, mimeType: cleanMime });
            })
            .catch(() => {
              setMicError('Không đọc được đoạn ghi âm. Hãy thử lại.');
            });
          return;
        }

        // Standalone transcribe for etiquette steps
        setTranscribing(true);
        void blobToBase64(blob)
          .then(async (base64Data) => {
            const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
            const res = await fetch(`${base}/interview/transcribe-audio`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mimeType: cleanMime, base64Data }),
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
            setMicError('Máy chủ AI đang bận. Bạn có thể bấm thử lại hoặc gõ trực tiếp vào ô bên cạnh.');
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
    recordSeconds,
    transcript,
    setTranscript,
    audioFillers,
    setAudioFillers,
    micError,
    startListening,
    stopListening,
  };
}
