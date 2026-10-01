import type { FastifyInstance } from 'fastify';
import * as vocabularyController from '../controllers/vocabulary.controller.js';

export async function vocabularyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/vocabularies', vocabularyController.create);
  app.get('/vocabularies', vocabularyController.list);
  app.get('/vocabularies/:id', vocabularyController.getOne);
  app.patch('/vocabularies/:id', vocabularyController.patch);
  app.delete('/vocabularies/:id', vocabularyController.remove);
}
