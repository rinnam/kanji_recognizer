import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { loadConfig, requireDatabaseUrl } from '../config/env.js';
import { BASELINE_MIGRATION_VERSION, REQUIRED_BASELINE_TABLES } from '../constants/database.js';

const command = process.argv[2];
const confirmed = process.argv.includes('--confirm-existing-schema');
const connectionString = requireDatabaseUrl(loadConfig());
const pool = new pg.Pool({ connectionString, max: 1 });
const migrationPath = resolve(process.cwd(), '../db/migrations/0001_init.sql');
const migration = await readFile(migrationPath, 'utf8');
const checksum = createHash('sha256').update(migration).digest('hex');

try {
  const tables = await pool.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public' order by table_name");
  const hasTracking = tables.rows.some((row) => row.table_name === 'schema_migrations');
  const tracked = hasTracking ? await pool.query('select version, checksum, applied_at from schema_migrations order by version') : { rows: [] };
  if (command === 'status') {
    console.log(JSON.stringify({ publicTables: tables.rows.map((row) => row.table_name), tracked: tracked.rows }, null, 2));
  } else if (command === 'baseline') {
    if (!confirmed) throw new Error('Baseline requires --confirm-existing-schema');
    if (!REQUIRED_BASELINE_TABLES.every((name) => tables.rows.some((row) => row.table_name === name))) throw new Error('Required existing schema tables were not found; refusing baseline');
    if (!hasTracking) await pool.query('create table schema_migrations (version text primary key, checksum text not null, applied_at timestamptz not null)');
    await pool.query('insert into schema_migrations(version, checksum, applied_at) values ($1, $2, now()) on conflict (version) do nothing', [BASELINE_MIGRATION_VERSION, checksum]);
    console.log('Existing schema baseline recorded; migration SQL was not replayed.');
  } else {
    throw new Error('Use db:status or db:baseline');
  }
} finally {
  await pool.end();
}
