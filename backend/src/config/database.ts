import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from '../types/database.js';

export interface DatabaseConnection {
  db: Kysely<Database>;
  pool: pg.Pool;
}

export function createDatabase(connectionString: string): DatabaseConnection {
  const pool = new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  return { db, pool };
}

export async function closeDatabase(connection: DatabaseConnection): Promise<void> {
  await connection.db.destroy();
}
