import { pool } from '../config/database.js';
import { hashPassword } from '../services/auth.service.js';

async function main() {
  const email = 'user1@gmail.com';
  const passwordHash = hashPassword('luong123');
  const displayName = 'Võ Gia Lượng';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upsert = await client.query(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         display_name = EXCLUDED.display_name,
         role = 'admin'
       RETURNING id, email, role`,
      [email, passwordHash, displayName],
    );
    const userId = upsert.rows[0].id as string;

    const fRes = await client.query('UPDATE folders SET owner_id = $1 WHERE owner_id <> $1', [userId]);
    const vRes = await client.query('UPDATE vocabularies SET owner_id = $1 WHERE owner_id <> $1', [userId]);
    const qRes = await client.query('UPDATE quiz_sessions SET owner_id = $1 WHERE owner_id <> $1', [userId]);

    await client.query('COMMIT');
    console.log(
      `MIGRATE_OK user=${email} id=${userId} role=admin folders_moved=${fRes.rowCount} vocab_moved=${vRes.rowCount} quiz_moved=${qRes.rowCount}`,
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
