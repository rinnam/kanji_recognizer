import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { hashPassword } from '../services/auth.service.js';
import { ensureMembershipTables } from '../services/membership.service.js';

async function main() {
  await ensureMembershipTables();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean up temporary smoke-test users if present
    await client.query(`DELETE FROM users WHERE email LIKE 'ks_smoke_%@example.com'`);

    // 1. Ensure user1@gmail.com exists -> Pro AI + 999,999 KS
    const u1Res = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = 'user1@gmail.com'`,
    );
    const user1Id = u1Res.rows[0]?.id;
    if (!user1Id) {
      throw new Error('Không tìm thấy tài khoản user1@gmail.com trong DB.');
    }

    await client.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [user1Id]);
    await client.query(
      `INSERT INTO user_subscriptions (user_id, tier, billing_cycle, started_at, expires_at, demo_order_code, updated_at, deleted_at)
       VALUES ($1, 'pro', 'yearly', now(), '2099-12-31T23:59:59Z', 'KS-ADMIN-PRO', now(), NULL)
       ON CONFLICT (user_id) DO UPDATE SET
         tier = 'pro',
         billing_cycle = 'yearly',
         started_at = now(),
         expires_at = '2099-12-31T23:59:59Z',
         demo_order_code = 'KS-ADMIN-PRO',
         updated_at = now(),
         deleted_at = NULL`,
      [user1Id],
    );

    const balRes = await client.query<{ total: string | number }>(
      `SELECT COALESCE(SUM(delta), 0) AS total
       FROM user_point_ledger
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [user1Id],
    );
    const currentKs = Number(balRes.rows[0]?.total ?? 0);
    const targetKs = 999999;
    if (currentKs !== targetKs) {
      await client.query(
        `DELETE FROM user_point_ledger WHERE idempotency_key = 'seed_full_ks:user1'`,
      );
      const afterCleanRes = await client.query<{ total: string | number }>(
        `SELECT COALESCE(SUM(delta), 0) AS total
         FROM user_point_ledger
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [user1Id],
      );
      const baseKs = Number(afterCleanRes.rows[0]?.total ?? 0);
      const exactDelta = targetKs - baseKs;
      if (exactDelta !== 0) {
        const ledgerId = `ledger_seed_${crypto.randomBytes(4).toString('hex')}`;
        await client.query(
          `INSERT INTO user_point_ledger (id, user_id, delta, balance_after, reason_code, description, idempotency_key)
           VALUES ($1, $2, $3, $4, 'admin_grant', 'Cấp full quyền & full Xu Kanji Smart cho user1', 'seed_full_ks:user1')`,
          [ledgerId, user1Id, exactDelta, targetKs],
        );
      }
    }

    // 2. Ensure user2@gmail.com -> Free tier & reset any speaking unlocks
    const u2Res = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = 'user2@gmail.com'`,
    );
    const user2Id = u2Res.rows[0]?.id;
    if (!user2Id) {
      throw new Error('Không tìm thấy tài khoản user2@gmail.com trong DB.');
    }

    await client.query(`UPDATE users SET role = 'user' WHERE id = $1`, [user2Id]);
    await client.query(
      `INSERT INTO user_subscriptions (user_id, tier, billing_cycle, started_at, expires_at, demo_order_code, updated_at, deleted_at)
       VALUES ($1, 'free', 'monthly', now(), NULL, NULL, now(), NULL)
       ON CONFLICT (user_id) DO UPDATE SET
         tier = 'free',
         billing_cycle = 'monthly',
         started_at = now(),
         expires_at = NULL,
         demo_order_code = NULL,
         updated_at = now(),
         deleted_at = NULL`,
      [user2Id],
    );
    await client.query(
      `UPDATE user_speaking_unlocks SET deleted_at = now(), updated_at = now()
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [user2Id],
    );

    // 3. Create or update user3@gmail.com -> Plus tier (password: 123456)
    const u3Res = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = 'user3@gmail.com'`,
    );
    let user3Id = u3Res.rows[0]?.id;
    if (!user3Id) {
      const insertU3 = await client.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, display_name, role)
         VALUES ('user3@gmail.com', $1, 'Người chơi 3', 'user')
         RETURNING id`,
        [hashPassword('123456')],
      );
      user3Id = insertU3.rows[0]!.id;
    } else {
      await client.query(
        `UPDATE users SET password_hash = COALESCE(password_hash, $2), display_name = COALESCE(display_name, 'Người chơi 3'), role = 'user' WHERE id = $1`,
        [user3Id, hashPassword('123456')],
      );
    }

    await client.query(
      `INSERT INTO user_subscriptions (user_id, tier, billing_cycle, started_at, expires_at, demo_order_code, updated_at, deleted_at)
       VALUES ($1, 'plus', 'yearly', now(), '2099-12-31T23:59:59Z', 'KS-PLUS-USER3', now(), NULL)
       ON CONFLICT (user_id) DO UPDATE SET
         tier = 'plus',
         billing_cycle = 'yearly',
         started_at = now(),
         expires_at = '2099-12-31T23:59:59Z',
         demo_order_code = 'KS-PLUS-USER3',
         updated_at = now(),
         deleted_at = NULL`,
      [user3Id],
    );

    await client.query('COMMIT');
    console.log(
      JSON.stringify({
        ok: true,
        user1: { id: user1Id, email: 'user1@gmail.com', tier: 'pro', ks: targetKs },
        user2: { id: user2Id, email: 'user2@gmail.com', tier: 'free' },
        user3: { id: user3Id, email: 'user3@gmail.com', tier: 'plus' },
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
