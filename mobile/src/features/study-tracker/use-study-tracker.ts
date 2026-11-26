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
import { refreshMembership } from '../membership/membership-store';

export interface DailyStudyRecord {
  date: string; // YYYY-MM-DD
  seconds: number;
  goalSeconds: number;
}

export type TimerStatus =
  | 'counting'
  | 'paused_non_study'
  | 'paused_idle'
  | 'paused_no_action'
  | 'paused_afk_check';

export interface AfkPromptState {
  visible: boolean;
  question: string;
  choices: string[];
  correctIndex: number;
  secondsLeft: number;
  errorHint: string | null;
}

const LEGACY_STUDY_LOGS_KEY = 'kanji_nest_study_logs_v1';
const STUDY_LOGS_KEY_PREFIX = 'kanji_nest_study_logs_v2';
/** Pause counting if user has zero interaction for 45s. */
const IDLE_TIMEOUT_MS = 45_000;
/** Require at least 1 meaningful study action every 3 minutes. */
const MEANINGFUL_ACTION_WINDOW_MS = 180_000;
/** Sync validated active study time with server every 30s. */
const HEARTBEAT_INTERVAL_SECONDS = 30;
/** Show quick Anti-AFK check after 12 minutes of accumulated active counting. */
const AFK_CHECK_INTERVAL_SECONDS = 720;
const AFK_PROMPT_COUNTDOWN_SECONDS = 25;
/** Minimum seconds studied on a given day to count toward daily streak. */
export const STREAK_MIN_SECONDS = 60;

