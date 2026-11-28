import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { appendAdminAuditLog } from '../utils/audit-log.js';
import { NotFoundError, ValidationFailedError } from '../utils/errors.js';
import { ensureAdminAndLessonTables } from './admin-schema.service.js';
import {
  ensureMembershipTables,
  getVietnamDateKey,
  PLAN_CATALOG,
  type BillingCycle,
} from './membership.service.js';

export type OrderStatusFilter = 'all' | 'paid' | 'pending' | 'refunded';
export type OrderKindFilter = 'all' | 'real' | 'demo';

export interface RevenueSeriesPoint {
  label: string;
  dateKey: string;
  amountVnd: number;
  orderCount: number;
}

function buildVietnamCalendarBuckets(days: 7 | 30 | 90 | 365): { dateKey: string; label: string }[] {
  const now = new Date();
  if (days === 365) {
    // 12 tháng gần nhất theo múi giờ Việt Nam
    const todayVn = getVietnamDateKey(now);
    const [yStr, mStr] = todayVn.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const buckets: { dateKey: string; label: string }[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(year, month - 1 - i, 1));
      const yy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      buckets.push({
        dateKey: `${yy}-${mm}`,
        label: `${mm}/${String(yy).slice(-2)}`,
      });
    }
    return buckets;
  }

  const buckets: { dateKey: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const dateKey = getVietnamDateKey(d);
    const parts = dateKey.split('-');
    buckets.push({
      dateKey,
      label: `${parts[2]}/${parts[1]}`,
    });
  }
  return buckets;
}

