import type { FastifyPluginAsync } from 'fastify';
import {
  handlePublicGrammarCatalog,
  handlePublicGrammarSummary,
} from '../controllers/grammar.controller.js';

export const grammarRoutes: FastifyPluginAsync = async (app) => {
  app.get('/grammar', handlePublicGrammarCatalog);
  app.get('/grammar/summary', handlePublicGrammarSummary);
};
