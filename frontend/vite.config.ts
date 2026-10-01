import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Keep relative /v1 calls same-origin in the browser while forwarding them to Fastify in local development.
    // An explicit VITE_API_BASE_URL still bypasses this proxy in the API client.
    // Target 127.0.0.1 (not localhost): Fastify binds IPv4 only, and localhost can resolve to IPv6 (::1),
    // which Fastify refuses — the historical cause of 502 responses through the Vite proxy (runbook 04 §2).
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true
  }
});
