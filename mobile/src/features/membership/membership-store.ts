import { useEffect, useState } from 'react';
import { libraryEndpoint } from '../../library-source';
import {
  getCachedAuthSession,
  readAuthSession,
  subscribeAuthSession,
  type AuthSession,
} from '../auth/auth-store';

export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type BillingCycle = 'monthly' | 'yearly';
export type ShopItemCode = 'ticket_life' | 'ticket_work' | 'pass_life_7d' | 'perm_life_weekly';

export interface PlanDefinitionDto {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPriceVnd: number;
  yearlyPriceVnd: number;
  yearlyPerMonthVnd: number;
  multiplier: number;
  shadowingCustomPerDay: number | null;
  readingPerWeek: number | null;
  writingPerWeek: number | null;
  speakingLifePerDay: number | null;
  speakingWorkPerDay: number | null;
  itEngineerAllowed: boolean;
  uploadCvAllowed: boolean;
  fullRubricAllowed: boolean;
  highlights: string[];
}

export interface ShopItemDto {
  code: ShopItemCode;
  title: string;
  description: string;
  costKs: number;
  unlockType: 'single_ticket' | 'pass_7d' | 'permanent_weekly';
  category: 'life' | 'work';
  allowedScenarios: string[];
  effortHint: string;
}

export interface ScenarioAccessDto {
  scenarioId: string;
  allowed: boolean;
  accessSource: 'pro' | 'plus_quota' | 'free_ticket' | 'locked';
  badgeLabel: string;
  remainingToday: number | null;
  canUploadCv: boolean;
  fullRubric: boolean;
  proOnly: boolean;
  ticketCount: number;
  hasActivePass7d: boolean;
  hasPermanentWeekly: boolean;
}

export interface MembershipSummaryDto {
  todayKey: string;
  weekKey: string;
  subscription: {
    tier: SubscriptionTier;
    billingCycle: BillingCycle;
    startedAt: string | null;
    expiresAt: string | null;
    demoOrderCode: string | null;
    planName: string;
    multiplier: number;
  };
  ksBalance: number;
  usage: {
    readingUsedWeek: number;
    readingLimitWeek: number | null;
    writingUsedWeek: number;
    writingLimitWeek: number | null;
    shadowingCustomToday: number;
    shadowingLimitDay: number | null;
    speakingLifeToday: number;
    speakingLifeLimitDay: number | null;
    speakingWorkToday: number;
    speakingWorkLimitDay: number | null;
  };
  todayGoalStatus: {
    todaySeconds: number;
    goalSeconds: number;
    goalMinutes: number;
    rewardKs: number;
    eligible: boolean;
    claimed: boolean;
  };
  todayChallengeClaimed: boolean;
  streakStatus: {
    currentStreak: number;
    streakStartDate: string | null;
    milestones: Array<{
      days: number;
      rewardKs: number;
      status: 'claimed' | 'claimable' | 'locked';
    }>;
  };
  unlocks: Array<{
    id: string;
    scenarioId: string;
    unlockType: string;
    remainingUses: number | null;
    expiresAt: string | null;
    lastUsedWeek: string | null;
  }>;
  recentTransactions: Array<{
    id: string;
    delta: number;
    balanceAfter: number;
    reasonCode: string;
    description: string;
    createdAt: string;
  }>;
  scenarioAccess: Record<string, ScenarioAccessDto>;
  plans: PlanDefinitionDto[];
  shopItems: ShopItemDto[];
}

export class MembershipApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getMembershipLocalDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function apiBase(): string {
  return (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
}

const DEFAULT_FALLBACK_SUMMARY: MembershipSummaryDto = {
  todayKey: getMembershipLocalDateKey(),
  weekKey: '',
  subscription: {
    tier: 'free',
    billingCycle: 'monthly',
    startedAt: null,
    expiresAt: null,
    demoOrderCode: null,
    planName: 'Miễn phí (Free)',
    multiplier: 1.0,
  },
  ksBalance: 0,
  usage: {
    readingUsedWeek: 0,
    readingLimitWeek: 2,
    writingUsedWeek: 0,
    writingLimitWeek: 2,
    shadowingCustomToday: 0,
    shadowingLimitDay: 2,
    speakingLifeToday: 0,
    speakingLifeLimitDay: 0,
    speakingWorkToday: 0,
    speakingWorkLimitDay: 0,
  },
  todayGoalStatus: {
    todaySeconds: 0,
    goalSeconds: 1800,
    goalMinutes: 30,
    rewardKs: 40,
    eligible: false,
    claimed: false,
  },
  todayChallengeClaimed: false,
  streakStatus: {
    currentStreak: 0,
    streakStartDate: null,
    milestones: [
      { days: 3, rewardKs: 25, status: 'locked' },
      { days: 7, rewardKs: 80, status: 'locked' },
      { days: 14, rewardKs: 180, status: 'locked' },
      { days: 30, rewardKs: 450, status: 'locked' },
    ],
  },
  unlocks: [],
  recentTransactions: [],
  scenarioAccess: {},
  plans: [],
  shopItems: [],
};

const summariesByUser = new Map<string, MembershipSummaryDto>();
const inflightRefresh = new Map<string, Promise<MembershipSummaryDto | null>>();
let activeUid = 'guest';
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
}

async function resolveSession(): Promise<AuthSession | null> {
  return getCachedAuthSession() ?? (await readAuthSession());
}

