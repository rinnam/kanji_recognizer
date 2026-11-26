import { Platform, Vibration } from 'react-native';

export function hapticTap() {
  if (Platform.OS === 'web') return;
  try {
    Vibration.vibrate(12);
  } catch {
    // ignore hardware without vibrator
  }
}

export function hapticSuccess() {
  if (Platform.OS === 'web') return;
  try {
    Vibration.vibrate(22);
  } catch {
    // ignore
  }
}

export function hapticCrit() {
  if (Platform.OS === 'web') return;
  try {
    Vibration.vibrate([0, 18, 40, 28]);
  } catch {
    // ignore
  }
}

export function hapticError() {
  if (Platform.OS === 'web') return;
  try {
    Vibration.vibrate([0, 45, 45, 55]);
  } catch {
    // ignore
  }
}
