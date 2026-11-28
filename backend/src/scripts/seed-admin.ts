import { pool } from '../config/database.js';
import { ensureAdminAndLessonTables } from '../services/admin-schema.service.js';
import { hashPassword } from '../services/auth.service.js';
import { ensureMembershipTables } from '../services/membership.service.js';

async function main() {
  await ensureMembershipTables();
  await ensureAdminAndLessonTables();

  const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@kanjismart.vn').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'admin123';
  const adminDisplayName = 'Quản trị viên';
  const passwordHash = hashPassword(adminPassword);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Tạo / cập nhật tài khoản Admin riêng trước để luôn bảo toàn ít nhất 1 admin active
    const existingAdmin = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [adminEmail],
    );

    let adminId = existingAdmin.rows[0]?.id;
    if (adminId) {
      await client.query(
        `UPDATE users
         SET password_hash = $2,
             display_name = $3,
             role = 'admin',
             is_banned = false
         WHERE id = $1`,
        [adminId, passwordHash, adminDisplayName],
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, display_name, role, is_banned)
         VALUES ($1, $2, $3, 'admin', false)
         RETURNING id`,
        [adminEmail, passwordHash, adminDisplayName],
      );
      adminId = inserted.rows[0]!.id;
    }

    // Admin tách biệt hoàn toàn khỏi gói học viên
    await client.query(`DELETE FROM user_subscriptions WHERE user_id = $1`, [adminId]);

    // 2. Trả user1@gmail.com về tài khoản học viên thuần túy (giữ nguyên Pro AI, từ vựng & Xu KS)
    const user1Res = await client.query<{ id: string; role: string }>(
      `UPDATE users
       SET role = 'user'
       WHERE email = 'user1@gmail.com'
       RETURNING id, role`,
    );

    await client.query('COMMIT');
    console.log(
      JSON.stringify({
        ok: true,
        admin: { id: adminId, email: adminEmail, role: 'admin' },
        user1: user1Res.rows[0] ?? null,
      }),
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
