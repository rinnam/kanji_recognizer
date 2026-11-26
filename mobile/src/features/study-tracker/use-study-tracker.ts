import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { libraryEndpoint } from '../../library-source';
import {
  getCachedAuthSession,
  readAuthSession,
  subscribeAuthSession,
  type AuthSession,
} from '../auth/auth-store';

export interface DailyStudyRecord {
  date: string; // YYYY-MM-DD
  seconds: number;
  goalSeconds: number;
}

const LEGACY_STUDY_LOGS_KEY = 'kanji_nest_study_logs_v1';
const STUDY_LOGS_KEY_PREFIX = 'kanji_nest_study_logs_v2';
/** Pause counting if user has zero interaction for 90s (prevents idle tab inflation). */
const IDLE_TIMEOUT_MS = 90_000;
/** Minimum seconds studied on a given day to count toward daily streak. */
export const STREAK_MIN_SECONDS = 60;

function apiBase(): string {
  return (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
}

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

// ── Strictly Per-User Study Timer Store (isolated per account + PostgreSQL sync) ──
const logsByUser = new Map<string, Record<string, DailyStudyRecord>>();
const hydratedUsers = new Set<string>();
const hydratingPromises = new Map<string, Promise<void>>();
let activeUserId = 'guest';
let activeToken: string | null = null;
let lastInteractionMs = Date.now();
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
}

export function markStudyInteraction(): void {
  lastInteractionMs = Date.now();
}

function mergeLogsMax(
  a: Record<string, DailyStudyRecord>,
  b: Record<string, DailyStudyRecord>,
): Record<string, DailyStudyRecord> {
  const merged: Record<string, DailyStudyRecord> = { ...a };
  for (const [k, rec] of Object.entries(b)) {
    if (!rec || typeof rec.date !== 'string') continue;
    const existing = merged[k];
    if (!existing || rec.seconds > existing.seconds) {
      merged[k] = rec;
    }
  }
  return merged;
}

function pushLogsToServer(token: string | null, logs: Record<string, DailyStudyRecord>): void {
  if (!token || Object.keys(logs).length === 0) return;
  void fetch(`${apiBase()}/auth/study-state`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ logs }),
  }).catch(() => undefined);
}

