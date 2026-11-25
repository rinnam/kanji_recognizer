import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { hashPassword } from '../services/auth.service.js';

async function main() {
  const targetId = env.LOCAL_OWNER_ID;
  const email = 'user1@gmail.com';
  const passwordHash = hashPassword('luong123');
  const displayName = 'Võ Gia Lượng';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Remove any duplicate user1@gmail.com row with a different ID after moving its data
    const dup = await client.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, targetId]);
    for (const row of dup.rows) {
      const oldId = row.id as string;
      await client.query('UPDATE folders SET owner_id = $1 WHERE owner_id = $2', [targetId, oldId]);
      await client.query('UPDATE vocabularies SET owner_id = $1 WHERE owner_id = $2', [targetId, oldId]);
      await client.query('UPDATE quiz_sessions SET owner_id = $1 WHERE owner_id = $2', [targetId, oldId]);
      await client.query('DELETE FROM users WHERE id = $1', [oldId]);
    }

    await client.query(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         display_name = EXCLUDED.display_name,
         role = 'admin'`,
      [targetId, email, passwordHash, displayName],
    );

    const fRes = await client.query('UPDATE folders SET owner_id = $1 WHERE owner_id <> $1', [targetId]);
    const vRes = await client.query('UPDATE vocabularies SET owner_id = $1 WHERE owner_id <> $1', [targetId]);
    const qRes = await client.query('UPDATE quiz_sessions SET owner_id = $1 WHERE owner_id <> $1', [targetId]);

    await client.query('COMMIT');
    console.log(
      `MIGRATE_OK user=${email} id=${targetId} role=admin folders_moved=${fRes.rowCount} vocab_moved=${vRes.rowCount} quiz_moved=${qRes.rowCount}`,
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
