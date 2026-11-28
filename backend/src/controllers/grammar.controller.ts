import type { FastifyReply, FastifyRequest } from 'fastify';
import { getPublicGrammarCatalog, getPublicGrammarSummary } from '../services/grammar.service.js';
import { publicGrammarQuerySchema } from '../validators/grammar.js';

export async function handlePublicGrammarCatalog(req: FastifyRequest, reply: FastifyReply) {
  const parsed = publicGrammarQuerySchema.parse(req.query ?? {});
  const catalog = await getPublicGrammarCatalog(parsed.level);
  return reply.send(catalog);
}

export async function handlePublicGrammarSummary(_req: FastifyRequest, reply: FastifyReply) {
  const summary = await getPublicGrammarSummary();
  return reply.send(summary);
}
