import type { FastifyReply, FastifyRequest } from 'fastify';
import { extractBearerUser } from '../services/auth.service.js';
import * as quizService from '../services/quiz.service.js';
import {
  createQuizSessionSchema,
  quizSessionIdParamSchema,
} from '../validators/quiz.js';

export async function create(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createQuizSessionSchema.parse(req.body);
  const user = extractBearerUser(req.headers.authorization);
  const session = await quizService.createSession(input, new Date(), user?.id);
  await reply.code(201).send(session);
}

export async function getOne(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = quizSessionIdParamSchema.parse(req.params);
  const user = extractBearerUser(req.headers.authorization);
  const session = await quizService.getSession(id, user?.id);
  await reply.send(session);
}
