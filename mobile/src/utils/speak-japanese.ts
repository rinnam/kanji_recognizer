import * as Speech from 'expo-speech';

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
