import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { extractBearerUser } from '../services/auth.service.js';
import {
  activateDemoSubscription,
  claimDailyChallengeReward,
  claimDailyGameReward,
  claimDailyGoalReward,
  claimStreakMilestoneReward,
  getMembershipSummary,
  recordStudyHeartbeat,
  redeemKsShopItem,
} from '../services/membership.service.js';

const demoCheckoutSchema = z.object({
  tier: z.enum(['free', 'plus', 'pro']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  dateKey: z.string().optional(),
});

const redeemSchema = z.object({
  itemCode: z.enum(['ticket_life', 'ticket_work', 'pass_life_7d', 'perm_life_weekly']),
  scenarioId: z.string().min(1),
  dateKey: z.string().optional(),
});

const dateOnlySchema = z.object({
  dateKey: z.string().optional(),
});

const challengeClaimSchema = z.object({
  correctCount: z.number().int().min(0).max(5),
  dateKey: z.string().optional(),
});

const streakClaimSchema = z.object({
  milestone: z.union([z.literal(3), z.literal(7), z.literal(14), z.literal(30)]),
  dateKey: z.string().optional(),
});

const gameRewardClaimSchema = z.object({
  gameKey: z.enum(['grammar_star', 'grammar_blitz', 'momo_boss', 'sushi_match']),
  score: z.number().int().min(1).max(100000),
  dateKey: z.string().optional(),
});

const heartbeatSchema = z.object({
  sessionId: z.string().min(4).max(120),
  route: z.string().default(''),
  dateKey: z.string().optional(),
  elapsedSeconds: z.number().int().min(0).max(60),
  meaningfulActions: z.number().int().min(0).max(500).default(0),
  goalSeconds: z.number().int().min(60).max(28800).default(1800),
  dailyChallengeActive: z.boolean().optional(),
});

export const membershipRoutes: FastifyPluginAsync = async (app) => {
  app.get('/membership/summary', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) return reply.status(401).send({ message: 'Vui lòng đăng nhập để xem gói và Xu KS.' });
    const q = (req.query ?? {}) as { dateKey?: string };
    const summary = await getMembershipSummary(user.id, q.dateKey);
    return reply.send(summary);
  });

  app.post('/membership/demo-checkout', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) return reply.status(401).send({ message: 'Vui lòng đăng nhập để nâng cấp gói.' });
    const parsed = demoCheckoutSchema.parse(req.body ?? {});
    const summary = await activateDemoSubscription(
      user.id,
      parsed.tier,
      parsed.billingCycle,
      parsed.dateKey,
    );
    return reply.send({ ok: true, summary });
  });

  app.post('/membership/redeem', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) return reply.status(401).send({ message: 'Vui lòng đăng nhập để đổi Xu KS.' });
    const parsed = redeemSchema.parse(req.body ?? {});
    const summary = await redeemKsShopItem(user.id, parsed.itemCode, parsed.scenarioId, parsed.dateKey);
    return reply.send({ ok: true, summary });
  });

  app.post('/membership/claim-daily-goal', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) return reply.status(401).send({ message: 'Vui lòng đăng nhập để nhận thưởng mục tiêu.' });
    const parsed = dateOnlySchema.parse(req.body ?? {});
    const result = await claimDailyGoalReward(user.id, parsed.dateKey);
    return reply.send(result);
  });

  app.post('/membership/claim-daily-challenge', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) return reply.status(401).send({ message: 'Vui lòng đăng nhập để nhận Xu KS.' });
    const parsed = challengeClaimSchema.parse(req.body ?? {});
    const result = await claimDailyChallengeReward(user.id, parsed.correctCount, parsed.dateKey);
    return reply.send(result);
  });

  app.post('/membership/claim-streak', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) return reply.status(401).send({ message: 'Vui lòng đăng nhập để nhận thưởng chuỗi.' });
    const parsed = streakClaimSchema.parse(req.body ?? {});
    const result = await claimStreakMilestoneReward(user.id, parsed.milestone, parsed.dateKey);
    return reply.send(result);
  });

  app.post('/membership/claim-game-reward', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) return reply.status(401).send({ message: 'Vui lòng đăng nhập để nhận thưởng Xu KS.' });
    const parsed = gameRewardClaimSchema.parse(req.body ?? {});
    const result = await claimDailyGameReward(user.id, parsed.gameKey, parsed.score, parsed.dateKey);
    return reply.send(result);
  });

  app.post('/study/heartbeat', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) return reply.status(401).send({ message: 'Chưa đăng nhập.' });
    const parsed = heartbeatSchema.parse(req.body ?? {});
    const result = await recordStudyHeartbeat(user.id, parsed);
    return reply.send(result);
  });
};