function hydrateUserLogs(session: AuthSession | null): Promise<void> {
  const userId = session?.user.id || 'guest';
  activeUserId = userId;
  activeToken = session?.accessToken ?? null;

  if (hydratedUsers.has(userId)) {
    notifyListeners();
    return Promise.resolve();
  }
  const inflight = hydratingPromises.get(userId);
  if (inflight) return inflight;

  const scopedKey = `${STUDY_LOGS_KEY_PREFIX}:${userId}`;
  const p = (async () => {
    let localLogs: Record<string, DailyStudyRecord> = logsByUser.get(userId) ?? {};
    try {
      let raw = await AsyncStorage.getItem(scopedKey);
      // One-time safe migration ONLY for original owner "Võ Gia Lượng", then delete legacy global key
      if (!raw && session?.user.displayName === 'Võ Gia Lượng') {
        const legacy = await AsyncStorage.getItem(LEGACY_STUDY_LOGS_KEY);
        if (legacy) {
          raw = legacy;
          await AsyncStorage.setItem(scopedKey, legacy);
          await AsyncStorage.removeItem(LEGACY_STUDY_LOGS_KEY);
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, DailyStudyRecord>;
        if (parsed && typeof parsed === 'object') {
          localLogs = mergeLogsMax(localLogs, parsed);
        }
      }
    } catch {
      // ignore local parse error
    }

    logsByUser.set(userId, localLogs);
    hydratedUsers.add(userId);
    notifyListeners();

    // Sync with PostgreSQL for this exact user so multiple devices stay consistent
    if (session?.accessToken) {
      try {
        const resp = await fetch(`${apiBase()}/auth/study-state`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (resp.ok) {
          const data = (await resp.json()) as { logs?: Record<string, DailyStudyRecord> };
          const remoteLogs = data.logs ?? {};
          const merged = mergeLogsMax(logsByUser.get(userId) ?? {}, remoteLogs);
          logsByUser.set(userId, merged);
          await AsyncStorage.setItem(scopedKey, JSON.stringify(merged)).catch(() => undefined);
          notifyListeners();
          if (Object.keys(localLogs).length > 0) {
            pushLogsToServer(session.accessToken, merged);
          }
        }
      } catch {
        // offline fallback
      }
    }
  })().finally(() => {
    hydratingPromises.delete(userId);
  });

  hydratingPromises.set(userId, p);
  return p;
}

// Keep activeUserId strictly synced whenever login/logout occurs
subscribeAuthSession((nextSession) => {
  // Flush previous user's state before switching
  if (activeUserId && activeUserId !== 'guest') {
    const prevLogs = logsByUser.get(activeUserId);
    if (prevLogs) {
      void AsyncStorage.setItem(
        `${STUDY_LOGS_KEY_PREFIX}:${activeUserId}`,
        JSON.stringify(prevLogs),
      ).catch(() => undefined);
      pushLogsToServer(activeToken, prevLogs);
    }
  }
  void hydrateUserLogs(nextSession);
});

export function useGlobalStudyTimer(options: { enabled: boolean; pathname: string; goalSeconds: number }) {
  const { enabled, pathname, goalSeconds } = options;

  useEffect(() => {
    markStudyInteraction();
  }, [pathname]);

  useEffect(() => {
    void readAuthSession().then((s) => hydrateUserLogs(s));
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
      const uid = activeUserId;
      if (!uid || uid === 'guest' || !hydratedUsers.has(uid) || !appVisible) return;

      const isPassiveListening = pathname.startsWith('/practice/listening');
      if (!isPassiveListening && Date.now() - lastInteractionMs > IDLE_TIMEOUT_MS) {
        return;
      }

      const key = getLocalDateKey();
      const userMap = logsByUser.get(uid) ?? {};
      const prev = userMap[key] ?? { date: key, seconds: 0, goalSeconds };
      const updatedRecord: DailyStudyRecord = {
        date: key,
        seconds: prev.seconds + 1,
        goalSeconds,
      };
      const nextMap = { ...userMap, [key]: updatedRecord };
      logsByUser.set(uid, nextMap);
      notifyListeners();

      ticks += 1;
      if (ticks % 5 === 0) {
        void AsyncStorage.setItem(`${STUDY_LOGS_KEY_PREFIX}:${uid}`, JSON.stringify(nextMap)).catch(
          () => undefined,
        );
      }
      if (ticks % 20 === 0 && activeToken) {
        pushLogsToServer(activeToken, { [key]: updatedRecord });
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
      const uid = activeUserId;
      if (uid && uid !== 'guest' && hydratedUsers.has(uid)) {
        const finalMap = logsByUser.get(uid) ?? {};
        void AsyncStorage.setItem(`${STUDY_LOGS_KEY_PREFIX}:${uid}`, JSON.stringify(finalMap)).catch(
          () => undefined,
        );
        const todayRec = finalMap[getLocalDateKey()];
        if (todayRec && activeToken) {
          pushLogsToServer(activeToken, { [todayRec.date]: todayRec });
        }
      }
    };
  }, [enabled, pathname, goalSeconds]);
}

/** Reads live study timer & streak metrics strictly for the currently authenticated user. */
export function useStudyTracker(dailyGoalMinutes: number) {
  const [, setVersion] = useState(0);
  const todayKey = getLocalDateKey();
  const goalSeconds = Math.max(1, dailyGoalMinutes) * 60;

  useEffect(() => {
    const cached = getCachedAuthSession();
    if (cached) {
      void hydrateUserLogs(cached);
    } else {
      void readAuthSession().then((s) => hydrateUserLogs(s));
    }
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const currentUid = getCachedAuthSession()?.user.id ?? activeUserId;
  const logs = logsByUser.get(currentUid) ?? {};
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
