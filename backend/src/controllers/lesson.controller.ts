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
import { publicLessonsQuerySchema } from '../validators/lesson.js';

function toAsciiFilename(raw: string): string {
  const dotIdx = raw.lastIndexOf('.');
  const ext = dotIdx > 0 ? raw.slice(dotIdx).replace(/[^a-zA-Z0-9.]/g, '') : '';
  const base = dotIdx > 0 ? raw.slice(0, dotIdx) : raw;
  const asciiBase = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim();
  const safeBase = asciiBase || 'tai-lieu';
  return `${safeBase.slice(0, 120)}${ext.slice(0, 16)}`;
}

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

  const asciiName = toAsciiFilename(info.fileName);
  void reply.header('Content-Type', info.mimeType);
  void reply.header('Content-Length', String(info.fileData.byteLength));
  void reply.header(
    'Content-Disposition',
    `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(info.fileName)}`,
  );
  void reply.header('X-Content-Type-Options', 'nosniff');
  return reply.send(info.fileData);
}

export async function handleSaveLessonToFlashcards(req: FastifyRequest, reply: FastifyReply) {
  const user = await requireAuthUser(req, reply);
  if (!user) return;
  const { id } = req.params as { id: string };
  const result = await saveLessonToUserFlashcards(user, id);
  return reply.send(result);
}
