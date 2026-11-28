import type { FastifyReply, FastifyRequest } from 'fastify';
import { extractBearerUser } from '../services/auth.service.js';
import * as vocabularyService from '../services/vocabulary.service.js';
import {
  createVocabularySchema,
  listVocabulariesQuerySchema,
  updateVocabularySchema,
  vocabularyIdParamSchema,
} from '../validators/vocabulary.js';

export async function create(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createVocabularySchema.parse(req.body);
  const user = extractBearerUser(req.headers.authorization);
  const vocab = await vocabularyService.createVocabulary(input, user?.id);
  await reply.code(201).send(vocab);
}

export async function list(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const query = listVocabulariesQuerySchema.parse(req.query);
  const user = extractBearerUser(req.headers.authorization);
  const vocabularies = await vocabularyService.listVocabularies(query, user?.id);
  await reply.send({
    data: vocabularies,
    pagination: { limit: query.limit, offset: query.offset, count: vocabularies.length },
  });
}

export async function getOne(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = vocabularyIdParamSchema.parse(req.params);
  const user = extractBearerUser(req.headers.authorization);
  const vocab = await vocabularyService.getVocabulary(id, user?.id);
  await reply.send(vocab);
}

export async function patch(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = vocabularyIdParamSchema.parse(req.params);
  const input = updateVocabularySchema.parse(req.body);
  const user = extractBearerUser(req.headers.authorization);
  const vocab = await vocabularyService.updateVocabulary(id, input, user?.id);
  await reply.send(vocab);
}

export async function remove(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = vocabularyIdParamSchema.parse(req.params);
  const user = extractBearerUser(req.headers.authorization);
  const vocab = await vocabularyService.deleteVocabulary(id, user?.id);
  await reply.send(vocab);
}