export async function getAdminOverview(params: {
  days: 7 | 30 | 90 | 365;
  kind: OrderKindFilter;
}) {
  await ensureMembershipTables();
  await ensureAdminAndLessonTables();

  const todayVn = getVietnamDateKey();
  const currentMonthVn = todayVn.slice(0, 7);
  const buckets = buildVietnamCalendarBuckets(params.days);
  const bucketMap = new Map<string, { amountVnd: number; orderCount: number }>();

  const kindWhere =
    params.kind === 'real' ? 'AND is_demo = false' : params.kind === 'demo' ? 'AND is_demo = true' : '';
  const customerFilterSql = `
    u.role = 'user' OR EXISTS (
      SELECT 1 FROM user_subscriptions s2
      WHERE s2.user_id = u.id
        AND s2.deleted_at IS NULL
        AND s2.tier IN ('plus', 'pro')
    )
  `;

  const [
    userStatsRes,
    activeTodayRes,
    tierRes,
    revenueRes,
    lessonCountRes,
    materialCountRes,
    seriesRes,
    auditRes,
  ] = await Promise.all([
    pool.query<{ total_users: number; new_users_30d: number }>(
      `SELECT
         COUNT(*)::int AS total_users,
         COUNT(*) FILTER (WHERE u.created_at >= now() - interval '30 days')::int AS new_users_30d
       FROM users u
       WHERE ${customerFilterSql}`,
    ),
    pool.query<{ active_today: number }>(
      `SELECT COUNT(DISTINCT l.user_id)::int AS active_today
       FROM user_study_logs l
       INNER JOIN users u ON u.id = l.user_id
       WHERE (${customerFilterSql})
         AND l.study_date = $1
         AND l.seconds > 0
         AND l.deleted_at IS NULL`,
      [todayVn],
    ),
    pool.query<{ effective_tier: string; cnt: number }>(
      `SELECT
         CASE
           WHEN s.deleted_at IS NULL
            AND s.tier IN ('plus', 'pro')
            AND (s.expires_at IS NULL OR s.expires_at >= now())
           THEN s.tier
           ELSE 'free'
         END AS effective_tier,
         COUNT(*)::int AS cnt
       FROM users u
       LEFT JOIN user_subscriptions s ON s.user_id = u.id
       WHERE ${customerFilterSql}
       GROUP BY 1`,
    ),
    pool.query<{
      revenue_real: string | number;
      revenue_demo: string | number;
      month_real: string | number;
      month_demo: string | number;
      paid_count: number;
    }>(
      `SELECT
         COALESCE(SUM(amount_vnd) FILTER (WHERE is_demo = false), 0) AS revenue_real,
         COALESCE(SUM(amount_vnd) FILTER (WHERE is_demo = true), 0) AS revenue_demo,
         COALESCE(SUM(amount_vnd) FILTER (WHERE is_demo = false AND to_char(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') = $1), 0) AS month_real,
         COALESCE(SUM(amount_vnd) FILTER (WHERE is_demo = true AND to_char(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') = $1), 0) AS month_demo,
         COUNT(*)::int AS paid_count
       FROM payment_orders
       WHERE status = 'paid' AND deleted_at IS NULL`,
      [currentMonthVn],
    ),
    pool.query<{ published_cnt: number; draft_cnt: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'published')::int AS published_cnt,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_cnt
       FROM lessons
       WHERE deleted_at IS NULL`,
    ),
    pool.query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt
       FROM lesson_materials m
       INNER JOIN lessons l ON l.id = m.lesson_id
       WHERE m.deleted_at IS NULL AND l.deleted_at IS NULL`,
    ),
    pool.query<{ bucket_key: string; amount_vnd: string | number; order_cnt: number }>(
      params.days === 365
        ? `SELECT
             to_char(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS bucket_key,
             COALESCE(SUM(amount_vnd), 0) AS amount_vnd,
             COUNT(*)::int AS order_cnt
           FROM payment_orders
           WHERE status = 'paid'
             AND deleted_at IS NULL
             AND COALESCE(paid_at, created_at) >= now() - interval '370 days'
             ${kindWhere}
           GROUP BY 1`
        : `SELECT
             to_char(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS bucket_key,
             COALESCE(SUM(amount_vnd), 0) AS amount_vnd,
             COUNT(*)::int AS order_cnt
           FROM payment_orders
           WHERE status = 'paid'
             AND deleted_at IS NULL
             AND COALESCE(paid_at, created_at) >= now() - make_interval(days => $1)
             ${kindWhere}
           GROUP BY 1`,
      params.days === 365 ? [] : [params.days + 1],
    ),
    pool.query<{
      id: string;
      action: string;
      target_type: string;
      target_id: string;
      detail: string;
      created_at: Date;
      admin_email: string | null;
      admin_name: string | null;
    }>(
      `SELECT
         a.id, a.action, a.target_type, a.target_id, a.detail, a.created_at,
         u.email AS admin_email,
         u.display_name AS admin_name
       FROM admin_audit_logs a
       LEFT JOIN users u ON u.id = a.admin_id
       ORDER BY a.created_at DESC
       LIMIT 10`,
    ),
  ]);

  const tierCounts = { free: 0, plus: 0, pro: 0 };
  for (const r of tierRes.rows) {
    if (r.effective_tier === 'plus') tierCounts.plus = Number(r.cnt) || 0;
    else if (r.effective_tier === 'pro') tierCounts.pro = Number(r.cnt) || 0;
    else tierCounts.free += Number(r.cnt) || 0;
  }

  for (const r of seriesRes.rows) {
    bucketMap.set(r.bucket_key, {
      amountVnd: Number(r.amount_vnd) || 0,
      orderCount: Number(r.order_cnt) || 0,
    });
  }

  const revenueSeries: RevenueSeriesPoint[] = buckets.map((b) => {
    const hit = bucketMap.get(b.dateKey);
    return {
      label: b.label,
      dateKey: b.dateKey,
      amountVnd: hit?.amountVnd ?? 0,
      orderCount: hit?.orderCount ?? 0,
    };
  });

  const rev = revenueRes.rows[0];
  const uStats = userStatsRes.rows[0];
  const lStats = lessonCountRes.rows[0];

  return {
    kpi: {
      totalUsers: Number(uStats?.total_users ?? 0),
      newUsers30d: Number(uStats?.new_users_30d ?? 0),
      activeUsersToday: Number(activeTodayRes.rows[0]?.active_today ?? 0),
      paidUsersCount: tierCounts.plus + tierCounts.pro,
      tierCounts,
      revenueRealVnd: Number(rev?.revenue_real ?? 0),
      revenueDemoVnd: Number(rev?.revenue_demo ?? 0),
      revenueThisMonthRealVnd: Number(rev?.month_real ?? 0),
      revenueThisMonthDemoVnd: Number(rev?.month_demo ?? 0),
      paidOrderCount: Number(rev?.paid_count ?? 0),
      publishedLessonCount: Number(lStats?.published_cnt ?? 0),
      draftLessonCount: Number(lStats?.draft_cnt ?? 0),
      materialCount: Number(materialCountRes.rows[0]?.cnt ?? 0),
    },
    revenueSeries,
    recentAuditLogs: auditRes.rows.map((a) => ({
      id: a.id,
      action: a.action,
      targetType: a.target_type,
      targetId: a.target_id,
      detail: a.detail,
      createdAt: a.created_at.toISOString(),
      adminEmail: a.admin_email ?? '',
      adminName: a.admin_name || a.admin_email || 'Admin',
    })),
  };
}

