import { pool } from '../config/database.js';
import { ensureStudyStateTables } from './study-state.service.js';

let adminSchemaPromise: Promise<void> | null = null;

/** Đảm bảo bảng & cột cho Admin RBAC, Đơn hàng doanh thu, Bài học và Tài liệu tồn tại (idempotent). */
export function ensureAdminAndLessonTables(): Promise<void> {
  if (!adminSchemaPromise) {
    adminSchemaPromise = (async () => {
      await ensureStudyStateTables();
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_orders (
          id            text PRIMARY KEY,
          order_code    text NOT NULL UNIQUE,
          user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tier          text NOT NULL CHECK (tier IN ('plus', 'pro')),
          billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
          amount_vnd    integer NOT NULL CHECK (amount_vnd >= 0),
          status        text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'refunded')),
          is_demo       boolean NOT NULL DEFAULT true,
          provider      text NOT NULL DEFAULT 'demo',
          note          text,
          created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
          paid_at       timestamptz,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          deleted_at    timestamptz
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_orders_created ON payment_orders(created_at DESC);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created ON payment_orders(user_id, created_at DESC);`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS lessons (
          id          text PRIMARY KEY,
          title       text NOT NULL,
          jlpt_level  text NOT NULL CHECK (jlpt_level IN ('N5','N4','N3','N2','N1')),
          category    text NOT NULL DEFAULT 'Từ vựng',
          summary     text NOT NULL DEFAULT '',
          content_md  text NOT NULL DEFAULT '',
          access_tier text NOT NULL DEFAULT 'free' CHECK (access_tier IN ('free','plus','pro')),
          status      text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
          sort_order  integer NOT NULL DEFAULT 0,
          created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          deleted_at  timestamptz
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_lessons_jlpt_status_order ON lessons(jlpt_level, status, sort_order) WHERE deleted_at IS NULL;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS lesson_items (
          id              text PRIMARY KEY,
          lesson_id       text NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
          word            text NOT NULL,
          reading         text,
          meaning         text NOT NULL,
          sino_vietnamese text,
          example         text,
          example_meaning text,
          sort_order      integer NOT NULL DEFAULT 0,
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now(),
          deleted_at      timestamptz
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_lesson_items_lesson_order ON lesson_items(lesson_id, sort_order) WHERE deleted_at IS NULL;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS lesson_materials (
          id            text PRIMARY KEY,
          lesson_id     text NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
          title         text NOT NULL,
          material_type text NOT NULL CHECK (material_type IN ('file','link')),
          storage_name  text,
          file_name     text,
          mime_type     text,
          file_size     integer,
          external_url  text,
          description   text NOT NULL DEFAULT '',
          sort_order    integer NOT NULL DEFAULT 0,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          deleted_at    timestamptz
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson_order ON lesson_materials(lesson_id, sort_order) WHERE deleted_at IS NULL;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id          text PRIMARY KEY,
          admin_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action      text NOT NULL,
          target_type text NOT NULL,
          target_id   text NOT NULL,
          detail      text NOT NULL DEFAULT '',
          created_at  timestamptz NOT NULL DEFAULT now()
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);`);
    })().catch((err) => {
      adminSchemaPromise = null;
      throw err;
    });
  }
  return adminSchemaPromise;
}
