import type { FastifyReply, FastifyRequest } from 'fastify';
import { resolveAuthenticatedUser } from '../services/auth.service.js';
import {
  deleteUserShadowingVideo,
  listPublicShadowingCatalog,
  saveUserShadowingVideo,
} from '../services/shadowing.service.js';
import { requireAuthUser } from '../utils/admin-guard.js';
import { saveUserShadowingSchema } from '../validators/shadowing.js';

export async function handleListPublicShadowingVideos(req: FastifyRequest, reply: FastifyReply) {
  const user = await resolveAuthenticatedUser(req.headers.authorization);
  const catalog = await listPublicShadowingCatalog(user);
  return reply.send(catalog);
}

export async function handleSaveUserShadowingVideo(req: FastifyRequest, reply: FastifyReply) {
  const user = await requireAuthUser(req, reply);
  if (!user) return;
  const parsed = saveUserShadowingSchema.parse(req.body ?? {});
  const result = await saveUserShadowingVideo(user, parsed);
  return reply.status(201).send(result);
}

export async function handleDeleteUserShadowingVideo(req: FastifyRequest, reply: FastifyReply) {
  const user = await requireAuthUser(req, reply);
  if (!user) return;
  const { videoId } = req.params as { videoId: string };
  const result = await deleteUserShadowingVideo(user, videoId);
  return reply.send(result);
}
