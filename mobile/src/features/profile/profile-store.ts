import AsyncStorage from '@react-native-async-storage/async-storage';
import { libraryEndpoint } from '../../library-source';
import { readAuthSession } from '../auth/auth-store';

export interface LearningProfile {
  displayName: string;
  jlptLevel: 'BEGINNER' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  primaryGoal: string;
  dailyMinutes: number;
}

export const DEFAULT_PROFILE: LearningProfile = {
  displayName: 'Người học',
  jlptLevel: 'N3',
  primaryGoal: 'Ôn thi JLPT',
  dailyMinutes: 30,
};

const LEGACY_PROFILE_KEY = 'kanji_nest_profile_v1';
const PROFILE_KEY_PREFIX = 'kanji_nest_profile_v2';

function apiBase(): string {
  return (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
}

function normalizeLevel(lv: unknown): LearningProfile['jlptLevel'] {
  if (lv === 'BEGINNER' || lv === 'N5' || lv === 'N4' || lv === 'N3' || lv === 'N2' || lv === 'N1') {
    return lv;
  }
  return 'N3';
}

export async function readLearningProfile(): Promise<LearningProfile> {
  const session = await readAuthSession();
  const userId = session?.user.id || 'guest';
  const fallbackName = session?.user.displayName || DEFAULT_PROFILE.displayName;
  const baseDefault: LearningProfile = {
    ...DEFAULT_PROFILE,
    displayName: fallbackName,
  };
  const scopedKey = `${PROFILE_KEY_PREFIX}:${userId}`;

  try {
    let raw = await AsyncStorage.getItem(scopedKey);

    // One-time migration for the original owner account only, then remove legacy global key
    if (!raw && session?.user.displayName === 'Võ Gia Lượng') {
      const legacy = await AsyncStorage.getItem(LEGACY_PROFILE_KEY);
      if (legacy) {
        raw = legacy;
        await AsyncStorage.setItem(scopedKey, legacy);
        await AsyncStorage.removeItem(LEGACY_PROFILE_KEY);
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LearningProfile>;
      return {
        displayName: parsed.displayName?.trim() || fallbackName,
        jlptLevel: normalizeLevel(parsed.jlptLevel),
        primaryGoal: parsed.primaryGoal?.trim() || DEFAULT_PROFILE.primaryGoal,
        dailyMinutes: Number(parsed.dailyMinutes) > 0 ? Number(parsed.dailyMinutes) : 30,
      };
    }

    // Try pulling saved profile for this user from PostgreSQL
    if (session?.accessToken) {
      const resp = await fetch(`${apiBase()}/auth/study-state`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { profile?: Partial<LearningProfile> | null };
        if (data.profile) {
          const remoteProfile: LearningProfile = {
            displayName: data.profile.displayName?.trim() || fallbackName,
            jlptLevel: normalizeLevel(data.profile.jlptLevel),
            primaryGoal: data.profile.primaryGoal?.trim() || DEFAULT_PROFILE.primaryGoal,
            dailyMinutes: Number(data.profile.dailyMinutes) > 0 ? Number(data.profile.dailyMinutes) : 30,
          };
          await AsyncStorage.setItem(scopedKey, JSON.stringify(remoteProfile)).catch(() => undefined);
          return remoteProfile;
        }
      }
    }

    return baseDefault;
  } catch {
    return baseDefault;
  }
}

export async function saveLearningProfile(profile: LearningProfile): Promise<void> {
  const session = await readAuthSession();
  const userId = session?.user.id || 'guest';
  const scopedKey = `${PROFILE_KEY_PREFIX}:${userId}`;
  try {
    await AsyncStorage.setItem(scopedKey, JSON.stringify(profile));
  } catch {
    // ignore storage errors
  }

  if (session?.accessToken) {
    void fetch(`${apiBase()}/auth/study-state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ profile }),
    }).catch(() => undefined);
  }
}
