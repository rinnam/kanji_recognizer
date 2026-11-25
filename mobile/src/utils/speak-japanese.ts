import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { libraryEndpoint } from '../library-source';

let activeWebAudio: HTMLAudioElement | null = null;
let playbackSeq = 0;

let cachedJaVoiceId: string | undefined;
let voiceLookupDone = false;

async function resolveJapaneseVoice(): Promise<string | undefined> {
  if (voiceLookupDone) return cachedJaVoiceId;
  voiceLookupDone = true;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const jaVoice = voices.find((v) => v.language?.toLowerCase().startsWith('ja'));
    cachedJaVoiceId = jaVoice?.identifier;
  } catch {
    cachedJaVoiceId = undefined;
  }
  return cachedJaVoiceId;
}

/** Splits long Japanese paragraphs into natural sentence chunks (<= 110 chars) so TTS never truncates. */
function splitJapaneseSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[。！？!?])|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [text.trim()];

  const chunks: string[] = [];
  for (const part of parts) {
    if (part.length <= 110) {
      chunks.push(part);
    } else {
      // Split overly long sentence on commas
      const sub = part
        .split(/(?<=、)/)
        .map((s) => s.trim())
        .filter(Boolean);
      let buf = '';
      for (const piece of sub) {
        if ((buf + piece).length > 110 && buf) {
          chunks.push(buf);
          buf = piece;
        } else {
          buf += piece;
        }
      }
      if (buf) chunks.push(buf);
    }
  }
  return chunks;
}

function playSingleWebChunk(url: string, seqId: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (seqId !== playbackSeq) {
      resolve(false);
      return;
    }
    const audio = new Audio(url);
    activeWebAudio = audio;
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => resolve(false));
    }
  });
}

/**
 * Cross-platform Japanese TTS helper for Web, iOS, and Android.
 * On Web, plays full-sentence Japanese MP3 chunks via backend /api/tts?full=1 and resolves when finished.
 */
export async function speakJapanese(text: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
    const seqId = ++playbackSeq;
    if (activeWebAudio) {
      activeWebAudio.pause();
      activeWebAudio.currentTime = 0;
      activeWebAudio = null;
    }

    const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
    const chunks = splitJapaneseSentences(clean);

    for (const chunk of chunks) {
      if (seqId !== playbackSeq) return;
      const url = `${base}/tts?full=1&text=${encodeURIComponent(chunk)}`;
      const ok = await playSingleWebChunk(url, seqId);
      if (!ok && seqId === playbackSeq) {
        // Fallback to browser speechSynthesis for remaining text
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(chunk);
          utter.lang = 'ja-JP';
          utter.rate = 0.92;
          window.speechSynthesis.speak(utter);
        }
        return;
      }
    }
    return;
  }

  try {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      await Speech.stop();
    }
    const voice = await resolveJapaneseVoice();
    Speech.speak(clean, {
      language: 'ja-JP',
      ...(voice ? { voice } : {}),
      pitch: 1.0,
      rate: 0.9,
    });
  } catch {
    try {
      Speech.speak(clean, { language: 'ja-JP', rate: 0.9 });
    } catch {
      // ignore if device has no TTS engine
    }
  }
}