const TAB_SESSION_ID = `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const AFK_BANK: Array<{ question: string; correct: string; distractors: string[] }> = [
  {
    question: "Kiểm tra tỉnh táo: Từ 'ありがとう' nghĩa là gì?",
    correct: 'Cảm ơn',
    distractors: ['Xin chào', 'Tạm biệt'],
  },
  {
    question: "Kiểm tra tỉnh táo: Chữ Hán '日' nghĩa là gì?",
    correct: 'Mặt trời / Ngày',
    distractors: ['Nước', 'Ngọn núi'],
  },
  {
    question: "Kiểm tra tỉnh táo: Chữ Hán '水' (みず) nghĩa là gì?",
    correct: 'Nước',
    distractors: ['Lửa', 'Đất'],
  },
  {
    question: "Kiểm tra tỉnh táo: Từ 'すみません' dùng khi nào?",
    correct: 'Xin lỗi / Nhờ giúp',
    distractors: ['Chúc ngủ ngon', 'Cảm ơn ăn ngon'],
  },
];

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

export function isActiveStudyRoute(pathname: string, challengeActive = false): boolean {
  if (challengeActive) return true;
  const p = (pathname || '').split('?')[0] ?? '';
  return (
    p.startsWith('/practice') ||
    p.startsWith('/flashcards') ||
    p.startsWith('/lessons') ||
    p.startsWith('/lookup') ||
    p.startsWith('/games')
  );
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

// ── Strictly Per-User Study Timer & 4-Layer Anti-AFK Store ──
const logsByUser = new Map<string, Record<string, DailyStudyRecord>>();
const hydratedUsers = new Set<string>();
const hydratingPromises = new Map<string, Promise<void>>();
let activeUserId = 'guest';
let activeToken: string | null = null;
let lastInteractionMs = Date.now();
let lastMeaningfulActionMs = Date.now();
let pendingMeaningfulActions = 0;
let unsyncedSeconds = 0;
let continuousCountSeconds = 0;
let dailyChallengeActive = false;
let currentTimerStatus: TimerStatus = 'paused_non_study';
let lastAfkRejected = false;
let afkPrompt: AfkPromptState = {
  visible: false,
  question: '',
  choices: [],
  correctIndex: 0,
  secondsLeft: AFK_PROMPT_COUNTDOWN_SECONDS,
  errorHint: null,
};

let lastClickX = -999;
let lastClickY = -999;
let sameSpotCount = 0;

const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
}

export function markStudyInteraction(): void {
  lastInteractionMs = Date.now();
  if (currentTimerStatus === 'paused_idle') {
    notifyListeners();
  }
}

export function recordMeaningfulStudyAction(_kind?: string): void {
  const now = Date.now();
  lastInteractionMs = now;
  lastMeaningfulActionMs = now;
  pendingMeaningfulActions += 1;
  lastAfkRejected = false;
  if (currentTimerStatus === 'paused_no_action' || currentTimerStatus === 'paused_idle') {
    notifyListeners();
  }
}

export function setDailyChallengeActive(active: boolean): void {
  dailyChallengeActive = active;
  if (active) {
    recordMeaningfulStudyAction('daily_challenge_open');
  }
  notifyListeners();
}

function triggerAfkPrompt() {
  const pick = AFK_BANK[Math.floor(Math.random() * AFK_BANK.length)] ?? AFK_BANK[0]!;
  const all = [pick.correct, ...pick.distractors];
  // Deterministic-safe shuffle
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = all[i]!;
    all[i] = all[j]!;
    all[j] = tmp;
  }
  afkPrompt = {
    visible: true,
    question: pick.question,
    choices: all,
    correctIndex: all.indexOf(pick.correct),
    secondsLeft: AFK_PROMPT_COUNTDOWN_SECONDS,
    errorHint: null,
  };
  currentTimerStatus = 'paused_afk_check';
  notifyListeners();
}

export function answerAfkPrompt(choiceIndex: number): boolean {
  if (!afkPrompt.visible) return false;
  if (choiceIndex !== afkPrompt.correctIndex) {
    afkPrompt = {
      ...afkPrompt,
      errorHint: 'Chưa đúng rồi, hãy chọn đáp án đúng để tiếp tục đếm giờ nhé!',
    };
    notifyListeners();
    return false;
  }
  afkPrompt = { ...afkPrompt, visible: false, errorHint: null };
  continuousCountSeconds = 0;
  recordMeaningfulStudyAction('afk_check_passed');
  currentTimerStatus = 'counting';
  notifyListeners();
  return true;
}

export function dismissAfkPrompt(): void {
  if (!afkPrompt.visible) return;
  afkPrompt = { ...afkPrompt, visible: false, errorHint: null };
  lastAfkRejected = true;
  currentTimerStatus = 'paused_afk_check';
  notifyListeners();
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

async function sendStudyHeartbeat(params: {
  uid: string;
  token: string;
  route: string;
  elapsedSeconds: number;
  meaningfulActions: number;
  goalSeconds: number;
  challengeActive: boolean;
}): Promise<void> {
  const dateKey = getLocalDateKey();
  try {
    const res = await fetch(`${apiBase()}/study/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.token}`,
      },
      body: JSON.stringify({
        sessionId: TAB_SESSION_ID,
        route: params.route,
        dateKey,
        elapsedSeconds: params.elapsedSeconds,
        meaningfulActions: params.meaningfulActions,
        goalSeconds: params.goalSeconds,
        dailyChallengeActive: params.challengeActive,
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      acceptedSeconds?: number;
      totalSecondsToday?: number;
      dailyGoalEligible?: boolean;
      rejectedReason?: string | null;
    };
    if (typeof data.totalSecondsToday === 'number' && params.uid === activeUserId) {
      const userMap = logsByUser.get(params.uid) ?? {};
      const nextMap: Record<string, DailyStudyRecord> = {
        ...userMap,
        [dateKey]: {
          date: dateKey,
          seconds: data.totalSecondsToday,
          goalSeconds: params.goalSeconds,
        },
      };
      logsByUser.set(params.uid, nextMap);
      void AsyncStorage.setItem(
        `${STUDY_LOGS_KEY_PREFIX}:${params.uid}`,
        JSON.stringify(nextMap),
      ).catch(() => undefined);
      notifyListeners();
    }
    if (data.dailyGoalEligible) {
      void refreshMembership(true);
    }
  } catch {
    // offline fallback: local storage still retains optimistic count
  }
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

subscribeAuthSession((nextSession) => {
  if (activeUserId && activeUserId !== 'guest') {
    const prevLogs = logsByUser.get(activeUserId);
    if (prevLogs) {
      void AsyncStorage.setItem(
        `${STUDY_LOGS_KEY_PREFIX}:${activeUserId}`,
        JSON.stringify(prevLogs),
      ).catch(() => undefined);
    }
  }
  unsyncedSeconds = 0;
  continuousCountSeconds = 0;
  pendingMeaningfulActions = 0;
  afkPrompt = { ...afkPrompt, visible: false, errorHint: null };
  void hydrateUserLogs(nextSession);
});

export function useGlobalStudyTimer(options: { enabled: boolean; pathname: string; goalSeconds: number }) {
  const { enabled, pathname, goalSeconds } = options;

  useEffect(() => {
    const now = Date.now();
    lastInteractionMs = now;
    if (isActiveStudyRoute(pathname, dailyChallengeActive)) {
      lastMeaningfulActionMs = now;
      pendingMeaningfulActions += 1;
      lastAfkRejected = false;
    }
    notifyListeners();
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
    const onPointerDown = (ev: PointerEvent) => {
      const dx = (ev.clientX ?? 0) - lastClickX;
      const dy = (ev.clientY ?? 0) - lastClickY;
      if (dx * dx + dy * dy < 24 * 24) {
        sameSpotCount += 1;
        if (sameSpotCount >= 3) {
          // Ignore automated repeated clicking on exact same pixel
          return;
        }
      } else {
        lastClickX = ev.clientX ?? 0;
        lastClickY = ev.clientY ?? 0;
        sameSpotCount = 0;
      }
      markStudyInteraction();
    };
    const onKeyDown = () => {
      sameSpotCount = 0;
      markStudyInteraction();
      if (isActiveStudyRoute(pathname, dailyChallengeActive)) {
        lastMeaningfulActionMs = Date.now();
        pendingMeaningfulActions += 1;
        lastAfkRejected = false;
      }
    };
    const onScroll = () => {
      markStudyInteraction();
    };
    const onTouchStart = () => {
      markStudyInteraction();
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
      window.addEventListener('keydown', onKeyDown, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
    }

    let ticks = 0;
    const timer = setInterval(() => {
      const uid = activeUserId;
      if (!uid || uid === 'guest' || !hydratedUsers.has(uid) || !appVisible) return;

      // Countdown Layer-3 Anti-AFK modal if visible
      if (afkPrompt.visible) {
        currentTimerStatus = 'paused_afk_check';
        if (afkPrompt.secondsLeft <= 1) {
          dismissAfkPrompt();
        } else {
          afkPrompt = { ...afkPrompt, secondsLeft: afkPrompt.secondsLeft - 1 };
          notifyListeners();
        }
        return;
      }

      if (lastAfkRejected) {
        if (currentTimerStatus !== 'paused_afk_check') {
          currentTimerStatus = 'paused_afk_check';
          notifyListeners();
        }
        return;
      }

      // Layer 1: Only count on active study zones (or when Daily Challenge modal is open)
      if (!isActiveStudyRoute(pathname, dailyChallengeActive)) {
        if (currentTimerStatus !== 'paused_non_study') {
          currentTimerStatus = 'paused_non_study';
          notifyListeners();
        }
        return;
      }

      const now = Date.now();
      const isPassiveListening = pathname.startsWith('/practice/listening');

      // Layer 2A: Idle 45s check
      if (!isPassiveListening && now - lastInteractionMs > IDLE_TIMEOUT_MS) {
        if (currentTimerStatus !== 'paused_idle') {
          currentTimerStatus = 'paused_idle';
          notifyListeners();
        }
        return;
      }

      // Layer 2B: Meaningful study action required within every 3 minutes
      if (now - lastMeaningfulActionMs > MEANINGFUL_ACTION_WINDOW_MS) {
        if (currentTimerStatus !== 'paused_no_action') {
          currentTimerStatus = 'paused_no_action';
          notifyListeners();
        }
        return;
      }

      // Layer 3: Trigger 25s micro-check every 12 minutes of counting
      if (continuousCountSeconds >= AFK_CHECK_INTERVAL_SECONDS) {
        triggerAfkPrompt();
        return;
      }

      currentTimerStatus = 'counting';
      continuousCountSeconds += 1;
      unsyncedSeconds += 1;

      const key = getLocalDateKey();
      const userMap = logsByUser.get(uid) ?? {};
      const prev = userMap[key] ?? { date: key, seconds: 0, goalSeconds };
      const nextSeconds = prev.seconds + 1;
      const updatedRecord: DailyStudyRecord = {
        date: key,
        seconds: nextSeconds,
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

      // Trigger immediate membership refresh right when passing 60s streak or 100% goal locally
      if (nextSeconds === STREAK_MIN_SECONDS || nextSeconds === goalSeconds) {
        void refreshMembership(true);
      }

      // Layer 4: Server Heartbeat every 30 counted seconds
      if (unsyncedSeconds >= HEARTBEAT_INTERVAL_SECONDS && activeToken) {
        const beatSecs = unsyncedSeconds;
        const beatActions = pendingMeaningfulActions;
        unsyncedSeconds = 0;
        pendingMeaningfulActions = 0;
        void sendStudyHeartbeat({
          uid,
          token: activeToken,
          route: pathname,
          elapsedSeconds: beatSecs,
          meaningfulActions: beatActions,
          goalSeconds,
          challengeActive: dailyChallengeActive,
        });
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('touchstart', onTouchStart);
      }
      const uid = activeUserId;
      if (uid && uid !== 'guest' && hydratedUsers.has(uid)) {
        const finalMap = logsByUser.get(uid) ?? {};
        void AsyncStorage.setItem(`${STUDY_LOGS_KEY_PREFIX}:${uid}`, JSON.stringify(finalMap)).catch(
          () => undefined,
        );
        if (unsyncedSeconds >= 3 && activeToken) {
          const flushSecs = unsyncedSeconds;
          const flushActions = pendingMeaningfulActions;
          unsyncedSeconds = 0;
          pendingMeaningfulActions = 0;
          void sendStudyHeartbeat({
            uid,
            token: activeToken,
            route: pathname,
            elapsedSeconds: flushSecs,
            meaningfulActions: flushActions,
            goalSeconds,
            challengeActive: dailyChallengeActive,
          });
        }
      }
    };
  }, [enabled, pathname, goalSeconds]);
}

/** Reads live study timer, Anti-AFK status & streak metrics for current authenticated user. */
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
    timerStatus: currentTimerStatus,
    ...streaks,
  };
}

export function useAntiAfkPrompt() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    prompt: afkPrompt,
    answerPrompt: answerAfkPrompt,
    dismissPrompt: dismissAfkPrompt,
  };
}
