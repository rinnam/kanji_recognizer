import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { extractBearerUser, verifyToken } from '../services/auth.service.js';
import { assertFeatureQuota } from '../services/membership.service.js';
import {
  extractFlashcardsWithAi,
  generateKanjiMnemonic,
  generateSrsReading,
  gradeJapaneseWriting,
  markReadingSrsReviewed,
} from '../services/ai-study.service.js';

const readingSchema = z.object({
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).default('N3'),
  genre: z.string().min(1).default('Đoản văn'),
  folderId: z.string().min(1).optional(),
});

const completeReadingSrsSchema = z.object({
  vocabularyIds: z.array(z.string().min(1)).min(1).max(20),
});

const writingSchema = z.object({
  promptTitle: z.string().min(1).default('Tự do viết tiếng Nhật'),
  style: z.string().min(1).default('Lịch sự (です・ます)'),
  text: z.string().trim().min(2, 'Nội dung bài viết quá ngắn'),
});

const extractCardsSchema = z.object({
  text: z.string().optional(),
  imageBase64: z.string().optional(),
  mimeType: z.string().optional(),
  maxCards: z.number().int().min(3).max(20).optional(),
});

const mnemonicSchema = z.object({
  word: z.string().trim().min(1),
  reading: z.string().optional(),
  meaning: z.string().optional(),
});

export const aiStudyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ai/reading/generate', async (req, reply) => {
    const parsed = readingSchema.parse(req.body ?? {});
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const user = verifyToken(authHeader.slice(7).trim());
      if (user?.id) userId = user.id;
    }
    let quota: { used: number; limit: number | null } | undefined;
    if (userId) {
      quota = await assertFeatureQuota(userId, 'reading_ai');
    }
    const result = await generateSrsReading({
      userId,
      level: parsed.level,
      genre: parsed.genre,
      folderId: parsed.folderId,
    });
    return reply.send(quota ? { ...result, quota } : result);
  });

  app.post('/ai/reading/complete-srs', async (req, reply) => {
    const parsed = completeReadingSrsSchema.parse(req.body ?? {});
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const user = verifyToken(authHeader.slice(7).trim());
      if (user?.id) userId = user.id;
    }
    const result = await markReadingSrsReviewed({
      userId,
      vocabularyIds: parsed.vocabularyIds,
    });
    return reply.send(result);
  });

  app.post('/ai/writing/grade', async (req, reply) => {
    const parsed = writingSchema.parse(req.body ?? {});
    const user = extractBearerUser(req.headers.authorization);
    let quota: { used: number; limit: number | null } | undefined;
    if (user?.id) {
      quota = await assertFeatureQuota(user.id, 'writing_ai');
    }
    const result = await gradeJapaneseWriting(parsed);
    return reply.send(quota ? { ...result, quota } : result);
  });

  app.post(
    '/ai/flashcards/extract',
    { bodyLimit: 12 * 1024 * 1024 },
    async (req, reply) => {
      const parsed = extractCardsSchema.parse(req.body ?? {});
      const cards = await extractFlashcardsWithAi(parsed);
      return reply.send({ cards });
    },
  );

  app.post('/ai/flashcards/mnemonic', async (req, reply) => {
    const parsed = mnemonicSchema.parse(req.body ?? {});
    const result = await generateKanjiMnemonic(parsed);
    return reply.send(result);
  });
};
