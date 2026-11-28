import type { FastifyReply, FastifyRequest } from 'fastify';
import { extractBearerUser } from '../services/auth.service.js';
import * as flashcardService from '../services/flashcard.service.js';
import {
  dueQuerySchema,
  flashcardIdParamSchema,
  reviewBodySchema,
} from '../validators/flashcard.js';

export async function listDue(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const query = dueQuerySchema.parse(req.query);
  const user = extractBearerUser(req.headers.authorization);
  const vocabularies = await flashcardService.listDueVocabularies(
    query.limit,
    new Date(),
    user?.id,
  );
  await reply.send({
    data: vocabularies,
    pagination: { limit: query.limit, count: vocabularies.length },
  });
}

export async function review(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = flashcardIdParamSchema.parse(req.params);
  const { rating } = reviewBodySchema.parse(req.body);
  const user = extractBearerUser(req.headers.authorization);
  const vocab = await flashcardService.reviewVocabulary(id, rating, new Date(), user?.id);
  await reply.send(vocab);
}
