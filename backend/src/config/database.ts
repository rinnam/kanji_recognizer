import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { env } from './env.js';
import type { DB } from '../types/database.js';

// pg là CommonJS → lấy Pool qua default import để an toàn dưới NodeNext/ESM.
const { Pool } = pg;

/**
 * Pool kết nối PostgreSQL. Export riêng để graceful shutdown (pool.end()).
 * Chuỗi kết nối đọc từ env.DATABASE_URL — KHÔNG hardcode.
 * Lưu ý: pg trả về timestamptz dưới dạng JS Date khi SELECT.
 */
export const pool = new Pool({ connectionString: env.DATABASE_URL });

/** Singleton Kysely instance dùng cho toàn bộ repository. */
export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});
