import { Platform } from 'react-native';

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctor();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/** Synthesizes a realistic wooden door knock ("cốc") via Web Audio API. */
export function playDoorKnockSfx(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Low woody thump
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(195, now);
  osc.frequency.exponentialRampToValueAtTime(68, now + 0.085);

  gain.gain.setValueAtTime(0.65, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);

  // Crisp wood attack transient
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'sine';
  clickOsc.frequency.setValueAtTime(620, now);
  clickOsc.frequency.exponentialRampToValueAtTime(180, now + 0.025);
  clickGain.gain.setValueAtTime(0.35, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.035);
}

/** Soft metallic door handle latch click when opening/closing the interview room door. */
export function playDoorOpenSfx(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

function playTone(freq: number, startOffset: number, duration: number, vol = 0.22): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** Traditional Japanese restaurant sliding door chime ("カランコロン"). */
export function playShopBellSfx(): void {
  playTone(1046.5, 0, 0.22, 0.18);
  playTone(1318.5, 0.12, 0.25, 0.16);
  playTone(1568.0, 0.25, 0.35, 0.14);
}

/** Japanese restaurant table call bell ("ピンポーン♪"). */
export function playCallBellSfx(): void {
  playTone(880, 0, 0.18, 0.22);
  playTone(698.46, 0.18, 0.45, 0.22);
}

/** Japanese clinic waiting-room gentle chime. */
export function playClinicChimeSfx(): void {
  playTone(659.25, 0, 0.22, 0.16);
  playTone(783.99, 0.2, 0.24, 0.16);
  playTone(1046.5, 0.4, 0.45, 0.18);
}
