import type { FastifyInstance } from 'fastify';
import * as flashcardController from '../controllers/flashcard.controller.js';

export async function flashcardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/flashcards/due', flashcardController.listDue);
  app.post('/flashcards/:id/review', flashcardController.review);
}
