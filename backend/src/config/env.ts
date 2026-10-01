import { z } from 'zod';

/**
 * Env schema — nguồn cấu hình duy nhất là biến môi trường (nạp từ backend/.env
 * qua `--env-file-if-exists`). KHÔNG hardcode credential ở bất kỳ đâu.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.string().url(),
  LOCAL_OWNER_ID: z.string().uuid(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const key = issue.path.join('.') || '(root)';
        return `  - ${key}: ${issue.message}`;
      })
      .join('\n');
    throw new Error(
      `Invalid or missing environment variables:\n${details}\n` +
        'Check backend/.env (see backend/.env.example).',
    );
  }
  return result.data;
}

export const env: Env = parseEnv();
