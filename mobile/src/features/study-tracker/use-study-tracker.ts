import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyStudyRecord {
  date: string; // YYYY-MM-DD
  seconds: number;
  goalSeconds: number;
}

const STUDY_LOGS_KEY = 'kanji_nest_study_logs_v1';

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

function computeStreaks(logs: Record<string, DailyStudyRecord>, todayKey: string) {
  const activeDates = Object.values(logs)
    .filter((r) => r.seconds >= 60)
    .map((r) => r.date)
    .sort();
  const totalDays = activeDates.length;
  if (totalDays === 0) return { currentStreak: 0, totalDays: 0, longestStreak: 0 };

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < activeDates.length; i += 1) {
    const prev = Date.parse(`${activeDates[i - 1]}T00:00:00`);
    const curr = Date.parse(`${activeDates[i]}T00:00:00`);
    if (curr - prev === 86_400_000) {
      run += 1;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 1;
    }
  }

  // Current streak counting backwards from today (or yesterday)
  const set = new Set(activeDates);
  let currentStreak = 0;
  const cursor = new Date(`${todayKey}T00:00:00`);
  if (!set.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(getLocalDateKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { currentStreak, totalDays, longestStreak };
}

export function useStudyTracker(dailyGoalMinutes: number) {
  const todayKey = getLocalDateKey();
  const goalSeconds = Math.max(1, dailyGoalMinutes) * 60;
  const [logs, setLogs] = useState<Record<string, DailyStudyRecord>>({});
  const logsRef = useRef<Record<string, DailyStudyRecord>>({});
  const activeRef = useRef(true);

  useEffect(() => {
    void AsyncStorage.getItem(STUDY_LOGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, DailyStudyRecord>;
        logsRef.current = parsed;
        setLogs(parsed);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      activeRef.current = state === 'active';
    });
    const onVis = () => {
      if (typeof document !== 'undefined') {
        activeRef.current = !document.hidden;
      }
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
    }

    let ticks = 0;
    const timer = setInterval(() => {
      if (!activeRef.current) return;
      const key = getLocalDateKey();
      const prev = logsRef.current[key] ?? { date: key, seconds: 0, goalSeconds };
      const nextRecord: DailyStudyRecord = {
        date: key,
        seconds: prev.seconds + 1,
        goalSeconds,
      };
      const nextLogs = { ...logsRef.current, [key]: nextRecord };
      logsRef.current = nextLogs;
      setLogs(nextLogs);

      ticks += 1;
      if (ticks % 5 === 0) {
        void AsyncStorage.setItem(STUDY_LOGS_KEY, JSON.stringify(nextLogs)).catch(() => undefined);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
      void AsyncStorage.setItem(STUDY_LOGS_KEY, JSON.stringify(logsRef.current)).catch(() => undefined);
    };
  }, [goalSeconds]);

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
