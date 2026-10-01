import { z } from 'zod';

const optionalDatabaseUrl = z.string().url().optional();
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: optionalDatabaseUrl,
  TEST_DATABASE_URL: optionalDatabaseUrl,
  LOCAL_OWNER_ID: z.uuid().default('00000000-0000-4000-8000-000000000000')
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(input: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(input);
}

export function requireDatabaseUrl(config: AppConfig): string {
  if (!config.DATABASE_URL) throw new Error('DATABASE_URL is required to start the database-backed server');
  return config.DATABASE_URL;
}