export async function listPaymentOrders(params: {
  status: OrderStatusFilter;
  kind: OrderKindFilter;
  q: string;
  limit: number;
  offset: number;
}) {
  await ensureMembershipTables();
  await ensureAdminAndLessonTables();

  const clauses: string[] = ['o.deleted_at IS NULL'];
  const values: unknown[] = [];

  if (params.status !== 'all') {
    values.push(params.status);
    clauses.push(`o.status = $${values.length}`);
  }
  if (params.kind === 'real') {
    clauses.push('o.is_demo = false');
  } else if (params.kind === 'demo') {
    clauses.push('o.is_demo = true');
  }
  const qClean = params.q.trim();
  if (qClean) {
    values.push(`%${qClean}%`);
    clauses.push(
      `(o.order_code ILIKE $${values.length} OR u.email ILIKE $${values.length} OR COALESCE(u.display_name, '') ILIKE $${values.length})`,
    );
  }

  const whereSql = clauses.join(' AND ');
  const countRes = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM payment_orders o
     INNER JOIN users u ON u.id = o.user_id
     WHERE ${whereSql}`,
    values,
  );

  const listValues = [...values, params.limit, params.offset];
  const rowsRes = await pool.query<{
    id: string;
    order_code: string;
    user_id: string;
    user_email: string | null;
    user_name: string | null;
    tier: string;
    billing_cycle: string;
    amount_vnd: number;
    status: string;
    is_demo: boolean;
    provider: string;
    note: string | null;
    paid_at: Date | null;
    created_at: Date;
  }>(
    `SELECT
       o.id, o.order_code, o.user_id,
       u.email AS user_email,
       u.display_name AS user_name,
       o.tier, o.billing_cycle, o.amount_vnd, o.status, o.is_demo, o.provider, o.note, o.paid_at, o.created_at
     FROM payment_orders o
     INNER JOIN users u ON u.id = o.user_id
     WHERE ${whereSql}
     ORDER BY o.created_at DESC
     LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    listValues,
  );

  return {
    total: Number(countRes.rows[0]?.total ?? 0),
    orders: rowsRes.rows.map((r) => ({
      id: r.id,
      orderCode: r.order_code,
      userId: r.user_id,
      userEmail: r.user_email ?? '',
      userName: r.user_name || r.user_email || 'Người dùng',
      tier: r.tier as 'plus' | 'pro',
      billingCycle: r.billing_cycle as BillingCycle,
      amountVnd: Number(r.amount_vnd) || 0,
      status: r.status as 'paid' | 'pending' | 'refunded',
      isDemo: Boolean(r.is_demo),
      provider: r.provider,
      note: r.note ?? '',
      paidAt: r.paid_at?.toISOString() ?? null,
      createdAt: r.created_at.toISOString(),
    })),
  };
}

