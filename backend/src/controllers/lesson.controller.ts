import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  resolveAuthenticatedToken,
  resolveAuthenticatedUser,
} from '../services/auth.service.js';
import {
  getPublicLessonDetail,
  listPublicLessons,
  resolveMaterialDownload,
  saveLessonToUserFlashcards,
} from '../services/lesson.service.js';
import { requireAuthUser } from '../utils/admin-guard.js';
import { NotFoundError } from '../utils/errors.js';
import { publicLessonsQuerySchema } from '../validators/lesson.js';

export async function handlePublicListLessons(req: FastifyRequest, reply: FastifyReply) {
  const user = await resolveAuthenticatedUser(req.headers.authorization);
  const parsed = publicLessonsQuerySchema.parse(req.query ?? {});
  const data = await listPublicLessons(user, parsed.level);
  return reply.send(data);
}

export async function handlePublicGetLesson(req: FastifyRequest, reply: FastifyReply) {
  const user = await resolveAuthenticatedUser(req.headers.authorization);
  const { id } = req.params as { id: string };
  const data = await getPublicLessonDetail(user, id);
  return reply.send(data);
}

export async function handleDownloadMaterialFile(req: FastifyRequest, reply: FastifyReply) {
  const { materialId } = req.params as { materialId: string };
  const q = (req.query ?? {}) as { token?: string };
  const authHeader = req.headers.authorization;
  const rawToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : q.token;

  const user = await resolveAuthenticatedToken(rawToken);
  const info = await resolveMaterialDownload(user, materialId);

  try {
    await fs.stat(info.filePath);
  } catch {
    throw new NotFoundError('Tệp tài liệu không còn tồn tại trên máy chủ.');
  }

  void reply.header('Content-Type', info.mimeType);
  void reply.header(
    'Content-Disposition',
    `inline; filename="${info.fileName}"; filename*=UTF-8''${encodeURIComponent(info.fileName)}`,
  );
  void reply.header('X-Content-Type-Options', 'nosniff');
  return reply.send(createReadStream(info.filePath));
}

export async function handleSaveLessonToFlashcards(req: FastifyRequest, reply: FastifyReply) {
  const user = await requireAuthUser(req, reply);
  if (!user) return;
  const { id } = req.params as { id: string };
  const result = await saveLessonToUserFlashcards(user, id);
  return reply.send(result);
}
