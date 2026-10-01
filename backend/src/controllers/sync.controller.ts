import type { FastifyReply, FastifyRequest } from 'fastify';
import * as syncService from '../services/sync.service.js';
import { pullQuerySchema, pushBodySchema } from '../validators/sync.js';

export async function pull(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const query = pullQuerySchema.parse(req.query);
  const result = await syncService.pull(query.since);
  await reply.send(result);
}

export async function push(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const body = pushBodySchema.parse(req.body);
  const result = await syncService.push(body);
  await reply.send(result);
}
