import type { FastifyPluginAsync } from 'fastify';
import { verifyToken } from '../services/auth.service.js';
import { searchDictionary } from '../services/dictionary.service.js';

export const dictionaryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/dictionary/search', async (req, reply) => {
    const query = (req.query as { q?: string }).q ?? '';
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7).trim());
      if (payload?.id) userId = payload.id;
    }
    const result = await searchDictionary(query, userId);
    return reply.send(result);
  });
};
