import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { AppConfig } from './config/env.js';
import type { DatabaseConnection } from './config/database.js';
import { LibraryRepository } from './repositories/library.repository.js';
import { LibraryService } from './services/library.service.js';
import { registerOwnerContext } from './middlewares/owner-context.js';
import { libraryRoutes } from './routes/library.routes.js';
import { systemRoutes } from './routes/system.routes.js';
import { AppError } from './utils/errors.js';

export interface BuildAppOptions {
  config: AppConfig;
  database?: DatabaseConnection;
  libraryService?: LibraryService;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? options.config.NODE_ENV !== 'test' });
  const service = options.libraryService ?? (options.database ? new LibraryService(new LibraryRepository(options.database.db)) : undefined);
  if (service) app.decorate('libraryService', service);
  registerOwnerContext(app, options.config.LOCAL_OWNER_ID);
  app.decorate('libraryAvailable', Boolean(service));
  app.register(systemRoutes, { prefix: '/v1' });
  if (service) app.register(libraryRoutes, { prefix: '/v1/library' });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'Request validation failed', details: error.issues });
    if (error instanceof AppError) return reply.code(error.statusCode).send({ code: error.code, message: error.message, details: error.details });
    request.log.error({ err: error }, 'Unhandled request error');
    return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  });
  return app;
}
