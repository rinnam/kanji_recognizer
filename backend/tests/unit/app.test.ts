import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';

describe('app without a live database', () => {
  it('reports health and truthful capabilities', async () => {
    const app = buildApp({ config: loadConfig({ NODE_ENV: 'test' }), logger: false });
    const health = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(health.statusCode).toBe(200);
    const capabilities = await app.inject({ method: 'GET', url: '/v1/capabilities' });
    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json()).toMatchObject({
      contractVersion: '1.0',
      capabilities: {
        platform: { available: true, mode: 'backend-runtime' },
        library: { available: false, mode: 'unavailable', reason: 'database-not-configured' },
        frontend: { available: null, mode: 'separate-runtime', reason: 'not-observable-by-backend' },
        recognition: { available: false, mode: 'unavailable', reason: 'deferred-no-approved-model-or-contract' },
        learning: {
          available: null,
          mode: 'separate-local-mock-shell',
          reason: 'not-observable-by-backend',
          modules: {
            library: { available: null, mode: 'local-mock-ui' },
            practice: { available: null, mode: 'local-mock-ui' },
            review: { available: null, mode: 'local-mock-ui' },
            progress: { available: null, mode: 'local-mock-ui' },
            durableLearning: { available: false, mode: 'unavailable' }
          }
        }
      }
    });
    expect(capabilities.json().capabilities.recognition.evidence).toEqual([
      { classification: 'Target', source: 'PRD recognition experience' },
      { classification: 'Blocked', source: 'approved model and inference contract' }
    ]);
    await app.close();
  });
});
