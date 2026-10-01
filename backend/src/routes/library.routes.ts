import type { FastifyPluginAsync } from 'fastify';
import { LibraryController } from '../controllers/library.controller.js';

export const libraryRoutes: FastifyPluginAsync = async (app) => {
  const controller = new LibraryController();
  app.get('/', controller.get.bind(controller));
  app.post('/items', controller.saveItem.bind(controller));
  app.post('/decks', controller.createDeck.bind(controller));
  app.patch('/decks/:deckId', controller.updateDeck.bind(controller));
  app.put('/decks/rebalance', controller.rebalance.bind(controller));
  app.delete('/decks/:deckId', controller.deleteDeck.bind(controller));
};
