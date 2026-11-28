import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../config/database.js';
import { ensureStudyStateTables } from './study-state.service.js';

let adminSchemaPromise: Promise<void> | null = null;
const LESSON_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'materials');

/** Đảm bảo bảng & cột cho Admin RBAC, Đơn hàng doanh thu, Bài học, Tài liệu, Shadowing và Ngữ pháp JLPT tồn tại (idempotent). */
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
          file_data     bytea,
          external_url  text,
          description   text NOT NULL DEFAULT '',
          sort_order    integer NOT NULL DEFAULT 0,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          deleted_at    timestamptz
        );
      `);
      await pool.query(`ALTER TABLE lesson_materials ADD COLUMN IF NOT EXISTS file_data bytea;`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson_order ON lesson_materials(lesson_id, sort_order) WHERE deleted_at IS NULL;`);

      // Auto-backfill legacy uploaded files from local disk into PostgreSQL bytea so all machines can serve them.
      const legacyFiles = await pool.query<{ id: string; storage_name: string }>(
        `SELECT id, storage_name
         FROM lesson_materials
         WHERE material_type = 'file'
           AND file_data IS NULL
           AND storage_name IS NOT NULL
           AND deleted_at IS NULL`,
      );
      for (const row of legacyFiles.rows) {
        const safeBase = path.basename(row.storage_name);
        const fullPath = path.resolve(LESSON_UPLOAD_DIR, safeBase);
        if (!fullPath.startsWith(`${LESSON_UPLOAD_DIR}${path.sep}`)) continue;
        try {
          const buf = await fs.readFile(fullPath);
          if (buf.byteLength > 0) {
            await pool.query(
              `UPDATE lesson_materials SET file_data = $1, file_size = COALESCE(file_size, $2) WHERE id = $3 AND file_data IS NULL`,
              [buf, buf.byteLength, row.id],
            );
          }
        } catch {
          // Legacy file not present on this machine; runtime download will report NotFound cleanly.
        }
      }

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

      await pool.query(`
        CREATE TABLE IF NOT EXISTS content_seed_meta (
          seed_key  text PRIMARY KEY,
          seeded_at timestamptz NOT NULL DEFAULT now()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_shadowing_videos (
          id          text PRIMARY KEY,
          video_id    text NOT NULL,
          title       text NOT NULL,
          channel     text NOT NULL DEFAULT '',
          level       text NOT NULL DEFAULT '',
          duration    text NOT NULL DEFAULT '',
          description text NOT NULL DEFAULT '',
          status      text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
          sort_order  integer NOT NULL DEFAULT 0,
          created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          deleted_at  timestamptz
        );
      `);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_shadowing_active_vid ON admin_shadowing_videos(video_id) WHERE deleted_at IS NULL;`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_shadowing_status ON admin_shadowing_videos(status, sort_order, created_at DESC) WHERE deleted_at IS NULL;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_shadowing_videos (
          id          text PRIMARY KEY,
          owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          video_id    text NOT NULL,
          title       text NOT NULL,
          channel     text NOT NULL DEFAULT 'YouTube (Đã lưu)',
          level       text NOT NULL DEFAULT '',
          duration    text NOT NULL DEFAULT '',
          description text NOT NULL DEFAULT '',
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          deleted_at  timestamptz
        );
      `);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_shadowing_owner_vid ON user_shadowing_videos(owner_id, video_id) WHERE deleted_at IS NULL;`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_shadowing_owner ON user_shadowing_videos(owner_id, created_at DESC) WHERE deleted_at IS NULL;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS grammar_points (
          id          text PRIMARY KEY,
          jlpt_level  text NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
          category    text NOT NULL,
          pattern     text NOT NULL,
          structure   text NOT NULL,
          meaning_vi  text NOT NULL,
          nuance_vi   text NOT NULL DEFAULT '',
          examples    jsonb NOT NULL DEFAULT '[]'::jsonb,
          status      text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
          sort_order  integer NOT NULL DEFAULT 0,
          created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          deleted_at  timestamptz
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_grammar_points_filter ON grammar_points(jlpt_level, status, sort_order, created_at) WHERE deleted_at IS NULL;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS grammar_star_questions (
          id             text PRIMARY KEY,
          jlpt_level     text NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
          meaning_vi     text NOT NULL,
          prefix_ja      text NOT NULL DEFAULT '',
          suffix_ja      text NOT NULL DEFAULT '',
          parts          jsonb NOT NULL,
          star_index     integer NOT NULL CHECK (star_index BETWEEN 0 AND 3),
          explanation_vi text NOT NULL DEFAULT '',
          status         text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
          sort_order     integer NOT NULL DEFAULT 0,
          created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at     timestamptz NOT NULL DEFAULT now(),
          updated_at     timestamptz NOT NULL DEFAULT now(),
          deleted_at     timestamptz
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_grammar_star_filter ON grammar_star_questions(jlpt_level, status, sort_order, created_at) WHERE deleted_at IS NULL;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS grammar_blitz_questions (
          id          text PRIMARY KEY,
          kind        text NOT NULL CHECK (kind IN ('particle', 'conjugation')),
          jlpt_level  text NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
          prompt_main text NOT NULL,
          prompt_sub  text NOT NULL DEFAULT '',
          meaning_vi  text NOT NULL,
          correct     text NOT NULL,
          choices     jsonb NOT NULL,
          tip_vi      text NOT NULL DEFAULT '',
          status      text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
          sort_order  integer NOT NULL DEFAULT 0,
          created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          deleted_at  timestamptz
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_grammar_blitz_filter ON grammar_blitz_questions(kind, jlpt_level, status, sort_order, created_at) WHERE deleted_at IS NULL;`);
    })().catch((err) => {
      adminSchemaPromise = null;
      throw err;
    });
  }
  return adminSchemaPromise;
}
