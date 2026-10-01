import type { FastifyReply, FastifyRequest } from 'fastify';
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
  const session = await quizService.createSession(input);
  await reply.code(201).send(session);
}

export async function getOne(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = quizSessionIdParamSchema.parse(req.params);
  const session = await quizService.getSession(id);
  await reply.send(session);
}
