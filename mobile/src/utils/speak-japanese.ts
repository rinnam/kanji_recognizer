import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { libraryEndpoint } from '../library-source';

let activeWebAudio: HTMLAudioElement | null = null;

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

/**
 * Cross-platform Japanese TTS helper for Web, iOS, and Android.
 * Awaits Speech.stop() first so Android/iOS does not cancel the newly queued utterance.
 */
export async function speakJapanese(text: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  // On Web, play real Japanese MP3 from backend /api/tts (works even without Windows Japanese voice pack).
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
    const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
    const url = `${base}/tts?text=${encodeURIComponent(clean)}`;
    try {
      if (activeWebAudio) {
        activeWebAudio.pause();
        activeWebAudio.currentTime = 0;
      }
      const audio = new Audio(url);
      activeWebAudio = audio;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Fallback to browser speechSynthesis if backend /api/tts is unreachable
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(clean);
            utter.lang = 'ja-JP';
            utter.rate = 0.9;
            window.speechSynthesis.speak(utter);
          }
        });
      }
      return;
    } catch {
      // fall through
    }
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
    // Fallback without voice lookup
    try {
      Speech.speak(clean, { language: 'ja-JP', rate: 0.9 });
    } catch {
      // ignore if device has no TTS engine
    }
  }
}
