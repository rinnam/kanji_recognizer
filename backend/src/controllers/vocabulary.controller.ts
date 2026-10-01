import type { FastifyReply, FastifyRequest } from 'fastify';
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
  const vocab = await vocabularyService.createVocabulary(input);
  await reply.code(201).send(vocab);
}

export async function list(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const query = listVocabulariesQuerySchema.parse(req.query);
  const vocabularies = await vocabularyService.listVocabularies(query);
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
  const vocab = await vocabularyService.getVocabulary(id);
  await reply.send(vocab);
}

export async function patch(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = vocabularyIdParamSchema.parse(req.params);
  const input = updateVocabularySchema.parse(req.body);
  const vocab = await vocabularyService.updateVocabulary(id, input);
  await reply.send(vocab);
}

export async function remove(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = vocabularyIdParamSchema.parse(req.params);
  const vocab = await vocabularyService.deleteVocabulary(id);
  await reply.send(vocab);
}