export async function createManualOrder(
  adminId: string,
  input: {
    userId?: string | undefined;
    email?: string | undefined;
    tier: 'plus' | 'pro';
    billingCycle: BillingCycle;
    amountVnd?: number | undefined;
    status: 'paid' | 'pending';
    isDemo: boolean;
    provider: string;
    note: string;
  },
) {
  await ensureMembershipTables();
  await ensureAdminAndLessonTables();

  const targetRes = await pool.query<{ id: string; email: string | null }>(
    input.userId
      ? `SELECT id, email FROM users WHERE id = $1`
      : `SELECT id, email FROM users WHERE lower(email) = lower($1)`,
    [input.userId ?? input.email],
  );
  const targetUser = targetRes.rows[0];
  if (!targetUser) {
    throw new NotFoundError('Không tìm thấy tài khoản người dùng tương ứng.');
  }

  const plan = PLAN_CATALOG[input.tier];
  const amountVnd =
    input.amountVnd ??
    (input.billingCycle === 'yearly' ? plan.yearlyPriceVnd : plan.monthlyPriceVnd);
  const orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const orderCode = `${input.isDemo ? 'KS-DEMO-' : 'KS-ORD-'}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const days = input.billingCycle === 'yearly' ? 365 : 30;
  const expiresAt = new Date(Date.now() + days * 86_400_000);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO payment_orders
        (id, order_code, user_id, tier, billing_cycle, amount_vnd, status, is_demo, provider, note, created_by, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CASE WHEN $7 = 'paid' THEN now() ELSE NULL END)`,
      [
        orderId,
        orderCode,
        targetUser.id,
        input.tier,
        input.billingCycle,
        amountVnd,
        input.status,
        input.isDemo,
        input.provider,
        input.note,
        adminId,
      ],
    );

    if (input.status === 'paid') {
      await client.query(
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
        [targetUser.id, input.tier, input.billingCycle, expiresAt, orderCode],
      );
    }

    await appendAdminAuditLog(client, {
      adminId,
      action: 'order_create',
      targetType: 'payment_order',
      targetId: orderCode,
      detail: `Tạo đơn ${orderCode} (${input.tier}/${input.billingCycle}, ${amountVnd}đ, ${input.status}) cho ${targetUser.email ?? targetUser.id}`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { id: orderId, orderCode };
}

export async function updatePaymentOrderStatus(
  adminId: string,
  orderId: string,
  input: { status: 'paid' | 'pending' | 'refunded'; note?: string | undefined },
) {
  await ensureMembershipTables();
  await ensureAdminAndLessonTables();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query<{
      id: string;
      order_code: string;
      user_id: string;
      tier: 'plus' | 'pro';
      billing_cycle: BillingCycle;
      status: string;
      note: string | null;
    }>(
      `SELECT id, order_code, user_id, tier, billing_cycle, status, note
       FROM payment_orders
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [orderId],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new NotFoundError('Không tìm thấy đơn hàng.');
    }

    const nextNote = input.note !== undefined ? input.note : existing.note;
    await client.query(
      `UPDATE payment_orders
       SET status = $2::text,
           note = $3,
           paid_at = CASE WHEN $2::text = 'paid' THEN COALESCE(paid_at, now()) ELSE paid_at END,
           updated_at = now()
       WHERE id = $1`,
      [orderId, input.status, nextNote],
    );

    if (input.status === 'paid' && existing.status !== 'paid') {
      const days = existing.billing_cycle === 'yearly' ? 365 : 30;
      const expiresAt = new Date(Date.now() + days * 86_400_000);
      await client.query(
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
        [existing.user_id, existing.tier, existing.billing_cycle, expiresAt, existing.order_code],
      );
    }

    let revokedSub = false;
    if (input.status === 'refunded' && existing.status !== 'refunded') {
      const revokeRes = await client.query<{ user_id: string }>(
        `UPDATE user_subscriptions
         SET tier = 'free',
             billing_cycle = 'monthly',
             expires_at = NULL,
             demo_order_code = NULL,
             updated_at = now()
         WHERE user_id = $1
           AND deleted_at IS NULL
           AND demo_order_code = $2
         RETURNING user_id`,
        [existing.user_id, existing.order_code],
      );
      revokedSub = revokeRes.rows.length > 0;
    }

    await appendAdminAuditLog(client, {
      adminId,
      action: 'order_status_update',
      targetType: 'payment_order',
      targetId: existing.order_code,
      detail: `Đổi trạng thái đơn ${existing.order_code}: ${existing.status} → ${input.status}${revokedSub ? ' (đã thu hồi gói)' : ''}`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { ok: true };
}

export async function listAdminUsers(params: {
  q: string;
  role: 'all' | 'user' | 'admin';
  tier: 'all' | 'free' | 'plus' | 'pro';
  status: 'all' | 'active' | 'banned';
  limit: number;
  offset: number;
}) {
  await ensureMembershipTables();
  await ensureAdminAndLessonTables();

  const clauses: string[] = ['1 = 1'];
  const values: unknown[] = [];

  const qClean = params.q.trim();
  if (qClean) {
    values.push(`%${qClean}%`);
    clauses.push(
      `(COALESCE(u.email, '') ILIKE $${values.length} OR COALESCE(u.display_name, '') ILIKE $${values.length})`,
    );
  }
  if (params.role !== 'all') {
    values.push(params.role);
    clauses.push(`u.role = $${values.length}`);
  }
  if (params.status === 'banned') {
    clauses.push('u.is_banned = true');
  } else if (params.status === 'active') {
    clauses.push('u.is_banned = false');
  }

  const effectiveTierExpr = `
    CASE
      WHEN s.deleted_at IS NULL
       AND s.tier IN ('plus', 'pro')
       AND (s.expires_at IS NULL OR s.expires_at >= now())
      THEN s.tier
      ELSE 'free'
    END
  `;
  if (params.tier !== 'all') {
    if (params.role !== 'admin') {
      clauses.push(`u.role = 'user'`);
    }
    values.push(params.tier);
    clauses.push(`(${effectiveTierExpr}) = $${values.length}`);
  }

  const whereSql = clauses.join(' AND ');
  const countRes = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM users u
     LEFT JOIN user_subscriptions s ON s.user_id = u.id
     WHERE ${whereSql}`,
    values,
  );

  const nowMs = Date.now();
  const listValues = [...values, params.limit, params.offset];
  const rowsRes = await pool.query<{
    id: string;
    email: string | null;
    display_name: string | null;
    role: string;
    is_banned: boolean;
    created_at: Date;
    effective_tier: string;
    sub_tier: string | null;
    billing_cycle: string | null;
    sub_started_at: Date | null;
    expires_at: Date | null;
    sub_order_code: string | null;
    sub_deleted_at: Date | null;
    total_paid_vnd: string | number;
    jlpt_level: string | null;
    ks_balance: string | number;
    study_days: number;
    total_study_seconds: string | number;
    vocab_count: number;
  }>(
    `SELECT
       u.id,
       u.email,
       u.display_name,
       u.role,
       u.is_banned,
       u.created_at,
       ${effectiveTierExpr} AS effective_tier,
       s.tier AS sub_tier,
       s.billing_cycle,
       s.started_at AS sub_started_at,
       s.expires_at,
       s.demo_order_code AS sub_order_code,
       s.deleted_at AS sub_deleted_at,
       COALESCE(ord.total_paid_vnd, 0) AS total_paid_vnd,
       p.jlpt_level,
       COALESCE(l.balance, 0) AS ks_balance,
       COALESCE(st.study_days, 0)::int AS study_days,
       COALESCE(st.total_seconds, 0) AS total_study_seconds,
       COALESCE(vc.vocab_cnt, 0)::int AS vocab_count
     FROM users u
     LEFT JOIN user_subscriptions s ON s.user_id = u.id
     LEFT JOIN (
       SELECT user_id, COALESCE(SUM(amount_vnd) FILTER (WHERE status = 'paid' AND is_demo = false), 0) AS total_paid_vnd
       FROM payment_orders
       WHERE deleted_at IS NULL
       GROUP BY user_id
     ) ord ON ord.user_id = u.id
     LEFT JOIN user_learning_profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
     LEFT JOIN (
       SELECT user_id, SUM(delta) AS balance
       FROM user_point_ledger
       WHERE deleted_at IS NULL
       GROUP BY user_id
     ) l ON l.user_id = u.id
     LEFT JOIN (
       SELECT user_id, COUNT(*) FILTER (WHERE seconds > 0) AS study_days, SUM(seconds) AS total_seconds
       FROM user_study_logs
       WHERE deleted_at IS NULL
       GROUP BY user_id
     ) st ON st.user_id = u.id
     LEFT JOIN (
       SELECT owner_id, COUNT(*) AS vocab_cnt
       FROM vocabularies
       WHERE deleted_at IS NULL
       GROUP BY owner_id
     ) vc ON vc.owner_id = u.id
     WHERE ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    listValues,
  );

  return {
    total: Number(countRes.rows[0]?.total ?? 0),
    users: rowsRes.rows.map((r) => {
      const sub = classifySubscription({
        rawTier: r.sub_tier,
        billingCycle: r.billing_cycle,
        startedAt: r.sub_started_at,
        expiresAt: r.expires_at,
        deletedAt: r.sub_deleted_at,
        nowMs,
      });
      return {
        id: r.id,
        email: r.email ?? '',
        displayName: r.display_name || r.email?.split('@')[0] || 'Người dùng',
        role: (r.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        isBanned: Boolean(r.is_banned),
        createdAt: r.created_at.toISOString(),
        tier: r.effective_tier as 'free' | 'plus' | 'pro',
        rawTier: sub.rawTier,
        planName: sub.planName,
        billingCycle: sub.billingCycle,
        startedAt: sub.startedAt,
        expiresAt: sub.expiresAt,
        listPriceVnd: sub.listPriceVnd,
        subscriptionStatus: sub.subscriptionStatus,
        daysRemaining: sub.daysRemaining,
        isLifetime: sub.isLifetime,
        currentOrderCode: r.sub_order_code ?? null,
        totalPaidVnd: Number(r.total_paid_vnd) || 0,
        jlptLevel: r.jlpt_level ?? 'N3',
        ksBalance: Math.max(0, Number(r.ks_balance) || 0),
        studyDays: Number(r.study_days) || 0,
        totalStudyMinutes: Math.round((Number(r.total_study_seconds) || 0) / 60),
        vocabCount: Number(r.vocab_count) || 0,
      };
    }),
  };
}

export async function updateUserRole(
  adminId: string,
  targetUserId: string,
  role: 'user' | 'admin',
) {
  await ensureAdminAndLessonTables();
  if (targetUserId === adminId && role !== 'admin') {
    throw new ValidationFailedError('Bạn không thể tự hạ quyền quản trị của chính mình.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const targetRes = await client.query<{ id: string; email: string | null; role: string }>(
      `SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE`,
      [targetUserId],
    );
    const target = targetRes.rows[0];
    if (!target) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng.');
    }

    if (target.role === 'admin' && role === 'user') {
      const activeAdminRes = await client.query<{ cnt: number }>(
        `SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'admin' AND is_banned = false`,
      );
      if (Number(activeAdminRes.rows[0]?.cnt ?? 0) <= 1) {
        throw new ValidationFailedError('Hệ thống phải giữ lại ít nhất 1 quản trị viên đang hoạt động.');
      }
    }

    await client.query(`UPDATE users SET role = $2 WHERE id = $1`, [targetUserId, role]);
    await appendAdminAuditLog(client, {
      adminId,
      action: 'user_role_update',
      targetType: 'user',
      targetId: targetUserId,
      detail: `Đổi quyền ${target.email ?? targetUserId}: ${target.role} → ${role}`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { ok: true, role };
}

export async function updateUserBan(
  adminId: string,
  targetUserId: string,
  isBanned: boolean,
) {
  await ensureAdminAndLessonTables();
  if (targetUserId === adminId && isBanned) {
    throw new ValidationFailedError('Bạn không thể tự khóa tài khoản của chính mình.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const targetRes = await client.query<{ id: string; email: string | null; role: string }>(
      `SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE`,
      [targetUserId],
    );
    const target = targetRes.rows[0];
    if (!target) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng.');
    }

    if (target.role === 'admin' && isBanned) {
      const activeAdminRes = await client.query<{ cnt: number }>(
        `SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'admin' AND is_banned = false`,
      );
      if (Number(activeAdminRes.rows[0]?.cnt ?? 0) <= 1) {
        throw new ValidationFailedError('Không thể khóa quản trị viên cuối cùng đang hoạt động.');
      }
    }

    await client.query(`UPDATE users SET is_banned = $2 WHERE id = $1`, [targetUserId, isBanned]);
    await appendAdminAuditLog(client, {
      adminId,
      action: isBanned ? 'user_ban' : 'user_unban',
      targetType: 'user',
      targetId: targetUserId,
      detail: `${isBanned ? 'Khóa' : 'Mở khóa'} tài khoản ${target.email ?? targetUserId}`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { ok: true, isBanned };
}

export type SubscriptionStatusKind = 'active' | 'expiring_soon' | 'expired' | 'free';

export function classifySubscription(input: {
  rawTier: string | null;
  billingCycle: string | null;
  startedAt: Date | null;
  expiresAt: Date | null;
  deletedAt: Date | null;
  nowMs?: number;
}) {
  const nowMs = input.nowMs ?? Date.now();
  const isDeleted = input.deletedAt !== null;
  const rawTier: 'free' | 'plus' | 'pro' =
    !isDeleted && (input.rawTier === 'plus' || input.rawTier === 'pro') ? input.rawTier : 'free';
  const billingCycle: BillingCycle = input.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const plan = PLAN_CATALOG[rawTier];

  if (rawTier === 'free') {
    return {
      rawTier: 'free' as const,
      effectiveTier: 'free' as const,
      billingCycle: 'monthly' as BillingCycle,
      planName: plan.name,
      listPriceVnd: 0,
      monthlyEquivalentVnd: 0,
      startedAt: null as string | null,
      expiresAt: null as string | null,
      daysRemaining: null as number | null,
      isLifetime: false,
      subscriptionStatus: 'free' as SubscriptionStatusKind,
    };
  }

  const listPriceVnd = billingCycle === 'yearly' ? plan.yearlyPriceVnd : plan.monthlyPriceVnd;
  const monthlyEquivalentVnd =
    billingCycle === 'yearly' ? plan.yearlyPerMonthVnd : plan.monthlyPriceVnd;
  const startedAtIso = input.startedAt ? input.startedAt.toISOString() : null;
  const expiresAtDate = input.expiresAt;
  const expiresAtIso = expiresAtDate ? expiresAtDate.toISOString() : null;

  if (!expiresAtDate) {
    return {
      rawTier,
      effectiveTier: rawTier,
      billingCycle,
      planName: plan.name,
      listPriceVnd,
      monthlyEquivalentVnd,
      startedAt: startedAtIso,
      expiresAt: null,
      daysRemaining: null,
      isLifetime: true,
      subscriptionStatus: 'active' as SubscriptionStatusKind,
    };
  }

  const isLifetime = expiresAtDate.getUTCFullYear() >= 2090;
  const diffMs = expiresAtDate.getTime() - nowMs;
  const daysRemaining = isLifetime ? null : Math.ceil(diffMs / 86_400_000);

  let effectiveTier: 'free' | 'plus' | 'pro' = rawTier;
  let subscriptionStatus: SubscriptionStatusKind = 'active';
  if (diffMs < 0) {
    effectiveTier = 'free';
    subscriptionStatus = 'expired';
  } else if (!isLifetime && daysRemaining !== null && daysRemaining <= 7) {
    subscriptionStatus = 'expiring_soon';
  }

  return {
    rawTier,
    effectiveTier,
    billingCycle,
    planName: plan.name,
    listPriceVnd,
    monthlyEquivalentVnd,
    startedAt: startedAtIso,
    expiresAt: expiresAtIso,
    daysRemaining,
    isLifetime,
    subscriptionStatus,
  };
}

interface RawCustomerSubRow {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  is_banned: boolean;
  created_at: Date;
  sub_tier: string | null;
  sub_cycle: string | null;
  sub_started_at: Date | null;
  sub_expires_at: Date | null;
  sub_order_code: string | null;
  sub_deleted_at: Date | null;
  last_order_code: string | null;
  last_paid_amount_vnd: string | number | null;
  last_paid_at: Date | null;
  last_provider: string | null;
  last_is_demo: boolean | null;
  total_paid_vnd: string | number;
  total_demo_vnd: string | number;
  paid_order_count: number;
}

function mapCustomerSubscriptionRow(r: RawCustomerSubRow, nowMs: number) {
  const meta = classifySubscription({
    rawTier: r.sub_tier,
    billingCycle: r.sub_cycle,
    startedAt: r.sub_started_at,
    expiresAt: r.sub_expires_at,
    deletedAt: r.sub_deleted_at,
    nowMs,
  });

  return {
    userId: r.id,
    email: r.email ?? '',
    displayName: r.display_name || r.email?.split('@')[0] || 'Người dùng',
    role: (r.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
    isBanned: Boolean(r.is_banned),
    userCreatedAt: r.created_at.toISOString(),
    tier: meta.rawTier,
    effectiveTier: meta.effectiveTier,
    planName: meta.planName,
    billingCycle: meta.billingCycle,
    listPriceVnd: meta.listPriceVnd,
    monthlyEquivalentVnd: meta.monthlyEquivalentVnd,
    startedAt: meta.startedAt,
    expiresAt: meta.expiresAt,
    daysRemaining: meta.daysRemaining,
    isLifetime: meta.isLifetime,
    subscriptionStatus: meta.subscriptionStatus,
    currentOrderCode: r.sub_order_code ?? r.last_order_code ?? null,
    lastOrderCode: r.last_order_code ?? null,
    lastPaidAmountVnd:
      r.last_paid_amount_vnd !== null && r.last_paid_amount_vnd !== undefined
        ? Number(r.last_paid_amount_vnd)
        : null,
    lastPaidAt: r.last_paid_at ? r.last_paid_at.toISOString() : null,
    lastProvider: r.last_provider ?? null,
    lastIsDemo: r.last_is_demo ?? null,
    totalPaidVnd: Number(r.total_paid_vnd) || 0,
    totalDemoVnd: Number(r.total_demo_vnd) || 0,
    paidOrderCount: Number(r.paid_order_count) || 0,
  };
}

const CUSTOMER_SUBSCRIPTION_BASE_SQL = `
  SELECT
    u.id,
    u.email,
    u.display_name,
    u.role,
    u.is_banned,
    u.created_at,
    s.tier AS sub_tier,
    s.billing_cycle AS sub_cycle,
    s.started_at AS sub_started_at,
    s.expires_at AS sub_expires_at,
    s.demo_order_code AS sub_order_code,
    s.deleted_at AS sub_deleted_at,
    last_ord.order_code AS last_order_code,
    last_ord.amount_vnd AS last_paid_amount_vnd,
    last_ord.paid_at AS last_paid_at,
    last_ord.provider AS last_provider,
    last_ord.is_demo AS last_is_demo,
    COALESCE(ord_agg.total_paid_vnd, 0) AS total_paid_vnd,
    COALESCE(ord_agg.total_demo_vnd, 0) AS total_demo_vnd,
    COALESCE(ord_agg.paid_order_count, 0)::int AS paid_order_count
  FROM users u
  LEFT JOIN user_subscriptions s ON s.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT po.order_code, po.amount_vnd, COALESCE(po.paid_at, po.created_at) AS paid_at, po.provider, po.is_demo
    FROM payment_orders po
    WHERE po.user_id = u.id AND po.status = 'paid' AND po.deleted_at IS NULL
    ORDER BY COALESCE(po.paid_at, po.created_at) DESC, po.created_at DESC
    LIMIT 1
  ) last_ord ON true
  LEFT JOIN (
    SELECT
      user_id,
      COALESCE(SUM(amount_vnd) FILTER (WHERE status = 'paid' AND is_demo = false), 0) AS total_paid_vnd,
      COALESCE(SUM(amount_vnd) FILTER (WHERE status = 'paid' AND is_demo = true), 0) AS total_demo_vnd,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_order_count
    FROM payment_orders
    WHERE deleted_at IS NULL
    GROUP BY user_id
  ) ord_agg ON ord_agg.user_id = u.id
`;

export async function listAdminSubscriptions(params: {
  q: string;
  status: 'all' | 'active' | 'expiring_soon' | 'expired' | 'free';
  tier: 'all' | 'free' | 'plus' | 'pro';
  cycle: 'all' | 'monthly' | 'yearly';
  sort: 'expires_asc' | 'started_desc' | 'spent_desc';
  limit: number;
  offset: number;
}) {
  await ensureMembershipTables();
  await ensureAdminAndLessonTables();

  const rowsRes = await pool.query<RawCustomerSubRow>(
    `${CUSTOMER_SUBSCRIPTION_BASE_SQL}
     WHERE u.role = 'user' OR (s.deleted_at IS NULL AND s.tier IN ('plus', 'pro'))`,
  );

  const nowMs = Date.now();
  const allMapped = rowsRes.rows.map((r) => mapCustomerSubscriptionRow(r, nowMs));

  let activePaidCount = 0;
  let activePlusCount = 0;
  let activeProCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;
  let freeCount = 0;
  let estimatedMrrVnd = 0;
  let totalRevenueCollectedVnd = 0;

  for (const row of allMapped) {
    totalRevenueCollectedVnd += row.totalPaidVnd;
    if (row.subscriptionStatus === 'active' || row.subscriptionStatus === 'expiring_soon') {
      activePaidCount += 1;
      estimatedMrrVnd += row.monthlyEquivalentVnd;
      if (row.tier === 'plus') activePlusCount += 1;
      if (row.tier === 'pro') activeProCount += 1;
      if (row.subscriptionStatus === 'expiring_soon') expiringSoonCount += 1;
    } else if (row.subscriptionStatus === 'expired') {
      expiredCount += 1;
    } else {
      freeCount += 1;
    }
  }

  const qLower = params.q.trim().toLowerCase();
  const filtered = allMapped.filter((row) => {
    if (qLower) {
      const hay = `${row.displayName} ${row.email} ${row.currentOrderCode ?? ''} ${row.lastOrderCode ?? ''}`.toLowerCase();
      if (!hay.includes(qLower)) return false;
    }
    if (params.status !== 'all' && row.subscriptionStatus !== params.status) return false;
    if (params.tier !== 'all' && row.tier !== params.tier) return false;
    if (params.cycle !== 'all' && row.tier !== 'free' && row.billingCycle !== params.cycle) return false;
    return true;
  });

  const statusRank = (row: (typeof filtered)[number]): number => {
    if (row.subscriptionStatus === 'expired') return 0;
    if (row.subscriptionStatus === 'expiring_soon') return 1;
    if (row.subscriptionStatus === 'active' && !row.isLifetime) return 2;
    if (row.subscriptionStatus === 'active') return 3;
    return 4;
  };

  filtered.sort((a, b) => {
    if (params.sort === 'started_desc') {
      const sa = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const sb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      if (sb !== sa) return sb - sa;
      return new Date(b.userCreatedAt).getTime() - new Date(a.userCreatedAt).getTime();
    }
    if (params.sort === 'spent_desc') {
      if (b.totalPaidVnd !== a.totalPaidVnd) return b.totalPaidVnd - a.totalPaidVnd;
      if (b.totalDemoVnd !== a.totalDemoVnd) return b.totalDemoVnd - a.totalDemoVnd;
      const sa = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const sb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return sb - sa;
    }

    const ra = statusRank(a);
    const rb = statusRank(b);
    if (ra !== rb) return ra - rb;
    const ea = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
    const eb = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (ea !== eb) return ea - eb;
    return b.totalPaidVnd - a.totalPaidVnd;
  });

  return {
    summary: {
      totalCustomers: allMapped.length,
      activePaidCount,
      activePlusCount,
      activeProCount,
      expiringSoonCount,
      expiredCount,
      freeCount,
      estimatedMrrVnd,
      totalRevenueCollectedVnd,
    },
    planCatalog: {
      plus: {
        name: PLAN_CATALOG.plus.name,
        monthlyPriceVnd: PLAN_CATALOG.plus.monthlyPriceVnd,
        yearlyPriceVnd: PLAN_CATALOG.plus.yearlyPriceVnd,
        yearlyPerMonthVnd: PLAN_CATALOG.plus.yearlyPerMonthVnd,
      },
      pro: {
        name: PLAN_CATALOG.pro.name,
        monthlyPriceVnd: PLAN_CATALOG.pro.monthlyPriceVnd,
        yearlyPriceVnd: PLAN_CATALOG.pro.yearlyPriceVnd,
        yearlyPerMonthVnd: PLAN_CATALOG.pro.yearlyPerMonthVnd,
      },
    },
    total: filtered.length,
    subscriptions: filtered.slice(params.offset, params.offset + params.limit),
  };
}

export async function getAdminUserSubscriptionDetail(userId: string) {
  await ensureMembershipTables();
  await ensureAdminAndLessonTables();

  const [subRes, ordersRes, auditRes] = await Promise.all([
    pool.query<RawCustomerSubRow>(`${CUSTOMER_SUBSCRIPTION_BASE_SQL} WHERE u.id = $1`, [userId]),
    pool.query<{
      id: string;
      order_code: string;
      tier: string;
      billing_cycle: string;
      amount_vnd: number;
      status: string;
      is_demo: boolean;
      provider: string;
      note: string | null;
      paid_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, order_code, tier, billing_cycle, amount_vnd, status, is_demo, provider, note, paid_at, created_at
       FROM payment_orders
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    ),
    pool.query<{
      id: string;
      action: string;
      detail: string;
      created_at: Date;
      admin_email: string | null;
      admin_name: string | null;
    }>(
      `SELECT l.id, l.action, l.detail, l.created_at, u.email AS admin_email, u.display_name AS admin_name
       FROM admin_audit_logs l
       INNER JOIN users u ON u.id = l.admin_id
       WHERE l.target_type = 'user' AND l.target_id = $1
       ORDER BY l.created_at DESC
       LIMIT 20`,
      [userId],
    ),
  ]);

  const row = subRes.rows[0];
  if (!row) {
    throw new NotFoundError('Không tìm thấy tài khoản người dùng.');
  }

  return {
    subscription: mapCustomerSubscriptionRow(row, Date.now()),
    orders: ordersRes.rows.map((o) => ({
      id: o.id,
      orderCode: o.order_code,
      tier: o.tier as 'plus' | 'pro',
      billingCycle: (o.billing_cycle === 'yearly' ? 'yearly' : 'monthly') as BillingCycle,
      amountVnd: Number(o.amount_vnd) || 0,
      status: o.status as 'paid' | 'pending' | 'refunded',
      isDemo: Boolean(o.is_demo),
      provider: o.provider,
      note: o.note ?? '',
      paidAt: o.paid_at?.toISOString() ?? null,
      createdAt: o.created_at.toISOString(),
    })),
    auditLogs: auditRes.rows.map((a) => ({
      id: a.id,
      action: a.action,
      detail: a.detail,
      createdAt: a.created_at.toISOString(),
      adminName: a.admin_name || a.admin_email || 'Admin',
    })),
  };
}
