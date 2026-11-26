import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyStudyRecord {
  date: string; // YYYY-MM-DD
  seconds: number;
  goalSeconds: number;
}

const STUDY_LOGS_KEY = 'kanji_nest_study_logs_v1';
/** Pause counting if user has zero interaction for 90s (prevents idle tab inflation). */
const IDLE_TIMEOUT_MS = 90_000;
/** Minimum seconds studied on a given day to count toward daily streak. */
export const STREAK_MIN_SECONDS = 60;

export function getLocalDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatMmSs(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseLocalNoonMs(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

export function computeStreaks(logs: Record<string, DailyStudyRecord>, todayKey: string) {
  const activeDates = Object.values(logs)
    .filter((r) => r.seconds >= STREAK_MIN_SECONDS && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .map((r) => r.date)
    .sort();
  const totalDays = activeDates.length;
  if (totalDays === 0) {
    return { currentStreak: 0, totalDays: 0, longestStreak: 0, streakActiveToday: false };
  }

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < activeDates.length; i += 1) {
    const prev = parseLocalNoonMs(activeDates[i - 1]!);
    const curr = parseLocalNoonMs(activeDates[i]!);
    const diffDays = Math.round((curr - prev) / 86_400_000);
    if (diffDays === 1) {
      run += 1;
      if (run > longestStreak) longestStreak = run;
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  const set = new Set(activeDates);
  const streakActiveToday = set.has(todayKey);
  let currentStreak = 0;
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const cursor = new Date(ty || 2026, (tm || 1) - 1, td || 1, 12, 0, 0, 0);
  if (!streakActiveToday) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(getLocalDateKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { currentStreak, totalDays, longestStreak, streakActiveToday };
}

// ── Shared Global Singleton Store so timer runs across ALL study screens ─────
let globalLogs: Record<string, DailyStudyRecord> = {};
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let lastInteractionMs = Date.now();
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
}

export function markStudyInteraction(): void {
  lastInteractionMs = Date.now();
}

function ensureHydrated(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (!hydratePromise) {
    hydratePromise = AsyncStorage.getItem(STUDY_LOGS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, DailyStudyRecord>;
          if (parsed && typeof parsed === 'object') {
            globalLogs = { ...parsed, ...globalLogs };
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        hydrated = true;
        notifyListeners();
      });
  }
  return hydratePromise;
}

/**
 * Mounts ONCE in RootLayout (`_layout.tsx`) so study time accumulates across
 * Flashcard, Quiz, Shadowing, Reading, Writing, Speaking, Lookup & Games —
 * while pausing on auth/onboarding pages, background tabs, or >90s idle periods.
 */
export function useGlobalStudyTimer(options: { enabled: boolean; pathname: string; goalSeconds: number }) {
  const { enabled, pathname, goalSeconds } = options;

  useEffect(() => {
    markStudyInteraction();
  }, [pathname]);

  useEffect(() => {
    void ensureHydrated();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let appVisible = true;
    const sub = AppState.addEventListener('change', (state) => {
      appVisible = state === 'active';
      if (appVisible) markStudyInteraction();
    });

    const onVis = () => {
      if (typeof document !== 'undefined') {
        appVisible = !document.hidden;
        if (appVisible) markStudyInteraction();
      }
    };
    const onUserActivity = () => {
      lastInteractionMs = Date.now();
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('pointerdown', onUserActivity, { passive: true });
      window.addEventListener('keydown', onUserActivity, { passive: true });
      window.addEventListener('scroll', onUserActivity, { passive: true });
      window.addEventListener('touchstart', onUserActivity, { passive: true });
    }

    let ticks = 0;
    const timer = setInterval(() => {
      if (!hydrated || !appVisible) return;
      const isPassiveListening = pathname.startsWith('/practice/listening');
      if (!isPassiveListening && Date.now() - lastInteractionMs > IDLE_TIMEOUT_MS) {
        return;
      }

      const key = getLocalDateKey();
      const prev = globalLogs[key] ?? { date: key, seconds: 0, goalSeconds };
      globalLogs = {
        ...globalLogs,
        [key]: {
          date: key,
          seconds: prev.seconds + 1,
          goalSeconds,
        },
      };
      notifyListeners();

      ticks += 1;
      if (ticks % 5 === 0) {
        void AsyncStorage.setItem(STUDY_LOGS_KEY, JSON.stringify(globalLogs)).catch(() => undefined);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('pointerdown', onUserActivity);
        window.removeEventListener('keydown', onUserActivity);
        window.removeEventListener('scroll', onUserActivity);
        window.removeEventListener('touchstart', onUserActivity);
      }
      if (hydrated) {
        void AsyncStorage.setItem(STUDY_LOGS_KEY, JSON.stringify(globalLogs)).catch(() => undefined);
      }
    };
  }, [enabled, pathname, goalSeconds]);
}

/** Reads live study timer & streak metrics from the shared global store. */
export function useStudyTracker(dailyGoalMinutes: number) {
  const [, setVersion] = useState(0);
  const todayKey = getLocalDateKey();
  const goalSeconds = Math.max(1, dailyGoalMinutes) * 60;

  useEffect(() => {
    void ensureHydrated();
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const logs = globalLogs;
  const todaySeconds = logs[todayKey]?.seconds ?? 0;
  const percent = Math.min(100, Math.round((todaySeconds / goalSeconds) * 100));
  const streaks = useMemo(() => computeStreaks(logs, todayKey), [logs, todayKey]);

  return {
    todaySeconds,
    goalSeconds,
    percent,
    logs,
    ...streaks,
  };
}
