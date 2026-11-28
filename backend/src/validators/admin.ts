import { z } from 'zod';

export const adminOverviewQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((v): v is 7 | 30 | 90 | 365 => v === 7 || v === 30 || v === 90 || v === 365, {
      message: 'days phải là 7, 30, 90 hoặc 365',
    })
    .default(30),
  kind: z.enum(['all', 'real', 'demo']).default('all'),
});

export const adminOrdersQuerySchema = z.object({
  status: z.enum(['all', 'paid', 'pending', 'refunded']).default('all'),
  kind: z.enum(['all', 'real', 'demo']).default('all'),
  q: z.string().trim().max(120).optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminCreateOrderSchema = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().trim().email().optional(),
    tier: z.enum(['plus', 'pro']),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
    amountVnd: z.number().int().min(0).max(100_000_000).optional(),
    status: z.enum(['paid', 'pending']).default('paid'),
    isDemo: z.boolean().default(false),
    provider: z.string().trim().min(1).max(50).default('manual'),
    note: z.string().trim().max(500).optional().default(''),
  })
  .refine((v) => Boolean(v.userId || v.email), {
    message: 'Cần cung cấp userId hoặc email người dùng.',
  });

export const adminUpdateOrderSchema = z.object({
  status: z.enum(['paid', 'pending', 'refunded']),
  note: z.string().trim().max(500).optional(),
});

export const adminUsersQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  role: z.enum(['all', 'user', 'admin']).default('all'),
  tier: z.enum(['all', 'free', 'plus', 'pro']).default('all'),
  status: z.enum(['all', 'active', 'banned']).default('all'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminUpdateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const adminUpdateUserBanSchema = z.object({
  isBanned: z.boolean(),
});

export const adminSetSubscriptionSchema = z.object({
  tier: z.enum(['free', 'plus', 'pro']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  mode: z.enum(['replace', 'extend']).default('replace'),
  durationDays: z.number().int().min(1).max(3650).optional(),
  recordOrder: z.boolean().default(false),
  amountVnd: z.number().int().min(0).max(100_000_000).optional(),
  isDemo: z.boolean().default(false),
  provider: z.string().trim().min(1).max(50).optional().default('bank_transfer'),
  startedAt: z.string().trim().max(40).optional(),
  expiresAt: z.string().trim().max(40).optional(),
  note: z.string().trim().max(500).optional().default(''),
});

export const adminSubscriptionsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  status: z.enum(['all', 'active', 'expiring_soon', 'expired', 'free']).default('all'),
  tier: z.enum(['all', 'free', 'plus', 'pro']).default('all'),
  cycle: z.enum(['all', 'monthly', 'yearly']).default('all'),
  sort: z.enum(['expires_asc', 'started_desc', 'spent_desc']).default('expires_asc'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminAdjustPointsSchema = z.object({
  delta: z.number().int().min(-1_000_000).max(1_000_000).refine((v) => v !== 0, {
    message: 'Số Xu thay đổi phải khác 0.',
  }),
  reason: z.string().trim().min(2).max(240),
});
