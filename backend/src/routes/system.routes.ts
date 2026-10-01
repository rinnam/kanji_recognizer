import type { FastifyPluginAsync } from 'fastify';

const currentEvidence = (source: string) => ({
  classification: 'Current' as const,
  source
});

const targetEvidence = (source: string) => ({
  classification: 'Target' as const,
  source
});

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/capabilities', async () => ({
    contractVersion: '1.0',
    capabilities: {
      platform: {
        available: true,
        mode: 'backend-runtime',
        evidence: [currentEvidence('GET /v1/health')]
      },
      library: {
        available: app.libraryAvailable,
        mode: app.libraryAvailable ? 'database-backed' : 'unavailable',
        ...(app.libraryAvailable ? {} : { reason: 'database-not-configured' }),
        evidence: [currentEvidence('backend Library route/service/repository implementation')]
      },
      frontend: {
        available: null,
        mode: 'separate-runtime',
        reason: 'not-observable-by-backend',
        evidence: [currentEvidence('frontend React application source')]
      },
      recognition: {
        available: false,
        mode: 'unavailable',
        reason: 'deferred-no-approved-model-or-contract',
        evidence: [targetEvidence('PRD recognition experience'), { classification: 'Blocked' as const, source: 'approved model and inference contract' }]
      },
      learning: {
        available: null,
        mode: 'separate-local-mock-shell',
        reason: 'not-observable-by-backend',
        modules: {
          library: { available: null, mode: 'local-mock-ui' },
          practice: { available: null, mode: 'local-mock-ui' },
          review: { available: null, mode: 'local-mock-ui' },
          progress: { available: null, mode: 'local-mock-ui' },
          durableLearning: { available: false, mode: 'unavailable', reason: 'contracts-and-product-decisions-blocked' }
        },
        evidence: [currentEvidence('frontend local/mock learning shell source'), targetEvidence('PRD §18 learning system')]
      }
    }
  }));
};
