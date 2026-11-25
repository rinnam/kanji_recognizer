import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  INTERVIEW_SCENARIOS,
  runInterviewTurn,
} from '../services/interview.service.js';

const turnSchema = z.object({
  scenarioId: z.string().min(1),
  stage: z.enum(['entrance', 'self_intro', 'motivation', 'situational', 'closing']),
  history: z
    .array(
      z.object({
        role: z.enum(['interviewer', 'candidate']),
        text: z.string(),
      }),
    )
    .default([]),
  userMessage: z.string().default(''),
  action: z.enum(['knock', 'bow', 'speak']).optional(),
});

export const interviewRoutes: FastifyPluginAsync = async (app) => {
  app.get('/interview/scenarios', async (_req, reply) => {
    return reply.send({ scenarios: INTERVIEW_SCENARIOS });
  });

  app.post('/interview/turn', async (req, reply) => {
    const parsed = turnSchema.parse(req.body);
    const result = await runInterviewTurn(parsed);
    return reply.send(result);
  });
};
