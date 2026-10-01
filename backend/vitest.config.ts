import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Load backend/.env so integration tests see TEST_DATABASE_URL (vitest does not read .env on its own).
// This is why PostgreSQL integration was previously "blocked / not run".
const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    coverage: { reporter: ['text', 'json-summary'] }
  }
});
