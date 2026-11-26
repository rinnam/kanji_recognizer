import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { extractBearerUser, verifyToken } from '../services/auth.service.js';
import {
  checkFeatureQuota,
  completeAiJob,
  consumeFeatureQuota,
  failAiJob,
  getLatestAiJob,
  startAiJob,
} from '../services/membership.service.js';
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
  app.get('/ai/reading/latest', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user?.id) {
      return reply.status(401).send({ message: 'Vui lòng đăng nhập.' });
    }
    const job = await getLatestAiJob(user.id, 'reading_ai');
    return reply.send(job);
  });

  app.post('/ai/reading/generate', async (req, reply) => {
    const parsed = readingSchema.parse(req.body ?? {});
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const user = verifyToken(authHeader.slice(7).trim());
      if (user?.id) userId = user.id;
    }

    if (userId) {
      await checkFeatureQuota(userId, 'reading_ai');
      const job = await startAiJob(userId, 'reading_ai', {
        level: parsed.level,
        genre: parsed.genre,
        folderId: parsed.folderId,
      });
      if (!job.started) {
        return reply.status(202).send({
          status: 'running',
          message: 'AI đang sáng tác bài đọc bạn vừa yêu cầu...',
        });
      }
    }

    try {
      const result = await generateSrsReading({
        userId,
        level: parsed.level,
        genre: parsed.genre,
        folderId: parsed.folderId,
      });
      if (userId) {
        await completeAiJob(userId, 'reading_ai', result);
        const quota = await consumeFeatureQuota(userId, 'reading_ai');
        return reply.send({ ...result, quota });
      }
      return reply.send(result);
    } catch (err) {
      if (userId) {
        await failAiJob(
          userId,
          'reading_ai',
          err instanceof Error ? err.message : 'Không tạo được bài đọc AI (không bị trừ lượt).',
        ).catch(() => undefined);
      }
      throw err;
    }
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

  app.get('/ai/writing/latest', async (req, reply) => {
    const user = extractBearerUser(req.headers.authorization);
    if (!user?.id) {
      return reply.status(401).send({ message: 'Vui lòng đăng nhập.' });
    }
    const job = await getLatestAiJob(user.id, 'writing_ai');
    return reply.send(job);
  });

  app.post('/ai/writing/grade', async (req, reply) => {
    const parsed = writingSchema.parse(req.body ?? {});
    const user = extractBearerUser(req.headers.authorization);
    const userId = user?.id;

    if (userId) {
      await checkFeatureQuota(userId, 'writing_ai');
      const job = await startAiJob(userId, 'writing_ai', {
        promptTitle: parsed.promptTitle,
        style: parsed.style,
        text: parsed.text,
      });
      if (!job.started) {
        return reply.status(202).send({
          status: 'running',
          message: 'Sensei AI đang chấm bài bạn vừa gửi...',
        });
      }
    }

    try {
      const result = await gradeJapaneseWriting(parsed);
      if (userId) {
        await completeAiJob(userId, 'writing_ai', result);
        const quota = await consumeFeatureQuota(userId, 'writing_ai');
        return reply.send({ ...result, quota });
      }
      return reply.send(result);
    } catch (err) {
      if (userId) {
        await failAiJob(
          userId,
          'writing_ai',
          err instanceof Error ? err.message : 'Không chấm được bài viết AI (không bị trừ lượt).',
        ).catch(() => undefined);
      }
      throw err;
    }
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
