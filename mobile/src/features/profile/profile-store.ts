import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LearningProfile {
  displayName: string;
  jlptLevel: 'BEGINNER' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  primaryGoal: string;
  dailyMinutes: number;
}

export const DEFAULT_PROFILE: LearningProfile = {
  displayName: 'Võ Gia Lượng',
  jlptLevel: 'N3',
  primaryGoal: 'Ôn thi JLPT',
  dailyMinutes: 30,
};

const PROFILE_KEY = 'kanji_nest_profile_v1';

export async function readLearningProfile(): Promise<LearningProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<LearningProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveLearningProfile(profile: LearningProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage errors
  }
}
