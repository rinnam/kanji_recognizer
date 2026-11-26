import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import { ensureStudyStateTables } from './study-state.service.js';

export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type BillingCycle = 'monthly' | 'yearly';
export type ShopItemCode = 'ticket_life' | 'ticket_work' | 'pass_life_7d' | 'perm_life_weekly';
export type SpeakingAccessMode = 'pro' | 'plus_quota' | 'free_ticket';

export const LIFE_SCENARIO_IDS = ['roleplay_restaurant', 'roleplay_clinic'] as const;
export const WORK_SCENARIO_IDS = ['roleplay_horenso', 'baito', 'study_abroad'] as const;
export const PRO_ONLY_SCENARIO_IDS = ['it_engineer'] as const;
export const ALL_SCENARIO_IDS = [
  ...PRO_ONLY_SCENARIO_IDS,
  ...WORK_SCENARIO_IDS,
  ...LIFE_SCENARIO_IDS,
] as const;

export const GOAL_REWARD_MAP: Record<number, number> = {
  5: 5,
  10: 10,
  15: 18,
  30: 40,
  60: 85,
};

export const STREAK_REWARD_MAP: Record<number, number> = {
  3: 25,
  7: 80,
  14: 180,
  30: 450,
};

export interface PlanDefinition {
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

export const PLAN_CATALOG: Record<SubscriptionTier, PlanDefinition> = {
  free: {
    tier: 'free',
    name: 'Miễn phí (Free)',
    tagline: 'Xây nền tảng JLPT vững chắc mỗi ngày',
    monthlyPriceVnd: 0,
    yearlyPriceVnd: 0,
    yearlyPerMonthVnd: 0,
    multiplier: 1.0,
    shadowingCustomPerDay: 2,
    readingPerWeek: 2,
    writingPerWeek: 2,
    speakingLifePerDay: 0,
    speakingWorkPerDay: 0,
    itEngineerAllowed: false,
    uploadCvAllowed: false,
    fullRubricAllowed: false,
    highlights: [
      'Từ điển, Bài học JLPT N5–N1, Flashcard SRS & Game từ vựng không giới hạn',
      'Luyện nghe Shadowing: video mẫu + tối đa 2 link tự dán/ngày',
      'Luyện đọc AI & Luyện viết Sensei AI: 2 bài/tuần mỗi kỹ năng',
      'Luyện nói 3D AI khóa mặc định (có thể tích Xu KS đổi vé lẻ)',
      'Hệ số tích Xu Kanji Smart: ×1.0',
    ],
  },
  plus: {
    tier: 'plus',
    name: 'Tiêu chuẩn (Plus)',
    tagline: 'Mở khóa AI hàng ngày & Hội thoại Đời sống 3D',
    monthlyPriceVnd: 79000,
    yearlyPriceVnd: 708000,
    yearlyPerMonthVnd: 59000,
    multiplier: 1.25,
    shadowingCustomPerDay: null,
    readingPerWeek: 15,
    writingPerWeek: 15,
    speakingLifePerDay: 3,
    speakingWorkPerDay: 1,
    itEngineerAllowed: false,
    uploadCvAllowed: false,
    fullRubricAllowed: false,
    highlights: [
      'Shadowing YouTube không giới hạn link tự dán',
      'Luyện đọc AI & Luyện viết Sensei AI: 15 bài/tuần mỗi kỹ năng',
      'Nói 3D AI Đời sống (Nhà hàng, Phòng khám): tối đa 3 phiên/ngày',
      'Nói 3D AI Công sở & PV cơ bản (Horenso, Baito, Du học): 1 phiên/ngày',
      'Xem điểm tổng + câu sửa mẫu (Khóa PV Kỹ sư IT & Upload CV)',
      'Hệ số tích Xu Kanji Smart: ×1.25',
    ],
  },
  pro: {
    tier: 'pro',
    name: 'Chuyên sâu (Pro AI)',
    tagline: 'Full cơ chế Phỏng vấn IT 3D, Upload CV & Chấm PREP/STAR',
    monthlyPriceVnd: 149000,
    yearlyPriceVnd: 1428000,
    yearlyPerMonthVnd: 119000,
    multiplier: 1.5,
    shadowingCustomPerDay: null,
    readingPerWeek: null,
    writingPerWeek: null,
    speakingLifePerDay: null,
    speakingWorkPerDay: null,
    itEngineerAllowed: true,
    uploadCvAllowed: true,
    fullRubricAllowed: true,
    highlights: [
      'Full 100% cơ chế Luyện nói & Phỏng vấn 3D cùng AI không giới hạn',
      'Mở khóa Phỏng vấn Kỹ sư IT 6 chặng & Upload CV thật (PDF/Ảnh)',
      'Chấm điểm chuẩn Nhật chuyên sâu (PREP/STAR/HORENSO, bắt từ đệm)',
      'Luyện đọc AI, Luyện viết AI & Shadowing hoàn toàn không giới hạn',
      'Hệ số tích Xu Kanji Smart: ×1.5',
    ],
  },
};

export interface ShopItemDefinition {
  code: ShopItemCode;
  title: string;
  description: string;
  costKs: number;
  unlockType: 'single_ticket' | 'pass_7d' | 'permanent_weekly';
  category: 'life' | 'work';
  allowedScenarios: readonly string[];
  effortHint: string;
}

export const SHOP_CATALOG: ShopItemDefinition[] = [
  {
    code: 'ticket_life',
    title: 'Vé 1 lượt Nói 3D — Đời sống',
    description: 'Mở 1 phiên lẻ tình huống Nhà hàng Nhật hoặc Khám bệnh Shinjuku.',
    costKs: 600,
    unlockType: 'single_ticket',
    category: 'life',
    allowedScenarios: LIFE_SCENARIO_IDS,
    effortHint: '~9 ngày học 30p/ngày + 5/5 câu',
  },
  {
    code: 'ticket_work',
    title: 'Vé 1 lượt Nói 3D — Công sở / PV cơ bản',
    description: 'Mở 1 phiên lẻ Họp Horenso, Làm thêm Baito hoặc Phỏng vấn Du học.',
    costKs: 1000,
    unlockType: 'single_ticket',
    category: 'work',
    allowedScenarios: WORK_SCENARIO_IDS,
    effortHint: '~14 ngày học 30p/ngày + 5/5 câu',
  },
  {
    code: 'pass_life_7d',
    title: 'Thẻ 7 ngày — 1 kịch bản Đời sống',
    description: 'Mở khóa 1 kịch bản Đời sống (Nhà hàng/Khám bệnh) trong 7 ngày, tối đa 1 lượt/ngày.',
    costKs: 2200,
    unlockType: 'pass_7d',
    category: 'life',
    allowedScenarios: LIFE_SCENARIO_IDS,
    effortHint: '~1 tháng cày liên tục',
  },
  {
    code: 'perm_life_weekly',
    title: 'Mở khóa vĩnh viễn — 1 kịch bản Đời sống',
    description: 'Mở lâu dài 1 kịch bản Đời sống (giới hạn 1 lượt/tuần, chấm cơ bản).',
    costKs: 4500,
    unlockType: 'permanent_weekly',
    category: 'life',
    allowedScenarios: LIFE_SCENARIO_IDS,
    effortHint: '~2 tháng cày liên tục',
  },
];

export class MembershipHttpError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getSecret(): string {
  return process.env.JWT_SECRET?.trim() || 'kanji-nest-dev-jwt-secret-change-in-prod';
}

export function getVietnamDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

export function sanitizeDateKey(candidate?: string): string {
  if (candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    const serverMs = new Date(`${getVietnamDateKey()}T12:00:00Z`).getTime();
    const clientMs = new Date(`${candidate}T12:00:00Z`).getTime();
    if (Number.isFinite(clientMs) && Math.abs(clientMs - serverMs) <= 86_400_000 * 1.5) {
      return candidate;
    }
  }
  return getVietnamDateKey();
}

export function getIsoWeekKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function isActiveStudyRoute(route: string, dailyChallengeActive?: boolean): boolean {
  if (dailyChallengeActive) return true;
  const normalized = (route || '').trim().split('?')[0] ?? '';
  if (!normalized) return false;
  return (
    normalized.startsWith('/practice') ||
    normalized.startsWith('/flashcards') ||
    normalized.startsWith('/lessons') ||
    normalized.startsWith('/lookup') ||
    normalized.startsWith('/games')
  );
}

let membershipTablesPromise: Promise<void> | null = null;

export function ensureMembershipTables(): Promise<void> {
  if (!membershipTablesPromise) {
    membershipTablesPromise = (async () => {
      await ensureStudyStateTables();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          user_id         uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          tier            text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'plus', 'pro')),
          billing_cycle   text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
          started_at      timestamptz NOT NULL DEFAULT now(),
          expires_at      timestamptz,
          demo_order_code text,
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now(),
          deleted_at      timestamptz
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_point_ledger (
          id              text PRIMARY KEY,
          user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          delta           integer NOT NULL,
          balance_after   integer NOT NULL CHECK (balance_after >= 0),
          reason_code     text NOT NULL,
          description     text NOT NULL,
          idempotency_key text UNIQUE,
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now(),
          deleted_at      timestamptz
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_point_ledger_user_created
        ON user_point_ledger(user_id, created_at DESC);
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_speaking_unlocks (
          id              text PRIMARY KEY,
          user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          scenario_id     text NOT NULL,
          unlock_type     text NOT NULL CHECK (unlock_type IN ('single_ticket', 'pass_7d', 'permanent_weekly')),
          remaining_uses  integer,
          expires_at      timestamptz,
          last_used_week  text,
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now(),
          deleted_at      timestamptz
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_user_speaking_unlocks_user_scenario
        ON user_speaking_unlocks(user_id, scenario_id);
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_feature_usage (
          user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          feature_key text NOT NULL,
          period_key  text NOT NULL,
          used_count  integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          deleted_at  timestamptz,
          PRIMARY KEY (user_id, feature_key, period_key)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_study_sessions (
          user_id           uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          active_session_id text NOT NULL,
          last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
          last_action_at    timestamptz NOT NULL DEFAULT now(),
          created_at        timestamptz NOT NULL DEFAULT now(),
          updated_at        timestamptz NOT NULL DEFAULT now(),
          deleted_at        timestamptz
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_ai_jobs (
          user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          feature_key   text NOT NULL CHECK (feature_key IN ('reading_ai', 'writing_ai')),
          status        text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ready', 'failed')),
          payload_meta  jsonb,
          result_json   jsonb,
          error_message text,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          deleted_at    timestamptz,
          PRIMARY KEY (user_id, feature_key)
        );
      `);
    })().catch((err) => {
      membershipTablesPromise = null;
      throw err;
    });
  }
  return membershipTablesPromise;
}

async function resolveActiveTier(
  queryable: { query: PoolClient['query'] },
  userId: string,
): Promise<{
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  startedAt: string | null;
  expiresAt: string | null;
  demoOrderCode: string | null;
}> {
  const res = await queryable.query<{
    tier: string;
    billing_cycle: string;
    started_at: Date;
    expires_at: Date | null;
    demo_order_code: string | null;
  }>(
    `SELECT tier, billing_cycle, started_at, expires_at, demo_order_code
     FROM user_subscriptions
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) {
    return {
      tier: 'free',
      billingCycle: 'monthly',
      startedAt: null,
      expiresAt: null,
      demoOrderCode: null,
    };
  }
  const expired = row.expires_at !== null && row.expires_at.getTime() < Date.now();
  const tier: SubscriptionTier =
    !expired && (row.tier === 'plus' || row.tier === 'pro') ? row.tier : 'free';
  return {
    tier,
    billingCycle: row.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
    startedAt: row.started_at?.toISOString() ?? null,
    expiresAt: row.expires_at?.toISOString() ?? null,
    demoOrderCode: row.demo_order_code ?? null,
  };
}

async function getKsBalance(queryable: { query: PoolClient['query'] }, userId: string): Promise<number> {
  const res = await queryable.query<{ total: string | number }>(
    `SELECT COALESCE(SUM(delta), 0) AS total
     FROM user_point_ledger
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  return Math.max(0, Number(res.rows[0]?.total ?? 0));
}

async function appendLedgerEntry(
  client: PoolClient,
  params: {
    userId: string;
    delta: number;
    reasonCode: string;
    description: string;
    idempotencyKey?: string | undefined;
  },
): Promise<{ applied: boolean; delta: number; balanceAfter: number }> {
  // Advisory lock per user inside transaction prevents race condition on balance check
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [params.userId]);

  if (params.idempotencyKey) {
    const dup = await client.query<{ delta: number; balance_after: number }>(
      `SELECT delta, balance_after
       FROM user_point_ledger
       WHERE idempotency_key = $1 AND deleted_at IS NULL`,
      [params.idempotencyKey],
    );
    if (dup.rows[0]) {
      return {
        applied: false,
        delta: Number(dup.rows[0].delta),
        balanceAfter: await getKsBalance(client, params.userId),
      };
    }
  }

  const current = await getKsBalance(client, params.userId);
  const nextBalance = current + params.delta;
  if (nextBalance < 0) {
    throw new MembershipHttpError(
      400,
      'INSUFFICIENT_KS',
      `Không đủ Xu Kanji Smart (hiện có ${current} KS, cần ${Math.abs(params.delta)} KS).`,
    );
  }

  const id = `ledger_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  await client.query(
    `INSERT INTO user_point_ledger (id, user_id, delta, balance_after, reason_code, description, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      params.userId,
      params.delta,
      nextBalance,
      params.reasonCode,
      params.description,
      params.idempotencyKey ?? null,
    ],
  );

  return { applied: true, delta: params.delta, balanceAfter: nextBalance };
}

function resolveGoalRewardBase(goalSeconds: number): { goalMinutes: number; baseKs: number } {
  const mins = Math.round(goalSeconds / 60);
  if (mins >= 60) return { goalMinutes: 60, baseKs: GOAL_REWARD_MAP[60]! };
  if (mins >= 30) return { goalMinutes: 30, baseKs: GOAL_REWARD_MAP[30]! };
  if (mins >= 15) return { goalMinutes: 15, baseKs: GOAL_REWARD_MAP[15]! };
  if (mins >= 10) return { goalMinutes: 10, baseKs: GOAL_REWARD_MAP[10]! };
  return { goalMinutes: 5, baseKs: GOAL_REWARD_MAP[5]! };
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

async function computeCurrentStreakInfo(
  queryable: { query: PoolClient['query'] },
  userId: string,
  todayKey: string,
): Promise<{ currentStreak: number; streakStartDate: string | null }> {
  const res = await queryable.query<{ study_date: string }>(
    `SELECT study_date
     FROM user_study_logs
     WHERE user_id = $1 AND deleted_at IS NULL AND seconds >= 60 AND study_date <= $2
     ORDER BY study_date ASC`,
    [userId, todayKey],
  );
  const set = new Set(res.rows.map((r) => r.study_date));
  let cursor = set.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
  if (!set.has(cursor)) {
    return { currentStreak: 0, streakStartDate: null };
  }
  let streak = 0;
  let startDate = cursor;
  while (set.has(cursor)) {
    streak += 1;
    startDate = cursor;
    cursor = shiftDateKey(cursor, -1);
  }
  return { currentStreak: streak, streakStartDate: startDate };
}

export interface ScenarioAccessInfo {
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

export async function getMembershipSummary(userId: string, dateKeyRaw?: string) {
  await ensureMembershipTables();
  const todayKey = sanitizeDateKey(dateKeyRaw);
  const weekKey = getIsoWeekKey(todayKey);

  const sub = await resolveActiveTier(pool, userId);
  const plan = PLAN_CATALOG[sub.tier];
  const ksBalance = await getKsBalance(pool, userId);

  const [usageRes, unlocksRes, todayStudyRes, profileRes, ledgerKeysRes, recentRes, streakInfo] =
    await Promise.all([
      pool.query<{ feature_key: string; period_key: string; used_count: number }>(
        `SELECT feature_key, period_key, used_count
         FROM user_feature_usage
         WHERE user_id = $1 AND deleted_at IS NULL AND period_key IN ($2, $3)`,
        [userId, weekKey, todayKey],
      ),
      pool.query<{
        id: string;
        scenario_id: string;
        unlock_type: string;
        remaining_uses: number | null;
        expires_at: Date | null;
        last_used_week: string | null;
      }>(
        `SELECT id, scenario_id, unlock_type, remaining_uses, expires_at, last_used_week
         FROM user_speaking_unlocks
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [userId],
      ),
      pool.query<{ seconds: number; goal_seconds: number }>(
        `SELECT seconds, goal_seconds
         FROM user_study_logs
         WHERE user_id = $1 AND study_date = $2 AND deleted_at IS NULL`,
        [userId, todayKey],
      ),
      pool.query<{ daily_minutes: number }>(
        `SELECT daily_minutes
         FROM user_learning_profiles
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId],
      ),
      pool.query<{ idempotency_key: string }>(
        `SELECT idempotency_key
         FROM user_point_ledger
         WHERE user_id = $1 AND deleted_at IS NULL AND idempotency_key IS NOT NULL`,
        [userId],
      ),
      pool.query<{
        id: string;
        delta: number;
        balance_after: number;
        reason_code: string;
        description: string;
        created_at: Date;
      }>(
        `SELECT id, delta, balance_after, reason_code, description, created_at
         FROM user_point_ledger
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 20`,
        [userId],
      ),
      computeCurrentStreakInfo(pool, userId, todayKey),
    ]);

  const usageMap = new Map<string, number>();
  for (const row of usageRes.rows) {
    usageMap.set(`${row.feature_key}:${row.period_key}`, Number(row.used_count) || 0);
  }

  const readingUsedWeek = usageMap.get(`reading_ai:${weekKey}`) ?? 0;
  const writingUsedWeek = usageMap.get(`writing_ai:${weekKey}`) ?? 0;
  const shadowingCustomToday = usageMap.get(`shadowing_custom:${todayKey}`) ?? 0;
  const speakingLifeToday = usageMap.get(`speaking_life:${todayKey}`) ?? 0;
  const speakingWorkToday = usageMap.get(`speaking_work:${todayKey}`) ?? 0;

  const ledgerKeys = new Set(ledgerKeysRes.rows.map((r) => r.idempotency_key));
  const goalSecs =
    Number(todayStudyRes.rows[0]?.goal_seconds) ||
    Math.max(5, Number(profileRes.rows[0]?.daily_minutes) || 30) * 60;
  const todaySeconds = Number(todayStudyRes.rows[0]?.seconds) || 0;
  const { goalMinutes, baseKs } = resolveGoalRewardBase(goalSecs);
  const rewardKs = Math.round(baseKs * plan.multiplier);
  const dailyGoalClaimed = ledgerKeys.has(`daily_goal:${userId}:${todayKey}`);
  const dailyChallengeClaimed = ledgerKeys.has(`daily_challenge:${userId}:${todayKey}`);

  const milestones = ([3, 7, 14, 30] as const).map((days) => {
    const milestoneKs = Math.round((STREAK_REWARD_MAP[days] ?? 0) * plan.multiplier);
    const key = streakInfo.streakStartDate
      ? `streak:${userId}:${streakInfo.streakStartDate}:${days}`
      : null;
    const claimed = key ? ledgerKeys.has(key) : false;
    const status: 'claimed' | 'claimable' | 'locked' = claimed
      ? 'claimed'
      : streakInfo.currentStreak >= days
        ? 'claimable'
        : 'locked';
    return {
      days,
      rewardKs: milestoneKs,
      status,
    };
  });

  const activeUnlocks = unlocksRes.rows.filter((u) => {
    if (u.unlock_type === 'single_ticket') return (u.remaining_uses ?? 0) > 0;
    if (u.unlock_type === 'pass_7d') return u.expires_at !== null && u.expires_at.getTime() > Date.now();
    return u.unlock_type === 'permanent_weekly';
  });

  const scenarioAccess: Record<string, ScenarioAccessInfo> = {};
  for (const sid of ALL_SCENARIO_IDS) {
    const isProOnly = (PRO_ONLY_SCENARIO_IDS as readonly string[]).includes(sid);
    const isLife = (LIFE_SCENARIO_IDS as readonly string[]).includes(sid);

    const matchingUnlocks = activeUnlocks.filter((u) => u.scenario_id === sid);
    const ticketCount = matchingUnlocks
      .filter((u) => u.unlock_type === 'single_ticket')
      .reduce((acc, u) => acc + (u.remaining_uses ?? 0), 0);
    const pass7d = matchingUnlocks.find((u) => u.unlock_type === 'pass_7d');
    const permWeekly = matchingUnlocks.find((u) => u.unlock_type === 'permanent_weekly');
    const pass7dDailyUsed = usageMap.get(`unlock_pass7d:${sid}:${todayKey}`) ?? 0;

    let allowed = false;
    let accessSource: ScenarioAccessInfo['accessSource'] = 'locked';
    let badgeLabel = 'Khóa · Cần vé hoặc Pro';
    let remainingToday: number | null = null;

    if (sub.tier === 'pro') {
      allowed = true;
      accessSource = 'pro';
      badgeLabel = 'Mở toàn bộ (Pro)';
      remainingToday = null;
    } else if (sub.tier === 'plus') {
      if (isProOnly) {
        allowed = false;
        accessSource = 'locked';
        badgeLabel = 'Độc quyền Pro AI';
      } else if (isLife) {
        const rem = Math.max(0, (plan.speakingLifePerDay ?? 3) - speakingLifeToday);
        remainingToday = rem;
        if (rem > 0) {
          allowed = true;
          accessSource = 'plus_quota';
          badgeLabel = `Plus · còn ${rem}/3 lượt hôm nay`;
        } else {
          badgeLabel = 'Hết 3 lượt Plus hôm nay';
        }
      } else {
        const rem = Math.max(0, (plan.speakingWorkPerDay ?? 1) - speakingWorkToday);
        remainingToday = rem;
        if (rem > 0) {
          allowed = true;
          accessSource = 'plus_quota';
          badgeLabel = `Plus · còn ${rem}/1 lượt hôm nay`;
        } else {
          badgeLabel = 'Hết 1 lượt Công sở hôm nay';
        }
      }
    }

    // Check KS unlocks as fallback (Free users, or Plus users whose daily quota hit 0 on non-Pro-only scenarios)
    if (!allowed && !isProOnly) {
      if (ticketCount > 0) {
        allowed = true;
        accessSource = 'free_ticket';
        badgeLabel = `Vé KS (còn ${ticketCount} lượt)`;
      } else if (pass7d && pass7dDailyUsed < 1) {
        allowed = true;
        accessSource = 'free_ticket';
        badgeLabel = 'Thẻ 7 ngày (còn 1 lượt hôm nay)';
        remainingToday = 1;
      } else if (permWeekly && permWeekly.last_used_week !== weekKey) {
        allowed = true;
        accessSource = 'free_ticket';
        badgeLabel = 'Mở khóa tuần (còn 1 lượt tuần)';
      } else if (sub.tier === 'free') {
        badgeLabel = isLife ? 'Khóa · Đổi 600 KS hoặc Plus' : 'Khóa · Đổi 1.000 KS hoặc Plus';
      }
    } else if (!allowed && isProOnly) {
      badgeLabel = 'Độc quyền Pro AI (không đổi KS)';
    }

    scenarioAccess[sid] = {
      scenarioId: sid,
      allowed,
      accessSource,
      badgeLabel,
      remainingToday,
      canUploadCv: plan.uploadCvAllowed,
      fullRubric: plan.fullRubricAllowed,
      proOnly: isProOnly,
      ticketCount,
      hasActivePass7d: Boolean(pass7d),
      hasPermanentWeekly: Boolean(permWeekly),
    };
  }

  return {
    todayKey,
    weekKey,
    subscription: {
      ...sub,
      planName: plan.name,
      multiplier: plan.multiplier,
    },
    ksBalance,
    usage: {
      readingUsedWeek,
      readingLimitWeek: plan.readingPerWeek,
      writingUsedWeek,
      writingLimitWeek: plan.writingPerWeek,
      shadowingCustomToday,
      shadowingLimitDay: plan.shadowingCustomPerDay,
      speakingLifeToday,
      speakingLifeLimitDay: plan.speakingLifePerDay,
      speakingWorkToday,
      speakingWorkLimitDay: plan.speakingWorkPerDay,
    },
    todayGoalStatus: {
      todaySeconds,
      goalSeconds: goalSecs,
      goalMinutes,
      rewardKs,
      eligible: todaySeconds >= goalSecs,
      claimed: dailyGoalClaimed,
    },
    todayChallengeClaimed: dailyChallengeClaimed,
    streakStatus: {
      currentStreak: streakInfo.currentStreak,
      streakStartDate: streakInfo.streakStartDate,
      milestones,
    },
    unlocks: activeUnlocks.map((u) => ({
      id: u.id,
      scenarioId: u.scenario_id,
      unlockType: u.unlock_type,
      remainingUses: u.remaining_uses,
      expiresAt: u.expires_at?.toISOString() ?? null,
      lastUsedWeek: u.last_used_week,
    })),
    recentTransactions: recentRes.rows.map((r) => ({
      id: r.id,
      delta: Number(r.delta),
      balanceAfter: Number(r.balance_after),
      reasonCode: r.reason_code,
      description: r.description,
      createdAt: r.created_at.toISOString(),
    })),
    scenarioAccess,
    plans: Object.values(PLAN_CATALOG),
    shopItems: SHOP_CATALOG,
  };
}

export async function activateDemoSubscription(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
  dateKey?: string,
) {
  await ensureMembershipTables();
  const demoOrderCode =
    tier === 'free'
      ? null
      : `KS-DEMO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const days = billingCycle === 'yearly' ? 365 : 30;
  const expiresAt = tier === 'free' ? null : new Date(Date.now() + days * 86_400_000);

  await pool.query(
    `INSERT INTO user_subscriptions (user_id, tier, billing_cycle, started_at, expires_at, demo_order_code, updated_at, deleted_at)
     VALUES ($1, $2, $3, now(), $4, $5, now(), NULL)
     ON CONFLICT (user_id) DO UPDATE SET
       tier = EXCLUDED.tier,
       billing_cycle = EXCLUDED.billing_cycle,
       started_at = now(),
       expires_at = EXCLUDED.expires_at,
       demo_order_code = EXCLUDED.demo_order_code,
       updated_at = now(),
       deleted_at = NULL`,
    [userId, tier, billingCycle, expiresAt, demoOrderCode],
  );

  return getMembershipSummary(userId, dateKey);
}

export async function redeemKsShopItem(
  userId: string,
  itemCode: ShopItemCode,
  scenarioId: string,
  dateKey?: string,
) {
  await ensureMembershipTables();
  const item = SHOP_CATALOG.find((s) => s.code === itemCode);
  if (!item) {
    throw new MembershipHttpError(400, 'INVALID_SHOP_ITEM', 'Vật phẩm đổi Xu KS không hợp lệ.');
  }
  if (!item.allowedScenarios.includes(scenarioId)) {
    throw new MembershipHttpError(
      400,
      'INVALID_SCENARIO_FOR_ITEM',
      'Vật phẩm này không áp dụng cho kịch bản đã chọn (Phỏng vấn Kỹ sư IT chỉ có ở gói Pro AI).',
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (item.unlockType === 'permanent_weekly') {
      const existingPerm = await client.query<{ id: string }>(
        `SELECT id FROM user_speaking_unlocks
         WHERE user_id = $1 AND scenario_id = $2 AND unlock_type = 'permanent_weekly' AND deleted_at IS NULL`,
        [userId, scenarioId],
      );
      if (existingPerm.rows[0]) {
        throw new MembershipHttpError(
          409,
          'ALREADY_UNLOCKED',
          'Bạn đã mở khóa vĩnh viễn kịch bản này rồi.',
        );
      }
    }

    await appendLedgerEntry(client, {
      userId,
      delta: -item.costKs,
      reasonCode: `shop:${item.code}`,
      description: `Đổi ${item.title} (${scenarioId})`,
    });

    const unlockId = `unlock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const remainingUses = item.unlockType === 'single_ticket' ? 1 : null;
    const expiresAt =
      item.unlockType === 'pass_7d' ? new Date(Date.now() + 7 * 86_400_000) : null;

    await client.query(
      `INSERT INTO user_speaking_unlocks (id, user_id, scenario_id, unlock_type, remaining_uses, expires_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), NULL)`,
      [unlockId, userId, scenarioId, item.unlockType, remainingUses, expiresAt],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getMembershipSummary(userId, dateKey);
}

export async function claimDailyGoalReward(userId: string, dateKeyRaw?: string) {
  await ensureMembershipTables();
  const dateKey = sanitizeDateKey(dateKeyRaw);
  const client = await pool.connect();
  let result: { applied: boolean; delta: number; balanceAfter: number };
  try {
    await client.query('BEGIN');
    const [studyRes, sub] = await Promise.all([
      client.query<{ seconds: number; goal_seconds: number }>(
        `SELECT seconds, goal_seconds
         FROM user_study_logs
         WHERE user_id = $1 AND study_date = $2 AND deleted_at IS NULL`,
        [userId, dateKey],
      ),
      resolveActiveTier(client, userId),
    ]);
    const row = studyRes.rows[0];
    if (!row || Number(row.seconds) < Number(row.goal_seconds)) {
      throw new MembershipHttpError(
        400,
        'GOAL_NOT_MET',
        'Bạn chưa hoàn thành 100% mục tiêu thời gian học hợp lệ hôm nay.',
      );
    }
    const { goalMinutes, baseKs } = resolveGoalRewardBase(Number(row.goal_seconds));
    const mult = PLAN_CATALOG[sub.tier].multiplier;
    const award = Math.round(baseKs * mult);

    result = await appendLedgerEntry(client, {
      userId,
      delta: award,
      reasonCode: 'daily_goal',
      description: `Hoàn thành mục tiêu ${goalMinutes} phút (${dateKey})`,
      idempotencyKey: `daily_goal:${userId}:${dateKey}`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const summary = await getMembershipSummary(userId, dateKey);
  return { ...result, summary };
}

export async function claimDailyChallengeReward(
  userId: string,
  correctCountRaw: number,
  dateKeyRaw?: string,
) {
  await ensureMembershipTables();
  const dateKey = sanitizeDateKey(dateKeyRaw);
  const correctCount = Math.max(0, Math.min(5, Math.round(Number(correctCountRaw) || 0)));
  const client = await pool.connect();
  let result: { applied: boolean; delta: number; balanceAfter: number };
  try {
    await client.query('BEGIN');
    const sub = await resolveActiveTier(client, userId);
    const mult = PLAN_CATALOG[sub.tier].multiplier;
    const base = correctCount * 4 + (correctCount === 5 ? 10 : 0);
    const award = Math.max(0, Math.round(base * mult));
    if (award <= 0) {
      await client.query('COMMIT');
      const summary = await getMembershipSummary(userId, dateKey);
      return { applied: false, delta: 0, balanceAfter: summary.ksBalance, summary };
    }
    result = await appendLedgerEntry(client, {
      userId,
      delta: award,
      reasonCode: 'daily_challenge',
      description: `Thử thách hôm nay (${correctCount}/5 câu đúng · ${dateKey})`,
      idempotencyKey: `daily_challenge:${userId}:${dateKey}`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const summary = await getMembershipSummary(userId, dateKey);
  return { ...result, summary };
}

export async function claimStreakMilestoneReward(
  userId: string,
  milestoneRaw: number,
  dateKeyRaw?: string,
) {
  await ensureMembershipTables();
  const dateKey = sanitizeDateKey(dateKeyRaw);
  const milestone = Math.round(Number(milestoneRaw));
  const base = STREAK_REWARD_MAP[milestone];
  if (!base) {
    throw new MembershipHttpError(400, 'INVALID_MILESTONE', 'Mốc chuỗi ngày không hợp lệ.');
  }

  const client = await pool.connect();
  let result: { applied: boolean; delta: number; balanceAfter: number };
  try {
    await client.query('BEGIN');
    const [streakInfo, sub] = await Promise.all([
      computeCurrentStreakInfo(client, userId, dateKey),
      resolveActiveTier(client, userId),
    ]);
    if (streakInfo.currentStreak < milestone || !streakInfo.streakStartDate) {
      throw new MembershipHttpError(
        400,
        'STREAK_NOT_REACHED',
        `Chuỗi hiện tại của bạn là ${streakInfo.currentStreak} ngày, chưa đạt mốc ${milestone} ngày.`,
      );
    }
    const award = Math.round(base * PLAN_CATALOG[sub.tier].multiplier);
    result = await appendLedgerEntry(client, {
      userId,
      delta: award,
      reasonCode: `streak_${milestone}`,
      description: `Đạt mốc chuỗi ${milestone} ngày liên tiếp`,
      idempotencyKey: `streak:${userId}:${streakInfo.streakStartDate}:${milestone}`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const summary = await getMembershipSummary(userId, dateKey);
  return { ...result, summary };
}

export type GameRewardKey = 'grammar_star' | 'grammar_blitz' | 'momo_boss' | 'sushi_match';

const GAME_REWARD_LABELS: Record<GameRewardKey, string> = {
  grammar_star: 'Game Xếp câu Dấu Sao ★',
  grammar_blitz: 'Game Bắn Trợ từ & Chia thể 60s',
  momo_boss: 'Công thành Momo (Solo Boss)',
  sushi_match: 'Quán Sushi Băng Chuyền',
};

export async function claimDailyGameReward(
  userId: string,
  gameKey: GameRewardKey,
  scoreRaw: number,
  dateKeyRaw?: string,
) {
  await ensureMembershipTables();
  const dateKey = sanitizeDateKey(dateKeyRaw);
  const score = Math.max(0, Math.round(Number(scoreRaw) || 0));
  if (score < 1) {
    throw new MembershipHttpError(
      400,
      'SCORE_TOO_LOW',
      'Hãy ghi ít nhất 1 điểm hợp lệ trong màn chơi để nhận thưởng Xu KS!',
    );
  }

  const client = await pool.connect();
  let result: { applied: boolean; delta: number; balanceAfter: number };
  try {
    await client.query('BEGIN');
    const sub = await resolveActiveTier(client, userId);
    const award = Math.round(8 * PLAN_CATALOG[sub.tier].multiplier);
    result = await appendLedgerEntry(client, {
      userId,
      delta: award,
      reasonCode: `game:${gameKey}`,
      description: `Thắng ${GAME_REWARD_LABELS[gameKey]} (${score}đ · ${dateKey})`,
      idempotencyKey: `game_daily:${userId}:${gameKey}:${dateKey}`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const summary = await getMembershipSummary(userId, dateKey);
  return { ...result, summary };
}

export async function recordStudyHeartbeat(
  userId: string,
  payload: {
    sessionId: string;
    route: string;
    dateKey?: string | undefined;
    elapsedSeconds: number;
    meaningfulActions: number;
    goalSeconds: number;
    dailyChallengeActive?: boolean | undefined;
  },
): Promise<{
  acceptedSeconds: number;
  totalSecondsToday: number;
  dailyGoalEligible: boolean;
  rejectedReason: string | null;
}> {
  await ensureMembershipTables();
  const todayKey = sanitizeDateKey(payload.dateKey);
  const goalSecs = Math.max(60, Math.min(28800, Math.round(payload.goalSeconds || 1800)));

  if (!isActiveStudyRoute(payload.route, payload.dailyChallengeActive)) {
    const cur = await pool.query<{ seconds: number }>(
      `SELECT seconds FROM user_study_logs WHERE user_id = $1 AND study_date = $2 AND deleted_at IS NULL`,
      [userId, todayKey],
    );
    const total = Number(cur.rows[0]?.seconds ?? 0);
    return {
      acceptedSeconds: 0,
      totalSecondsToday: total,
      dailyGoalEligible: total >= goalSecs,
      rejectedReason: 'non_study_route',
    };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessRes = await client.query<{
      active_session_id: string;
      last_heartbeat_at: Date;
      last_action_at: Date;
    }>(
      `SELECT active_session_id, last_heartbeat_at, last_action_at
       FROM user_study_sessions
       WHERE user_id = $1
       FOR UPDATE`,
      [userId],
    );
    const existing = sessRes.rows[0];
    const nowMs = Date.now();
    const hasActionNow = Math.max(0, Math.round(payload.meaningfulActions || 0)) > 0;

    let rejectedReason: string | null = null;
    let acceptedSeconds = 0;

    const requested = Math.max(0, Math.min(35, Math.round(payload.elapsedSeconds || 0)));

    if (!existing) {
      if (!hasActionNow) {
        rejectedReason = 'no_meaningful_action';
      } else {
        acceptedSeconds = Math.min(requested, 35);
      }
      await client.query(
        `INSERT INTO user_study_sessions (user_id, active_session_id, last_heartbeat_at, last_action_at, updated_at, deleted_at)
         VALUES ($1, $2, now(), now(), now(), NULL)`,
        [userId, payload.sessionId],
      );
    } else {
      const serverElapsed = Math.max(0, (nowMs - existing.last_heartbeat_at.getTime()) / 1000);
      const lastActionMs = hasActionNow ? nowMs : existing.last_action_at.getTime();
      const sinceActionMs = nowMs - lastActionMs;

      if (existing.active_session_id !== payload.sessionId && serverElapsed < 15) {
        rejectedReason = 'concurrent_session';
      } else if (!hasActionNow && sinceActionMs > 180_000) {
        rejectedReason = 'no_meaningful_action';
      } else {
        // Normal ~30s beat gets +2s clock jitter tolerance; faster beats strictly capped to floor(serverElapsed)
        const maxByClock =
          existing.active_session_id !== payload.sessionId
            ? 35
            : serverElapsed >= 25
              ? Math.ceil(serverElapsed) + 2
              : serverElapsed >= 3
                ? Math.floor(serverElapsed)
                : 0;
        acceptedSeconds = Math.max(0, Math.min(requested, maxByClock, 35));
        if (acceptedSeconds === 0 && requested > 0) {
          rejectedReason = 'rate_limited';
        }
      }

      await client.query(
        `UPDATE user_study_sessions
         SET active_session_id = $2,
             last_heartbeat_at = now(),
             last_action_at = CASE WHEN $3 THEN now() ELSE last_action_at END,
             updated_at = now(),
             deleted_at = NULL
         WHERE user_id = $1`,
        [userId, payload.sessionId, hasActionNow],
      );
    }

    const logRes = await client.query<{ seconds: number; goal_seconds: number }>(
      `INSERT INTO user_study_logs (user_id, study_date, seconds, goal_seconds, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, now(), NULL)
       ON CONFLICT (user_id, study_date) DO UPDATE SET
         seconds = user_study_logs.seconds + EXCLUDED.seconds,
         goal_seconds = EXCLUDED.goal_seconds,
         updated_at = now(),
         deleted_at = NULL
       RETURNING seconds, goal_seconds`,
      [userId, todayKey, acceptedSeconds, goalSecs],
    );

    await client.query('COMMIT');
    const totalSecondsToday = Number(logRes.rows[0]?.seconds ?? 0);
    const effectiveGoal = Number(logRes.rows[0]?.goal_seconds ?? goalSecs);
    return {
      acceptedSeconds,
      totalSecondsToday,
      dailyGoalEligible: totalSecondsToday >= effectiveGoal,
      rejectedReason,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface SpeakingSessionTokenPayload {
  userId: string;
  scenarioId: string;
  accessMode: SpeakingAccessMode;
  tier: SubscriptionTier;
  fullRubric: boolean;
  canUploadCv: boolean;
  exp: number;
}

export function signSpeakingSessionToken(payload: SpeakingSessionTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(`speaking:${encoded}`).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySpeakingSessionToken(token?: string | null): SpeakingSessionTokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(`speaking:${encoded}`).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SpeakingSessionTokenPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function incrementFeatureUsage(
  client: PoolClient,
  userId: string,
  featureKey: string,
  periodKey: string,
): Promise<number> {
  const res = await client.query<{ used_count: number }>(
    `INSERT INTO user_feature_usage (user_id, feature_key, period_key, used_count, updated_at, deleted_at)
     VALUES ($1, $2, $3, 1, now(), NULL)
     ON CONFLICT (user_id, feature_key, period_key) DO UPDATE SET
       used_count = user_feature_usage.used_count + 1,
       updated_at = now(),
       deleted_at = NULL
     RETURNING used_count`,
    [userId, featureKey, periodKey],
  );
  return Number(res.rows[0]?.used_count ?? 1);
}

export async function consumeSpeakingSessionAccess(
  userId: string,
  scenarioId: string,
  dateKeyRaw?: string,
) {
  await ensureMembershipTables();
  if (!(ALL_SCENARIO_IDS as readonly string[]).includes(scenarioId)) {
    throw new MembershipHttpError(400, 'INVALID_SCENARIO', 'Kịch bản luyện nói không tồn tại.');
  }
  const todayKey = sanitizeDateKey(dateKeyRaw);
  const weekKey = getIsoWeekKey(todayKey);
  const isProOnly = (PRO_ONLY_SCENARIO_IDS as readonly string[]).includes(scenarioId);
  const isLife = (LIFE_SCENARIO_IDS as readonly string[]).includes(scenarioId);

  const client = await pool.connect();
  let accessMode: SpeakingAccessMode = 'free_ticket';
  let tier: SubscriptionTier = 'free';
  let fullRubric = false;
  let canUploadCv = false;
  let viaDescription = '';

  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`speak:${userId}`]);

    const sub = await resolveActiveTier(client, userId);
    tier = sub.tier;
    const plan = PLAN_CATALOG[tier];
    fullRubric = plan.fullRubricAllowed;
    canUploadCv = plan.uploadCvAllowed;

    if (tier === 'pro') {
      accessMode = 'pro';
      viaDescription = 'Gói Pro AI (Không giới hạn)';
    } else if (isProOnly) {
      throw new MembershipHttpError(
        403,
        'PRO_REQUIRED',
        'Phỏng vấn Kỹ sư IT & Upload CV là tính năng độc quyền của gói Pro AI (không mở bằng Xu KS). Hãy nâng cấp gói Pro để sử dụng!',
      );
    } else {
      let granted = false;

      if (tier === 'plus') {
        const featureKey = isLife ? 'speaking_life' : 'speaking_work';
        const limit = isLife ? (plan.speakingLifePerDay ?? 3) : (plan.speakingWorkPerDay ?? 1);
        const curRes = await client.query<{ used_count: number }>(
          `SELECT used_count FROM user_feature_usage
           WHERE user_id = $1 AND feature_key = $2 AND period_key = $3 AND deleted_at IS NULL`,
          [userId, featureKey, todayKey],
        );
        const used = Number(curRes.rows[0]?.used_count ?? 0);
        if (used < limit) {
          await incrementFeatureUsage(client, userId, featureKey, todayKey);
          accessMode = 'plus_quota';
          viaDescription = `Gói Plus (${used + 1}/${limit} lượt hôm nay)`;
          granted = true;
        }
      }

      if (!granted) {
        // Fallback to KS unlocks in priority order: pass_7d (if daily use free) -> permanent_weekly -> single_ticket
        const unlocks = await client.query<{
          id: string;
          unlock_type: string;
          remaining_uses: number | null;
          expires_at: Date | null;
          last_used_week: string | null;
        }>(
          `SELECT id, unlock_type, remaining_uses, expires_at, last_used_week
           FROM user_speaking_unlocks
           WHERE user_id = $1 AND scenario_id = $2 AND deleted_at IS NULL
           ORDER BY created_at ASC
           FOR UPDATE`,
          [userId, scenarioId],
        );

        const pass7d = unlocks.rows.find(
          (u) => u.unlock_type === 'pass_7d' && u.expires_at !== null && u.expires_at.getTime() > Date.now(),
        );
        if (pass7d) {
          const usedToday = await client.query<{ used_count: number }>(
            `SELECT used_count FROM user_feature_usage
             WHERE user_id = $1 AND feature_key = $2 AND period_key = $3 AND deleted_at IS NULL`,
            [userId, `unlock_pass7d:${scenarioId}`, todayKey],
          );
          if (Number(usedToday.rows[0]?.used_count ?? 0) < 1) {
            await incrementFeatureUsage(client, userId, `unlock_pass7d:${scenarioId}`, todayKey);
            accessMode = 'free_ticket';
            viaDescription = 'Thẻ 7 ngày đổi bằng Xu KS (1 lượt/ngày)';
            granted = true;
          }
        }

        if (!granted) {
          const perm = unlocks.rows.find(
            (u) => u.unlock_type === 'permanent_weekly' && u.last_used_week !== weekKey,
          );
          if (perm) {
            await client.query(
              `UPDATE user_speaking_unlocks SET last_used_week = $2, updated_at = now() WHERE id = $1`,
              [perm.id, weekKey],
            );
            accessMode = 'free_ticket';
            viaDescription = 'Quyền mở khóa vĩnh viễn từ Xu KS (1 lượt/tuần)';
            granted = true;
          }
        }

        if (!granted) {
          const ticket = unlocks.rows.find(
            (u) => u.unlock_type === 'single_ticket' && (u.remaining_uses ?? 0) > 0,
          );
          if (ticket) {
            const nextUses = Math.max(0, (ticket.remaining_uses ?? 1) - 1);
            await client.query(
              `UPDATE user_speaking_unlocks
               SET remaining_uses = $2,
                   deleted_at = CASE WHEN $2 <= 0 THEN now() ELSE NULL END,
                   updated_at = now()
               WHERE id = $1`,
              [ticket.id, nextUses],
            );
            accessMode = 'free_ticket';
            viaDescription = 'Vé 1 lượt đổi bằng Xu KS';
            granted = true;
          }
        }
      }

      if (!granted) {
        const msg =
          tier === 'plus'
            ? `Bạn đã dùng hết lượt nói hôm nay của gói Plus cho nhóm này. Nâng cấp Pro AI để nói không giới hạn hoặc đổi thêm vé bằng Xu KS!`
            : `Kịch bản Luyện nói 3D AI đang khóa trên gói Miễn phí. Hãy nâng cấp gói Plus / Pro AI hoặc tích đủ ${isLife ? '600' : '1.000'} Xu KS để đổi vé lẻ!`;
        throw new MembershipHttpError(403, 'SPEAKING_LOCKED', msg);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const speakingSessionToken = signSpeakingSessionToken({
    userId,
    scenarioId,
    accessMode,
    tier,
    fullRubric,
    canUploadCv,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  return {
    allowed: true,
    speakingSessionToken,
    accessMode,
    tier,
    fullRubric,
    canUploadCv,
    viaDescription,
  };
}

export async function assertProForCvUpload(userId: string): Promise<void> {
  await ensureMembershipTables();
  const sub = await resolveActiveTier(pool, userId);
  if (sub.tier !== 'pro') {
    throw new MembershipHttpError(
      403,
      'PRO_REQUIRED_FOR_CV',
      'Upload & phân tích CV thật bằng AI chỉ khả dụng trên gói Pro AI.',
    );
  }
}

export async function checkFeatureQuota(
  userId: string,
  feature: 'reading_ai' | 'writing_ai',
  dateKeyRaw?: string,
): Promise<{ used: number; limit: number | null; weekKey: string }> {
  await ensureMembershipTables();
  const dateKey = sanitizeDateKey(dateKeyRaw);
  const weekKey = getIsoWeekKey(dateKey);

  const sub = await resolveActiveTier(pool, userId);
  const plan = PLAN_CATALOG[sub.tier];
  const limit = feature === 'reading_ai' ? plan.readingPerWeek : plan.writingPerWeek;

  const cur = await pool.query<{ used_count: number }>(
    `SELECT used_count FROM user_feature_usage
     WHERE user_id = $1 AND feature_key = $2 AND period_key = $3 AND deleted_at IS NULL`,
    [userId, feature, weekKey],
  );
  const used = Number(cur.rows[0]?.used_count ?? 0);

  if (limit !== null && used >= limit) {
    const label = feature === 'reading_ai' ? 'Luyện đọc AI' : 'Chấm bài Luyện viết AI';
    throw new MembershipHttpError(
      403,
      'QUOTA_EXCEEDED',
      `Bạn đã dùng hết ${used}/${limit} lượt ${label} trong tuần này (${plan.name}). Nâng cấp gói Plus hoặc Pro AI để tiếp tục!`,
    );
  }
  return { used, limit, weekKey };
}

export async function consumeFeatureQuota(
  userId: string,
  feature: 'reading_ai' | 'writing_ai',
  dateKeyRaw?: string,
): Promise<{ used: number; limit: number | null }> {
  await ensureMembershipTables();
  const dateKey = sanitizeDateKey(dateKeyRaw);
  const weekKey = getIsoWeekKey(dateKey);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`feat:${feature}:${userId}`]);
    const sub = await resolveActiveTier(client, userId);
    const plan = PLAN_CATALOG[sub.tier];
    const limit = feature === 'reading_ai' ? plan.readingPerWeek : plan.writingPerWeek;

    const cur = await client.query<{ used_count: number }>(
      `SELECT used_count FROM user_feature_usage
       WHERE user_id = $1 AND feature_key = $2 AND period_key = $3 AND deleted_at IS NULL`,
      [userId, feature, weekKey],
    );
    const used = Number(cur.rows[0]?.used_count ?? 0);
    if (limit !== null && used >= limit) {
      await client.query('COMMIT');
      return { used, limit };
    }

    const nextUsed = await incrementFeatureUsage(client, userId, feature, weekKey);
    await client.query('COMMIT');
    return { used: nextUsed, limit };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function assertFeatureQuota(
  userId: string,
  feature: 'reading_ai' | 'writing_ai',
  dateKeyRaw?: string,
): Promise<{ used: number; limit: number | null }> {
  await checkFeatureQuota(userId, feature, dateKeyRaw);
  return consumeFeatureQuota(userId, feature, dateKeyRaw);
}

export async function startAiJob(
  userId: string,
  feature: 'reading_ai' | 'writing_ai',
  payloadMeta: unknown,
): Promise<{ started: boolean; alreadyRunning?: boolean }> {
  await ensureMembershipTables();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`ai_job:${feature}:${userId}`]);
    const existing = await client.query<{ status: string; updated_at: Date }>(
      `SELECT status, updated_at
       FROM user_ai_jobs
       WHERE user_id = $1 AND feature_key = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [userId, feature],
    );
    const row = existing.rows[0];
    if (row && row.status === 'running' && Date.now() - row.updated_at.getTime() < 45_000) {
      await client.query('COMMIT');
      return { started: false, alreadyRunning: true };
    }

    await client.query(
      `INSERT INTO user_ai_jobs (user_id, feature_key, status, payload_meta, error_message, updated_at, deleted_at)
       VALUES ($1, $2, 'running', $3::jsonb, NULL, now(), NULL)
       ON CONFLICT (user_id, feature_key) DO UPDATE SET
         status = 'running',
         payload_meta = EXCLUDED.payload_meta,
         error_message = NULL,
         updated_at = now(),
         deleted_at = NULL`,
      [userId, feature, JSON.stringify(payloadMeta ?? {})],
    );
    await client.query('COMMIT');
    return { started: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function completeAiJob(
  userId: string,
  feature: 'reading_ai' | 'writing_ai',
  resultJson: unknown,
): Promise<void> {
  await ensureMembershipTables();
  await pool.query(
    `INSERT INTO user_ai_jobs (user_id, feature_key, status, result_json, error_message, updated_at, deleted_at)
     VALUES ($1, $2, 'ready', $3::jsonb, NULL, now(), NULL)
     ON CONFLICT (user_id, feature_key) DO UPDATE SET
       status = 'ready',
       result_json = EXCLUDED.result_json,
       error_message = NULL,
       updated_at = now(),
       deleted_at = NULL`,
    [userId, feature, JSON.stringify(resultJson)],
  );
}

export async function failAiJob(
  userId: string,
  feature: 'reading_ai' | 'writing_ai',
  errorMessage: string,
): Promise<void> {
  await ensureMembershipTables();
  await pool.query(
    `UPDATE user_ai_jobs
     SET status = 'failed', error_message = $3, updated_at = now()
     WHERE user_id = $1 AND feature_key = $2`,
    [userId, feature, errorMessage],
  );
}

export async function getLatestAiJob(
  userId: string,
  feature: 'reading_ai' | 'writing_ai',
): Promise<{
  status: 'none' | 'running' | 'ready' | 'failed';
  payloadMeta: unknown;
  result: unknown;
  errorMessage: string | null;
  updatedAt: string | null;
}> {
  await ensureMembershipTables();
  const res = await pool.query<{
    status: string;
    payload_meta: unknown;
    result_json: unknown;
    error_message: string | null;
    updated_at: Date;
  }>(
    `SELECT status, payload_meta, result_json, error_message, updated_at
     FROM user_ai_jobs
     WHERE user_id = $1 AND feature_key = $2 AND deleted_at IS NULL`,
    [userId, feature],
  );
  const row = res.rows[0];
  if (!row) {
    return {
      status: 'none',
      payloadMeta: null,
      result: null,
      errorMessage: null,
      updatedAt: null,
    };
  }
  let status = row.status as 'running' | 'ready' | 'failed';
  let errorMessage = row.error_message;
  if (status === 'running' && Date.now() - row.updated_at.getTime() > 60_000) {
    status = 'failed';
    errorMessage = errorMessage || 'Quá thời gian chờ phản hồi AI (không bị trừ lượt).';
    await pool.query(
      `UPDATE user_ai_jobs SET status = 'failed', error_message = $3, updated_at = now() WHERE user_id = $1 AND feature_key = $2`,
      [userId, feature, errorMessage],
    );
  }
  return {
    status,
    payloadMeta: row.payload_meta ?? null,
    result: row.result_json ?? null,
    errorMessage,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function checkUserIsPro(userId: string): Promise<boolean> {
  await ensureMembershipTables();
  const sub = await resolveActiveTier(pool, userId);
  return sub.tier === 'pro';
}
