import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  INTERVIEW_SCENARIOS,
  parseUploadedCv,
  runInterviewTurn,
  transcribeInterviewAudio,
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
  fillersFromAudio: z.array(z.string()).optional(),
  audioBase64: z.string().optional(),
  audioMimeType: z.string().optional(),
  action: z.enum(['knock', 'bow', 'speak']).optional(),
});

const parseCvSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  base64Data: z.string().min(10),
});

const transcribeSchema = z.object({
  mimeType: z.string().min(1),
  base64Data: z.string().min(10),
  scenarioId: z.string().optional(),
  contextHint: z.string().optional(),
});

export const interviewRoutes: FastifyPluginAsync = async (app) => {
  app.get('/interview/scenarios', async (_req, reply) => {
    return reply.send({ scenarios: INTERVIEW_SCENARIOS });
  });

  app.post(
    '/interview/parse-cv',
    { bodyLimit: 12 * 1024 * 1024 },
    async (req, reply) => {
      const parsed = parseCvSchema.parse(req.body);
      const result = await parseUploadedCv(parsed);
      return reply.send(result);
    },
  );

  app.post(
    '/interview/transcribe-audio',
    { bodyLimit: 12 * 1024 * 1024 },
    async (req, reply) => {
      const parsed = transcribeSchema.parse(req.body);
      const result = await transcribeInterviewAudio(parsed);
      return reply.send(result);
    },
  );

  app.post(
    '/interview/turn',
    { bodyLimit: 12 * 1024 * 1024 },
    async (req, reply) => {
      const parsed = turnSchema.parse(req.body);
      const result = await runInterviewTurn(parsed);
      return reply.send(result);
    },
  );
};
