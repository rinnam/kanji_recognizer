import 'fastify';
import type { LibraryService } from '../services/library.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    libraryService: LibraryService;
    libraryAvailable: boolean;
  }
}
