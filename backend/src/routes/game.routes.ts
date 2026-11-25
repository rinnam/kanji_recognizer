import type { FastifyPluginAsync } from 'fastify';
import {
  attachSocketToRoom,
  createGameRoom,
  listAvailableDecks,
  listPublicRooms,
  type GameMode,
} from '../services/game-room.service.js';

export const gameRoutes: FastifyPluginAsync = async (app) => {
  app.get('/games/decks', async (_req, reply) => {
    const decks = await listAvailableDecks();
    return reply.send({ decks });
  });

  app.get('/games/rooms', async (_req, reply) => {
    return reply.send({ rooms: listPublicRooms() });
  });

  app.post('/games/rooms', async (req, reply) => {
    const body = (req.body ?? {}) as {
      name?: string;
      isPrivate?: boolean;
      mode?: GameMode;
      deckIds?: string[];
      scoreLimit?: number;
      answerTimeSec?: number;
      delaySec?: number;
    };
    const room = await createGameRoom(body);
    return reply.status(201).send({ room });
  });

  app.get('/games/ws/:roomCode', { websocket: true }, (socket, req) => {
    const params = req.params as { roomCode?: string };
    const query = req.query as { name?: string };
    attachSocketToRoom(params.roomCode ?? '', socket, query.name ?? 'Người chơi');
  });
};
