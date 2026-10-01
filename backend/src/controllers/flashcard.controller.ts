import type { FastifyReply, FastifyRequest } from 'fastify';
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
  const vocabularies = await flashcardService.listDueVocabularies(query.limit);
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
  const vocab = await flashcardService.reviewVocabulary(id, rating);
  await reply.send(vocab);
}
