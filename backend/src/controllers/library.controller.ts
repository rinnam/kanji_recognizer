import type { FastifyReply, FastifyRequest } from 'fastify';
import type { LibraryItemQuery } from '../models/library.js';
import { createDeckSchema, deckIdParamSchema, deleteDeckSchema, libraryQuerySchema, rebalanceDecksSchema, saveItemSchema, updateDeckSchema } from '../validators/library.validators.js';

function ownerId(request: FastifyRequest): string {
  return request.headers['x-owner-id'] as string;
}

export class LibraryController {
  async get(request: FastifyRequest, reply: FastifyReply) {
    const query = libraryQuerySchema.parse(request.query) as LibraryItemQuery;
    return reply.send(await request.server.libraryService.getLibrary(ownerId(request), query));
  }

  async saveItem(request: FastifyRequest, reply: FastifyReply) {
    const input = saveItemSchema.parse(request.body);
    return reply.code(201).send(await request.server.libraryService.saveItem(ownerId(request), input));
  }

  async createDeck(request: FastifyRequest, reply: FastifyReply) {
    const input = createDeckSchema.parse(request.body);
    return reply.code(201).send(await request.server.libraryService.createDeck(ownerId(request), input));
  }

  async updateDeck(request: FastifyRequest, reply: FastifyReply) {
    const { deckId } = deckIdParamSchema.parse(request.params);
    const input = updateDeckSchema.parse(request.body);
    return reply.send(await request.server.libraryService.updateDeck(ownerId(request), deckId, input));
  }

  async rebalance(request: FastifyRequest, reply: FastifyReply) {
    const input = rebalanceDecksSchema.parse(request.body);
    return reply.send(await request.server.libraryService.rebalanceDecks(ownerId(request), input));
  }

  async deleteDeck(request: FastifyRequest, reply: FastifyReply) {
    const { deckId } = deckIdParamSchema.parse(request.params);
    const { expectedVersion } = deleteDeckSchema.parse(request.query);
    await request.server.libraryService.deleteDeck(ownerId(request), deckId, expectedVersion);
    return reply.code(204).send();
  }
}
