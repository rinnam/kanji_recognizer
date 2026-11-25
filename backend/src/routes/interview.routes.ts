import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  INTERVIEW_SCENARIOS,
  runInterviewTurn,
} from '../services/interview.service.js';

const turnSchema = z.object({
  scenarioId: z.string().min(1),
  stage: z.enum([
    'jikoshokai',
    'jiko_pr',
    'cv_q1',
    'cv_q2',
    'cv_q3',
    'reverse_question',
    'closing',
  ]),
  history: z
    .array(
      z.object({
        role: z.enum(['interviewer', 'candidate']),
        text: z.string(),
      }),
    )
    .default([]),
  userMessage: z.string().default(''),
  cvSummary: z.string().optional(),
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