async function authedRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const session = await resolveSession();
  if (!session?.accessToken) {
    throw new MembershipApiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập để sử dụng tính năng này.');
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as {
    code?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new MembershipApiError(
      res.status,
      json.code || json.error || 'REQUEST_FAILED',
      json.message || `Yêu cầu thất bại (HTTP ${res.status}).`,
    );
  }
  return json as T;
}

export async function refreshMembership(force = false): Promise<MembershipSummaryDto | null> {
  const session = await resolveSession();
  if (!session?.accessToken) {
    activeUid = 'guest';
    notifyListeners();
    return null;
  }
  const uid = session.user.id;
  activeUid = uid;
  if (!force) {
    const existing = inflightRefresh.get(uid);
    if (existing) return existing;
  }

  const p = (async () => {
    try {
      const dateKey = encodeURIComponent(getMembershipLocalDateKey());
      const data = await authedRequest<MembershipSummaryDto>(
        `/membership/summary?dateKey=${dateKey}`,
        'GET',
      );
      summariesByUser.set(uid, data);
      notifyListeners();
      return data;
    } catch {
      return summariesByUser.get(uid) ?? null;
    } finally {
      inflightRefresh.delete(uid);
    }
  })();

  inflightRefresh.set(uid, p);
  return p;
}

subscribeAuthSession((next) => {
  if (!next?.user.id) {
    activeUid = 'guest';
    notifyListeners();
    return;
  }
  activeUid = next.user.id;
  notifyListeners();
  void refreshMembership(true);
});

export async function demoCheckout(
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
): Promise<MembershipSummaryDto> {
  const res = await authedRequest<{ ok: boolean; summary: MembershipSummaryDto }>(
    '/membership/demo-checkout',
    'POST',
    { tier, billingCycle, dateKey: getMembershipLocalDateKey() },
  );
  const uid = (await resolveSession())?.user.id ?? activeUid;
  summariesByUser.set(uid, res.summary);
  notifyListeners();
  return res.summary;
}

export async function redeemShopItem(
  itemCode: ShopItemCode,
  scenarioId: string,
): Promise<MembershipSummaryDto> {
  const res = await authedRequest<{ ok: boolean; summary: MembershipSummaryDto }>(
    '/membership/redeem',
    'POST',
    { itemCode, scenarioId, dateKey: getMembershipLocalDateKey() },
  );
  const uid = (await resolveSession())?.user.id ?? activeUid;
  summariesByUser.set(uid, res.summary);
  notifyListeners();
  return res.summary;
}

export async function claimDailyGoal(): Promise<{
  applied: boolean;
  delta: number;
  balanceAfter: number;
  summary: MembershipSummaryDto;
}> {
  const res = await authedRequest<{
    applied: boolean;
    delta: number;
    balanceAfter: number;
    summary: MembershipSummaryDto;
  }>('/membership/claim-daily-goal', 'POST', { dateKey: getMembershipLocalDateKey() });
  const uid = (await resolveSession())?.user.id ?? activeUid;
  summariesByUser.set(uid, res.summary);
  notifyListeners();
  return res;
}

export async function claimDailyChallenge(
  correctCount: number,
): Promise<{
  applied: boolean;
  delta: number;
  balanceAfter: number;
  summary: MembershipSummaryDto;
}> {
  const res = await authedRequest<{
    applied: boolean;
    delta: number;
    balanceAfter: number;
    summary: MembershipSummaryDto;
  }>('/membership/claim-daily-challenge', 'POST', {
    correctCount,
    dateKey: getMembershipLocalDateKey(),
  });
  const uid = (await resolveSession())?.user.id ?? activeUid;
  summariesByUser.set(uid, res.summary);
  notifyListeners();
  return res;
}

export async function claimStreakMilestone(
  milestone: 3 | 7 | 14 | 30,
): Promise<{
  applied: boolean;
  delta: number;
  balanceAfter: number;
  summary: MembershipSummaryDto;
}> {
  const res = await authedRequest<{
    applied: boolean;
    delta: number;
    balanceAfter: number;
    summary: MembershipSummaryDto;
  }>('/membership/claim-streak', 'POST', {
    milestone,
    dateKey: getMembershipLocalDateKey(),
  });
  const uid = (await resolveSession())?.user.id ?? activeUid;
  summariesByUser.set(uid, res.summary);
  notifyListeners();
  return res;
}

export async function startSpeakingSession(scenarioId: string): Promise<{
  allowed: boolean;
  speakingSessionToken: string;
  accessMode: 'pro' | 'plus_quota' | 'free_ticket';
  tier: SubscriptionTier;
  fullRubric: boolean;
  canUploadCv: boolean;
  viaDescription: string;
}> {
  const res = await authedRequest<{
    allowed: boolean;
    speakingSessionToken: string;
    accessMode: 'pro' | 'plus_quota' | 'free_ticket';
    tier: SubscriptionTier;
    fullRubric: boolean;
    canUploadCv: boolean;
    viaDescription: string;
  }>('/interview/start-session', 'POST', {
    scenarioId,
    dateKey: getMembershipLocalDateKey(),
  });
  void refreshMembership(true);
  return res;
}

export function useMembership() {
  const [, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const listener = () => {
      if (active) setVersion((v) => v + 1);
    };
    listeners.add(listener);
    void refreshMembership().finally(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  const uid = getCachedAuthSession()?.user.id ?? activeUid;
  const summary = summariesByUser.get(uid) ?? DEFAULT_FALLBACK_SUMMARY;

  return {
    loaded: loaded || summariesByUser.has(uid),
    summary,
    tier: summary.subscription.tier,
    ksBalance: summary.ksBalance,
    refresh: () => refreshMembership(true),
  };
}
