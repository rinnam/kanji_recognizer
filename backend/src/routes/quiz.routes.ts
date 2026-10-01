import type { FastifyInstance } from 'fastify';
import * as quizController from '../controllers/quiz.controller.js';

export async function quizRoutes(app: FastifyInstance): Promise<void> {
  app.post('/quiz/sessions', quizController.create);
  app.get('/quiz/sessions/:id', quizController.getOne);
}
