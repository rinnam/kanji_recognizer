import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { extractBearerUser } from '../services/auth.service.js';
import {
  INTERVIEW_SCENARIOS,
  parseUploadedCv,
  runInterviewTurn,
  transcribeInterviewAudio,
} from '../services/interview.service.js';
import {
  assertProForCvUpload,
  checkUserIsPro,
  consumeSpeakingSessionAccess,
  verifySpeakingSessionToken,
} from '../services/membership.service.js';

const startSessionSchema = z.object({
  scenarioId: z.string().min(1),
  dateKey: z.string().optional(),
});

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

  app.post('/interview/start-session', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập để mở phòng Luyện nói 3D AI.',
      });
    }
    const parsed = startSessionSchema.parse(req.body ?? {});
    const sessionInfo = await consumeSpeakingSessionAccess(
      user.id,
      parsed.scenarioId,
      parsed.dateKey,
    );
    return reply.send(sessionInfo);
  });

  app.post(
    '/interview/parse-cv',
    { bodyLimit: 12 * 1024 * 1024 },
    async (req, reply) => {
      const user = extractBearerUser(req.headers.authorization);
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Vui lòng đăng nhập để tải lên CV.',
        });
      }
      await assertProForCvUpload(user.id);
      const parsed = parseCvSchema.parse(req.body);
      const result = await parseUploadedCv(parsed);
      return reply.send(result);
    },
  );

  app.post(
    '/interview/transcribe-audio',
    { bodyLimit: 12 * 1024 * 1024 },
    async (req, reply) => {
      const sessionHeader = req.headers['x-speaking-session'];
      const speakingToken = verifySpeakingSessionToken(
        typeof sessionHeader === 'string' ? sessionHeader : undefined,
      );
      if (!speakingToken) {
        const user = extractBearerUser(req.headers.authorization);
        const isPro = user ? await checkUserIsPro(user.id) : false;
        if (!isPro) {
          return reply.status(403).send({
            error: 'UpgradeRequired',
            code: 'SPEAKING_LOCKED',
            message: 'Phiên Luyện nói 3D chưa được mở khóa hoặc đã hết hạn. Vui lòng nâng cấp gói hoặc đổi vé Xu KS.',
          });
        }
      }
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
      const sessionHeader = req.headers['x-speaking-session'];
      const speakingToken = verifySpeakingSessionToken(
        typeof sessionHeader === 'string' ? sessionHeader : undefined,
      );
      let rubricLimited = false;
      if (speakingToken) {
        if (speakingToken.scenarioId !== parsed.scenarioId) {
          return reply.status(403).send({
            error: 'InvalidSpeakingSession',
            code: 'SPEAKING_LOCKED',
            message: 'Vé phiên nói không khớp với kịch bản hiện tại.',
          });
        }
        rubricLimited = speakingToken.accessMode === 'free_ticket';
      } else {
        const user = extractBearerUser(req.headers.authorization);
        const isPro = user ? await checkUserIsPro(user.id) : false;
        if (!isPro) {
          return reply.status(403).send({
            error: 'UpgradeRequired',
            code: 'SPEAKING_LOCKED',
            message: 'Bạn cần gói Plus/Pro AI hoặc vé Xu KS hợp lệ để trò chuyện cùng AI 3D.',
          });
        }
      }
      const result = await runInterviewTurn(parsed);
      return reply.send({ ...result, rubricLimited });
    },
  );
};
