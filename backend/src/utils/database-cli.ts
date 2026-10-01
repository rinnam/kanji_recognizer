import { sql } from 'kysely';
import { db, pool } from '../config/database.js';

const EXPECTED_TABLES = [
  'users',
  'folders',
  'vocabularies',
  'vocabulary_folders',
  'quiz_sessions',
  'quiz_attempts',
  'kanji_entries',
  'recognition_results',
] as const;

async function getVersion(): Promise<string> {
  const result = await sql<{ version: string }>`SELECT version()`.execute(db);
  return result.rows[0]?.version ?? 'unknown';
}

async function getExistingTables(): Promise<Set<string>> {
  const result = await sql<{ table_name: string }>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `.execute(db);
  return new Set(result.rows.map((r) => r.table_name));
}

async function reportTables(): Promise<{ ok: boolean; missing: string[] }> {
  const existing = await getExistingTables();
  const missing: string[] = [];
  console.log('Tables in schema "public":');
  for (const table of EXPECTED_TABLES) {
    const present = existing.has(table);
    if (!present) missing.push(table);
    console.log(`  ${present ? '[OK]' : '[MISSING]'} ${table}`);
  }
  return { ok: missing.length === 0, missing };
}

async function runStatus(): Promise<number> {
  const version = await getVersion();
  console.log('Connected to PostgreSQL.');
  console.log(`Server: ${version}`);
  const { ok, missing } = await reportTables();
  if (ok) {
    console.log(`\nStatus: OK — all ${EXPECTED_TABLES.length} expected tables present.`);
    return 0;
  }
  console.error(`\nStatus: FAIL — missing ${missing.length} table(s): ${missing.join(', ')}`);
  return 1;
}

async function runBaseline(): Promise<number> {
  if (!process.argv.includes('--confirm-existing-schema')) {
    console.error(
      'Refusing to baseline without --confirm-existing-schema (this command only verifies, it does not apply DDL).',
    );
    return 1;
  }
  console.log('Baseline (verify-only): checking expected tables...');
  const { ok, missing } = await reportTables();
  if (ok) {
    console.log('\nBaseline: OK — existing schema matches the 8 expected tables.');
    return 0;
  }
  console.error(`\nBaseline: FAIL — missing table(s): ${missing.join(', ')}`);
  console.error('Apply schema with: psql "$DATABASE_URL" -f docs/database/schema.sql');
  return 1;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  let exitCode = 1;
  try {
    if (command === 'status') {
      exitCode = await runStatus();
    } else if (command === 'baseline') {
      exitCode = await runBaseline();
    } else {
      console.error(`Unknown command: ${command ?? '(none)'}. Use "status" or "baseline".`);
      exitCode = 1;
    }
  } catch (err) {
    console.error('Database CLI error:', err instanceof Error ? err.message : err);
    exitCode = 1;
  } finally {
    await db.destroy();
    await pool.end().catch(() => undefined);
  }
  process.exit(exitCode);
}

void main();
