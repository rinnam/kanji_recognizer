import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors.js';

export function registerOwnerContext(app: FastifyInstance, localOwnerId: string): void {
  app.addHook('preValidation', async (request) => {
    if (!request.url.startsWith('/v1/library')) return;
    const supplied = request.headers['x-owner-id'];
    if (supplied !== undefined && (!z.uuid().safeParse(supplied).success || supplied !== localOwnerId)) {
      throw new AppError(403, 'OWNER_SCOPE_FORBIDDEN', 'The requested owner scope is not available');
    }
    request.headers['x-owner-id'] = localOwnerId;
  });
}
