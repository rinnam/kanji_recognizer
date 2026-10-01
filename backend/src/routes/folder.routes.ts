import type { FastifyInstance } from 'fastify';
import * as folderController from '../controllers/folder.controller.js';

export async function folderRoutes(app: FastifyInstance): Promise<void> {
  app.post('/folders', folderController.create);
  app.get('/folders', folderController.list);
  app.get('/folders/:id', folderController.getOne);
  app.patch('/folders/:id', folderController.patch);
  app.delete('/folders/:id', folderController.remove);
}
