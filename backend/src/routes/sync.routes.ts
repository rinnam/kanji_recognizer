import type { FastifyInstance } from 'fastify';
import * as syncController from '../controllers/sync.controller.js';

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.get('/sync/pull', syncController.pull);
  app.post('/sync/push', syncController.push);
}
