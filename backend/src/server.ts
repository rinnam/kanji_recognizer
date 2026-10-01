import Fastify, { type FastifyInstance } from 'fastify';
import { sql } from 'kysely';
import { ZodError } from 'zod';
import { db, pool } from './config/database.js';
import { env } from './config/env.js';
import { flashcardRoutes } from './routes/flashcard.routes.js';
import { folderRoutes } from './routes/folder.routes.js';
import { quizRoutes } from './routes/quiz.routes.js';
import { syncRoutes } from './routes/sync.routes.js';
import { vocabularyRoutes } from './routes/vocabulary.routes.js';
import {
  DuplicateError,
  NotFoundError,
  ValidationFailedError,
} from './utils/errors.js';
import { ensureLocalOwner } from './utils/local-owner.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  // Error handler: map lỗi domain/validation → HTTP code phù hợp.
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError) {
      void reply.code(400).send({
        error: 'ValidationError',
        message: 'Request validation failed',
        details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    if (error instanceof ValidationFailedError) {
      void reply.code(400).send({ error: 'ValidationError', message: error.message });
      return;
    }
    if (error instanceof NotFoundError) {
      void reply.code(404).send({ error: 'NotFound', message: error.message });
      return;
    }
    if (error instanceof DuplicateError) {
      void reply.code(409).send({ error: 'Duplicate', message: error.message });
      return;
    }
    // Fastify body-parse / schema errors expose statusCode.
    const err = error as { statusCode?: unknown; name?: unknown; message?: unknown };
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    if (statusCode >= 500) {
      app.log.error(error);
      void reply.code(500).send({ error: 'InternalServerError', message: 'Something went wrong' });
      return;
    }
    const name = typeof err.name === 'string' ? err.name : 'Error';
    const message = typeof err.message === 'string' ? err.message : 'Error';
    void reply.code(statusCode).send({ error: name, message });
  });

  // Đảm bảo local owner tồn tại khi khởi động (MVP không auth).
  await ensureLocalOwner();

  app.get('/health', async (_req, reply) => {
    let dbStatus: 'up' | 'down' = 'down';
    try {
      await sql`SELECT 1`.execute(db);
      dbStatus = 'up';
    } catch (err) {
      app.log.error({ err }, 'health check: DB down');
    }
    const code = dbStatus === 'up' ? 200 : 503;
    await reply.code(code).send({ status: 'ok', db: dbStatus });
  });

  await app.register(folderRoutes, { prefix: '/api' });
  await app.register(vocabularyRoutes, { prefix: '/api' });
  await app.register(flashcardRoutes, { prefix: '/api' });
  await app.register(quizRoutes, { prefix: '/api' });
  await app.register(syncRoutes, { prefix: '/api' });

  return app;
}

async function start(): Promise<void> {
  const app = await buildServer();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down...`);
    try {
      await app.close();
      await db.destroy();
      await pool.end().catch(() => undefined);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
  } catch (err) {
    app.log.error(err);
    await db.destroy().catch(() => undefined);
    await pool.end().catch(() => undefined);
    process.exit(1);
  }
}

// Chỉ listen khi file được chạy trực tiếp (không khi import, vd trong test).
const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectRun || process.env.START_SERVER === '1') {
  void start();
}
