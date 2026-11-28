import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../config/database.js';
import { appendAdminAuditLog } from '../utils/audit-log.js';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationFailedError,
} from '../utils/errors.js';
import { newFolderId, newVocabId } from '../utils/id.js';
import { ensureAdminAndLessonTables } from './admin-schema.service.js';
import type { AuthUser } from './auth.service.js';
import { resolveUserActiveTier, type SubscriptionTier } from './membership.service.js';

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type LessonStatus = 'draft' | 'published';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'materials');
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const MIME_EXT_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'text/plain': '.txt',
  'text/markdown': '.md',
  'text/x-markdown': '.md',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
};

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};

function hasTierAccess(
  userRole: AuthUser['role'] | null | undefined,
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier,
): boolean {
  if (userRole === 'admin') return true;
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

function sanitizeDownloadFilename(name: string): string {
  const clean = path.basename(name).replace(/[\r\n"\\]/g, '_').trim();
  return clean || 'tai-lieu';
}

function stripBase64Prefix(raw: string): string {
  const idx = raw.indexOf(',');
  return raw.startsWith('data:') && idx >= 0 ? raw.slice(idx + 1) : raw;
}

function resolveSafeMaterialPath(storageName: string): string {
  const safeBase = path.basename(storageName);
  const fullPath = path.resolve(UPLOAD_DIR, safeBase);
  if (!fullPath.startsWith(`${UPLOAD_DIR}${path.sep}`)) {
    throw new ValidationFailedError('Đường dẫn tệp tài liệu không hợp lệ.');
  }
  return fullPath;
}

interface LessonRow {
  id: string;
  title: string;
  jlpt_level: string;
  category: string;
  summary: string;
  content_md: string;
  access_tier: string;
  status: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  item_count?: number;
  material_count?: number;
}

interface LessonItemRow {
  id: string;
  lesson_id: string;
  word: string;
  reading: string | null;
  meaning: string;
  sino_vietnamese: string | null;
  example: string | null;
  example_meaning: string | null;
  sort_order: number;
}

interface LessonMaterialRow {
  id: string;
  lesson_id: string;
  title: string;
  material_type: string;
  storage_name: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  external_url: string | null;
  description: string;
  sort_order: number;
  created_at: Date;
}

function mapLessonSummary(r: LessonRow) {
  return {
    id: r.id,
    title: r.title,
    jlptLevel: r.jlpt_level as JlptLevel,
    category: r.category,
    summary: r.summary,
    contentMd: r.content_md,
    accessTier: (r.access_tier === 'pro' || r.access_tier === 'plus' ? r.access_tier : 'free') as SubscriptionTier,
    status: (r.status === 'draft' ? 'draft' : 'published') as LessonStatus,
    sortOrder: Number(r.sort_order) || 0,
    itemCount: Number(r.item_count ?? 0),
    materialCount: Number(r.material_count ?? 0),
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function mapLessonItem(r: LessonItemRow) {
  return {
    id: r.id,
    lessonId: r.lesson_id,
    word: r.word,
    reading: r.reading,
    meaning: r.meaning,
    sinoVietnamese: r.sino_vietnamese,
    example: r.example,
    exampleMeaning: r.example_meaning,
    sortOrder: Number(r.sort_order) || 0,
  };
}

function mapLessonMaterial(r: LessonMaterialRow) {
  return {
    id: r.id,
    lessonId: r.lesson_id,
    title: r.title,
    materialType: (r.material_type === 'file' ? 'file' : 'link') as 'file' | 'link',
    fileName: r.file_name,
    mimeType: r.mime_type,
    fileSize: r.file_size !== null ? Number(r.file_size) : null,
    externalUrl: r.external_url,
    description: r.description,
    sortOrder: Number(r.sort_order) || 0,
    createdAt: r.created_at.toISOString(),
  };
}

export async function listAdminLessons(params: {
  level: 'ALL' | JlptLevel;
  status: 'all' | LessonStatus;
  q?: string | undefined;
}) {
  await ensureAdminAndLessonTables();
  const clauses = ['l.deleted_at IS NULL'];
  const values: unknown[] = [];

  if (params.level !== 'ALL') {
    values.push(params.level);
    clauses.push(`l.jlpt_level = $${values.length}`);
  }
  if (params.status !== 'all') {
    values.push(params.status);
    clauses.push(`l.status = $${values.length}`);
  }
  const qClean = (params.q ?? '').trim();
  if (qClean) {
    values.push(`%${qClean}%`);
    clauses.push(
      `(l.title ILIKE $${values.length} OR l.summary ILIKE $${values.length} OR l.category ILIKE $${values.length})`,
    );
  }

  const res = await pool.query<LessonRow>(
    `SELECT
       l.*,
       COALESCE(ic.cnt, 0)::int AS item_count,
       COALESCE(mc.cnt, 0)::int AS material_count
     FROM lessons l
     LEFT JOIN (
       SELECT lesson_id, COUNT(*) AS cnt
       FROM lesson_items
       WHERE deleted_at IS NULL
       GROUP BY lesson_id
     ) ic ON ic.lesson_id = l.id
     LEFT JOIN (
       SELECT lesson_id, COUNT(*) AS cnt
       FROM lesson_materials
       WHERE deleted_at IS NULL
       GROUP BY lesson_id
     ) mc ON mc.lesson_id = l.id
     WHERE ${clauses.join(' AND ')}
     ORDER BY l.jlpt_level DESC, l.sort_order ASC, l.created_at DESC`,
    values,
  );

  return { lessons: res.rows.map(mapLessonSummary) };
}

export async function getAdminLessonDetail(lessonId: string) {
  await ensureAdminAndLessonTables();
  const [lessonRes, itemsRes, materialsRes] = await Promise.all([
    pool.query<LessonRow>(
      `SELECT l.*,
         (SELECT COUNT(*)::int FROM lesson_items WHERE lesson_id = l.id AND deleted_at IS NULL) AS item_count,
         (SELECT COUNT(*)::int FROM lesson_materials WHERE lesson_id = l.id AND deleted_at IS NULL) AS material_count
       FROM lessons l
       WHERE l.id = $1 AND l.deleted_at IS NULL`,
      [lessonId],
    ),
    pool.query<LessonItemRow>(
      `SELECT * FROM lesson_items
       WHERE lesson_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [lessonId],
    ),
    pool.query<LessonMaterialRow>(
      `SELECT * FROM lesson_materials
       WHERE lesson_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [lessonId],
    ),
  ]);

  const row = lessonRes.rows[0];
  if (!row) {
    throw new NotFoundError('Không tìm thấy bài học.');
  }

  return {
    lesson: mapLessonSummary(row),
    items: itemsRes.rows.map(mapLessonItem),
    materials: materialsRes.rows.map(mapLessonMaterial),
  };
}

export async function createLesson(
  adminId: string,
  input: {
    title: string;
    jlptLevel: JlptLevel;
    category: string;
    summary: string;
    contentMd: string;
    accessTier: SubscriptionTier;
    status: LessonStatus;
    sortOrder: number;
  },
) {
  await ensureAdminAndLessonTables();
  const id = `lesson_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<LessonRow>(
      `INSERT INTO lessons
        (id, title, jlpt_level, category, summary, content_md, access_tier, status, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        input.title,
        input.jlptLevel,
        input.category,
        input.summary,
        input.contentMd,
        input.accessTier,
        input.status,
        input.sortOrder,
        adminId,
      ],
    );
    await appendAdminAuditLog(client, {
      adminId,
      action: 'lesson_create',
      targetType: 'lesson',
      targetId: id,
      detail: `Tạo bài học ${input.jlptLevel}: "${input.title}" (${input.accessTier}, ${input.status})`,
    });
    await client.query('COMMIT');
    return mapLessonSummary(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateLesson(
  adminId: string,
  lessonId: string,
  input: {
    title?: string | undefined;
    jlptLevel?: JlptLevel | undefined;
    category?: string | undefined;
    summary?: string | undefined;
    contentMd?: string | undefined;
    accessTier?: SubscriptionTier | undefined;
    status?: LessonStatus | undefined;
    sortOrder?: number | undefined;
  },
) {
  await ensureAdminAndLessonTables();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query<LessonRow>(
      `SELECT * FROM lessons WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [lessonId],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new NotFoundError('Không tìm thấy bài học.');
    }

    const res = await client.query<LessonRow>(
      `UPDATE lessons
       SET title = $2,
           jlpt_level = $3,
           category = $4,
           summary = $5,
           content_md = $6,
           access_tier = $7,
           status = $8,
           sort_order = $9,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        lessonId,
        input.title ?? existing.title,
        input.jlptLevel ?? existing.jlpt_level,
        input.category ?? existing.category,
        input.summary ?? existing.summary,
        input.contentMd ?? existing.content_md,
        input.accessTier ?? existing.access_tier,
        input.status ?? existing.status,
        input.sortOrder ?? existing.sort_order,
      ],
    );

    await appendAdminAuditLog(client, {
      adminId,
      action: 'lesson_update',
      targetType: 'lesson',
      targetId: lessonId,
      detail: `Cập nhật bài học "${res.rows[0]!.title}"`,
    });
    await client.query('COMMIT');
    return mapLessonSummary(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteLesson(adminId: string, lessonId: string) {
  await ensureAdminAndLessonTables();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string; title: string }>(
      `UPDATE lessons
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, title`,
      [lessonId],
    );
    if (!res.rows[0]) {
      throw new NotFoundError('Không tìm thấy bài học.');
    }
    await appendAdminAuditLog(client, {
      adminId,
      action: 'lesson_delete',
      targetType: 'lesson',
      targetId: lessonId,
      detail: `Xóa bài học "${res.rows[0].title}"`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return { ok: true };
}

export async function addLessonItem(
  lessonId: string,
  input: {
    word: string;
    reading?: string | null | undefined;
    meaning: string;
    sinoVietnamese?: string | null | undefined;
    example?: string | null | undefined;
    exampleMeaning?: string | null | undefined;
    sortOrder?: number | undefined;
  },
) {
  await ensureAdminAndLessonTables();
  const exists = await pool.query<{ id: string }>(
    `SELECT id FROM lessons WHERE id = $1 AND deleted_at IS NULL`,
    [lessonId],
  );
  if (!exists.rows[0]) {
    throw new NotFoundError('Không tìm thấy bài học.');
  }

  const maxOrderRes = await pool.query<{ next_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM lesson_items WHERE lesson_id = $1 AND deleted_at IS NULL`,
    [lessonId],
  );
  const sortOrder = input.sortOrder ?? Number(maxOrderRes.rows[0]?.next_order ?? 0);
  const id = `litem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const res = await pool.query<LessonItemRow>(
    `INSERT INTO lesson_items
      (id, lesson_id, word, reading, meaning, sino_vietnamese, example, example_meaning, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      lessonId,
      input.word.trim(),
      input.reading?.trim() || null,
      input.meaning.trim(),
      input.sinoVietnamese?.trim() || null,
      input.example?.trim() || null,
      input.exampleMeaning?.trim() || null,
      sortOrder,
    ],
  );
  return mapLessonItem(res.rows[0]!);
}

export async function bulkAddLessonItems(
  adminId: string,
  lessonId: string,
  items: Array<{
    word: string;
    reading?: string | null | undefined;
    meaning: string;
    sinoVietnamese?: string | null | undefined;
    example?: string | null | undefined;
    exampleMeaning?: string | null | undefined;
  }>,
) {
  await ensureAdminAndLessonTables();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query<{ id: string; title: string }>(
      `SELECT id, title FROM lessons WHERE id = $1 AND deleted_at IS NULL`,
      [lessonId],
    );
    if (!exists.rows[0]) {
      throw new NotFoundError('Không tìm thấy bài học.');
    }

    const maxOrderRes = await client.query<{ next_order: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM lesson_items WHERE lesson_id = $1 AND deleted_at IS NULL`,
      [lessonId],
    );
    let nextOrder = Number(maxOrderRes.rows[0]?.next_order ?? 0);

    const inserted: ReturnType<typeof mapLessonItem>[] = [];
    for (const item of items) {
      const id = `litem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const res = await client.query<LessonItemRow>(
        `INSERT INTO lesson_items
          (id, lesson_id, word, reading, meaning, sino_vietnamese, example, example_meaning, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          id,
          lessonId,
          item.word.trim(),
          item.reading?.trim() || null,
          item.meaning.trim(),
          item.sinoVietnamese?.trim() || null,
          item.example?.trim() || null,
          item.exampleMeaning?.trim() || null,
          nextOrder,
        ],
      );
      inserted.push(mapLessonItem(res.rows[0]!));
      nextOrder += 1;
    }

    await appendAdminAuditLog(client, {
      adminId,
      action: 'lesson_items_bulk_add',
      targetType: 'lesson',
      targetId: lessonId,
      detail: `Thêm hàng loạt ${inserted.length} từ vào "${exists.rows[0].title}"`,
    });
    await client.query('COMMIT');
    return { addedCount: inserted.length, items: inserted };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateLessonItem(
  lessonId: string,
  itemId: string,
  input: {
    word?: string | undefined;
    reading?: string | null | undefined;
    meaning?: string | undefined;
    sinoVietnamese?: string | null | undefined;
    example?: string | null | undefined;
    exampleMeaning?: string | null | undefined;
    sortOrder?: number | undefined;
  },
) {
  await ensureAdminAndLessonTables();
  const existingRes = await pool.query<LessonItemRow>(
    `SELECT * FROM lesson_items WHERE id = $1 AND lesson_id = $2 AND deleted_at IS NULL`,
    [itemId, lessonId],
  );
  const existing = existingRes.rows[0];
  if (!existing) {
    throw new NotFoundError('Không tìm thấy từ vựng trong bài học.');
  }

  const nextWord = input.word !== undefined ? input.word.trim() : existing.word;
  const nextReading =
    input.reading !== undefined ? (input.reading?.trim() || null) : existing.reading;
  const nextMeaning = input.meaning !== undefined ? input.meaning.trim() : existing.meaning;
  const nextSino =
    input.sinoVietnamese !== undefined
      ? (input.sinoVietnamese?.trim() || null)
      : existing.sino_vietnamese;
  const nextExample =
    input.example !== undefined ? (input.example?.trim() || null) : existing.example;
  const nextExampleMeaning =
    input.exampleMeaning !== undefined
      ? (input.exampleMeaning?.trim() || null)
      : existing.example_meaning;
  const nextOrder = input.sortOrder !== undefined ? input.sortOrder : existing.sort_order;

  const updatedRes = await pool.query<LessonItemRow>(
    `UPDATE lesson_items
     SET word = $3,
         reading = $4,
         meaning = $5,
         sino_vietnamese = $6,
         example = $7,
         example_meaning = $8,
         sort_order = $9,
         updated_at = now()
     WHERE id = $1 AND lesson_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [
      itemId,
      lessonId,
      nextWord,
      nextReading,
      nextMeaning,
      nextSino,
      nextExample,
      nextExampleMeaning,
      nextOrder,
    ],
  );

  return mapLessonItem(updatedRes.rows[0]!);
}

export async function deleteLessonItem(lessonId: string, itemId: string) {
  await ensureAdminAndLessonTables();
  const res = await pool.query<{ id: string }>(
    `UPDATE lesson_items
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND lesson_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [itemId, lessonId],
  );
  if (!res.rows[0]) {
    throw new NotFoundError('Không tìm thấy từ vựng trong bài học.');
  }
  return { ok: true };
}

export async function uploadLessonMaterialFile(
  adminId: string,
  lessonId: string,
  input: {
    title: string;
    fileName: string;
    mimeType: string;
    base64Data: string;
    description: string;
  },
) {
  await ensureAdminAndLessonTables();
  const normalizedMime = input.mimeType.trim().toLowerCase();
  const ext = MIME_EXT_MAP[normalizedMime];
  if (!ext) {
    throw new ValidationFailedError(
      'Định dạng tệp chưa được hỗ trợ. Chỉ nhận PDF, PNG/JPG/WEBP, TXT/MD, DOCX/PPTX và MP3/M4A/WAV.',
    );
  }

  const b64 = stripBase64Prefix(input.base64Data.trim());
  const buf = Buffer.from(b64, 'base64');
  if (buf.length === 0) {
    throw new ValidationFailedError('Tệp tải lên bị rỗng.');
  }
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new ValidationFailedError('Tệp vượt quá giới hạn tối đa 15 MB.');
  }

  const lessonRes = await pool.query<{ id: string; title: string }>(
    `SELECT id, title FROM lessons WHERE id = $1 AND deleted_at IS NULL`,
    [lessonId],
  );
  if (!lessonRes.rows[0]) {
    throw new NotFoundError('Không tìm thấy bài học.');
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const storageName = `${crypto.randomUUID()}${ext}`;
  const fullPath = resolveSafeMaterialPath(storageName);
  await fs.writeFile(fullPath, buf);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const maxOrderRes = await client.query<{ next_order: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM lesson_materials WHERE lesson_id = $1 AND deleted_at IS NULL`,
      [lessonId],
    );
    const sortOrder = Number(maxOrderRes.rows[0]?.next_order ?? 0);
    const id = `mat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const storedMime = normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime;

    const res = await client.query<LessonMaterialRow>(
      `INSERT INTO lesson_materials
        (id, lesson_id, title, material_type, storage_name, file_name, mime_type, file_size, description, sort_order)
       VALUES ($1, $2, $3, 'file', $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        lessonId,
        input.title.trim(),
        storageName,
        sanitizeDownloadFilename(input.fileName),
        storedMime,
        buf.length,
        input.description,
        sortOrder,
      ],
    );

    await appendAdminAuditLog(client, {
      adminId,
      action: 'lesson_material_upload',
      targetType: 'lesson',
      targetId: lessonId,
      detail: `Tải lên tài liệu "${input.title.trim()}" (${sanitizeDownloadFilename(input.fileName)}) cho "${lessonRes.rows[0].title}"`,
    });
    await client.query('COMMIT');
    return mapLessonMaterial(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    await fs.unlink(fullPath).catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function addLessonMaterialLink(
  adminId: string,
  lessonId: string,
  input: {
    title: string;
    externalUrl: string;
    description: string;
  },
) {
  await ensureAdminAndLessonTables();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lessonRes = await client.query<{ id: string; title: string }>(
      `SELECT id, title FROM lessons WHERE id = $1 AND deleted_at IS NULL`,
      [lessonId],
    );
    if (!lessonRes.rows[0]) {
      throw new NotFoundError('Không tìm thấy bài học.');
    }

    const maxOrderRes = await client.query<{ next_order: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM lesson_materials WHERE lesson_id = $1 AND deleted_at IS NULL`,
      [lessonId],
    );
    const sortOrder = Number(maxOrderRes.rows[0]?.next_order ?? 0);
    const id = `mat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const res = await client.query<LessonMaterialRow>(
      `INSERT INTO lesson_materials
        (id, lesson_id, title, material_type, external_url, description, sort_order)
       VALUES ($1, $2, $3, 'link', $4, $5, $6)
       RETURNING *`,
      [id, lessonId, input.title.trim(), input.externalUrl.trim(), input.description, sortOrder],
    );

    await appendAdminAuditLog(client, {
      adminId,
      action: 'lesson_material_link',
      targetType: 'lesson',
      targetId: lessonId,
      detail: `Gắn liên kết "${input.title.trim()}" cho "${lessonRes.rows[0].title}"`,
    });
    await client.query('COMMIT');
    return mapLessonMaterial(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteLessonMaterial(adminId: string, lessonId: string, materialId: string) {
  await ensureAdminAndLessonTables();
  let storageNameToDelete: string | null = null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string; title: string; storage_name: string | null }>(
      `UPDATE lesson_materials
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND lesson_id = $2 AND deleted_at IS NULL
       RETURNING id, title, storage_name`,
      [materialId, lessonId],
    );
    const row = res.rows[0];
    if (!row) {
      throw new NotFoundError('Không tìm thấy tài liệu.');
    }
    storageNameToDelete = row.storage_name;
    await appendAdminAuditLog(client, {
      adminId,
      action: 'lesson_material_delete',
      targetType: 'lesson',
      targetId: lessonId,
      detail: `Xóa tài liệu "${row.title}"`,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (storageNameToDelete) {
    try {
      const fullPath = resolveSafeMaterialPath(storageNameToDelete);
      await fs.unlink(fullPath).catch(() => undefined);
    } catch {
      // ignore invalid path cleanup
    }
  }
  return { ok: true };
}

export async function listPublicLessons(user: AuthUser | null, level: 'ALL' | JlptLevel = 'ALL') {
  await ensureAdminAndLessonTables();
  const userTier: SubscriptionTier = user ? await resolveUserActiveTier(user.id) : 'free';

  const [allRes, countsRes] = await Promise.all([
    pool.query<LessonRow>(
      `SELECT
         l.*,
         COALESCE(ic.cnt, 0)::int AS item_count,
         COALESCE(mc.cnt, 0)::int AS material_count
       FROM lessons l
       LEFT JOIN (
         SELECT lesson_id, COUNT(*) AS cnt FROM lesson_items WHERE deleted_at IS NULL GROUP BY lesson_id
       ) ic ON ic.lesson_id = l.id
       LEFT JOIN (
         SELECT lesson_id, COUNT(*) AS cnt FROM lesson_materials WHERE deleted_at IS NULL GROUP BY lesson_id
       ) mc ON mc.lesson_id = l.id
       WHERE l.deleted_at IS NULL
         AND l.status = 'published'
         ${level !== 'ALL' ? 'AND l.jlpt_level = $1' : ''}
       ORDER BY l.sort_order ASC, l.created_at DESC`,
      level !== 'ALL' ? [level] : [],
    ),
    pool.query<{ jlpt_level: string; cnt: number }>(
      `SELECT jlpt_level, COUNT(*)::int AS cnt
       FROM lessons
       WHERE deleted_at IS NULL AND status = 'published'
       GROUP BY jlpt_level`,
    ),
  ]);

  const levelCounts: Record<JlptLevel, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
  for (const r of countsRes.rows) {
    if (r.jlpt_level in levelCounts) {
      levelCounts[r.jlpt_level as JlptLevel] = Number(r.cnt) || 0;
    }
  }

  const lessons = allRes.rows.map((r) => {
    const mapped = mapLessonSummary(r);
    const locked = !hasTierAccess(user?.role, userTier, mapped.accessTier);
    return {
      ...mapped,
      contentMd: locked ? '' : mapped.contentMd,
      locked,
    };
  });

  return { lessons, levelCounts, userTier };
}

export async function getPublicLessonDetail(user: AuthUser | null, lessonId: string) {
  await ensureAdminAndLessonTables();
  const userTier: SubscriptionTier = user ? await resolveUserActiveTier(user.id) : 'free';

  const lessonRes = await pool.query<LessonRow>(
    `SELECT l.*,
       (SELECT COUNT(*)::int FROM lesson_items WHERE lesson_id = l.id AND deleted_at IS NULL) AS item_count,
       (SELECT COUNT(*)::int FROM lesson_materials WHERE lesson_id = l.id AND deleted_at IS NULL) AS material_count
     FROM lessons l
     WHERE l.id = $1 AND l.deleted_at IS NULL`,
    [lessonId],
  );
  const row = lessonRes.rows[0];
  if (!row || (row.status !== 'published' && user?.role !== 'admin')) {
    throw new NotFoundError('Không tìm thấy bài học.');
  }

  const lesson = mapLessonSummary(row);
  const unlocked = hasTierAccess(user?.role, userTier, lesson.accessTier);

  if (!unlocked) {
    return {
      lesson: { ...lesson, contentMd: '' },
      locked: true,
      userTier,
      items: [] as ReturnType<typeof mapLessonItem>[],
      materials: [] as ReturnType<typeof mapLessonMaterial>[],
    };
  }

  const [itemsRes, materialsRes] = await Promise.all([
    pool.query<LessonItemRow>(
      `SELECT * FROM lesson_items
       WHERE lesson_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [lessonId],
    ),
    pool.query<LessonMaterialRow>(
      `SELECT * FROM lesson_materials
       WHERE lesson_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [lessonId],
    ),
  ]);

  return {
    lesson,
    locked: false,
    userTier,
    items: itemsRes.rows.map(mapLessonItem),
    materials: materialsRes.rows.map(mapLessonMaterial),
  };
}

export async function resolveMaterialDownload(user: AuthUser | null, materialId: string) {
  await ensureAdminAndLessonTables();
  const userTier: SubscriptionTier = user ? await resolveUserActiveTier(user.id) : 'free';

  const res = await pool.query<{
    id: string;
    material_type: string;
    storage_name: string | null;
    file_name: string | null;
    mime_type: string | null;
    lesson_status: string;
    access_tier: string;
  }>(
    `SELECT
       m.id, m.material_type, m.storage_name, m.file_name, m.mime_type,
       l.status AS lesson_status,
       l.access_tier
     FROM lesson_materials m
     INNER JOIN lessons l ON l.id = m.lesson_id
     WHERE m.id = $1 AND m.deleted_at IS NULL AND l.deleted_at IS NULL`,
    [materialId],
  );
  const row = res.rows[0];
  if (!row || row.material_type !== 'file' || !row.storage_name) {
    throw new NotFoundError('Không tìm thấy tệp tài liệu.');
  }
  if (row.lesson_status !== 'published' && user?.role !== 'admin') {
    throw new NotFoundError('Tài liệu này chưa được công khai.');
  }

  const reqTier = (row.access_tier === 'pro' || row.access_tier === 'plus' ? row.access_tier : 'free') as SubscriptionTier;
  if (!hasTierAccess(user?.role, userTier, reqTier)) {
    if (!user) {
      throw new UnauthorizedError('Vui lòng đăng nhập để tải tài liệu của bài học này.');
    }
    throw new ForbiddenError(
      `Tài liệu này yêu cầu gói ${reqTier === 'pro' ? 'Pro AI' : 'Plus'} trở lên.`,
    );
  }

  const filePath = resolveSafeMaterialPath(row.storage_name);
  return {
    filePath,
    fileName: sanitizeDownloadFilename(row.file_name || row.storage_name),
    mimeType: row.mime_type || 'application/octet-stream',
  };
}

export async function saveLessonToUserFlashcards(user: AuthUser, lessonId: string) {
  await ensureAdminAndLessonTables();
  const userTier = await resolveUserActiveTier(user.id);

  const lessonRes = await pool.query<LessonRow>(
    `SELECT * FROM lessons WHERE id = $1 AND deleted_at IS NULL`,
    [lessonId],
  );
  const row = lessonRes.rows[0];
  if (!row || (row.status !== 'published' && user.role !== 'admin')) {
    throw new NotFoundError('Không tìm thấy bài học.');
  }
  const lesson = mapLessonSummary(row);
  if (!hasTierAccess(user.role, userTier, lesson.accessTier)) {
    throw new ForbiddenError(
      `Bài học này yêu cầu gói ${lesson.accessTier === 'pro' ? 'Pro AI' : 'Plus'} trở lên.`,
    );
  }

  const itemsRes = await pool.query<LessonItemRow>(
    `SELECT * FROM lesson_items
     WHERE lesson_id = $1 AND deleted_at IS NULL
     ORDER BY sort_order ASC, created_at ASC`,
    [lessonId],
  );
  if (itemsRes.rows.length === 0) {
    throw new ValidationFailedError('Bài học này chưa có từ vựng để lưu vào Flashcard.');
  }

  const folderName = `[${lesson.jlptLevel}] ${lesson.title}`.slice(0, 120);
  const client = await pool.connect();
  let folderId = '';
  let addedCount = 0;
  let skippedCount = 0;

  try {
    await client.query('BEGIN');
    const existingFolder = await client.query<{ id: string }>(
      `SELECT id FROM folders
       WHERE owner_id = $1 AND name = $2 AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT 1`,
      [user.id, folderName],
    );
    const nowIso = new Date().toISOString();

    if (existingFolder.rows[0]) {
      folderId = existingFolder.rows[0].id;
    } else {
      folderId = newFolderId();
      await client.query(
        `INSERT INTO folders (id, owner_id, name, parent_id, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, 0, $4, $4)`,
        [folderId, user.id, folderName, nowIso],
      );
    }

    const existingVocabRes = await client.query<{ word: string; reading: string | null }>(
      `SELECT v.word, v.reading
       FROM vocabularies v
       INNER JOIN vocabulary_folders vf ON vf.vocabulary_id = v.id
       WHERE v.owner_id = $1 AND vf.folder_id = $2 AND v.deleted_at IS NULL`,
      [user.id, folderId],
    );
    const existingKeys = new Set(
      existingVocabRes.rows.map((v) => `${v.word.trim()}::${(v.reading ?? '').trim()}`),
    );

    for (const item of itemsRes.rows) {
      const key = `${item.word.trim()}::${(item.reading ?? '').trim()}`;
      if (existingKeys.has(key)) {
        skippedCount += 1;
        continue;
      }
      existingKeys.add(key);

      const vocabId = newVocabId();
      await client.query(
        `INSERT INTO vocabularies
          (id, owner_id, word, meaning, reading, sino_vietnamese, example, example_meaning, jlpt_level, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [
          vocabId,
          user.id,
          item.word,
          item.meaning,
          item.reading,
          item.sino_vietnamese,
          item.example,
          item.example_meaning,
          lesson.jlptLevel,
          nowIso,
        ],
      );
      await client.query(
        `INSERT INTO vocabulary_folders (vocabulary_id, folder_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [vocabId, folderId],
      );
      addedCount += 1;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { folderId, folderName, addedCount, skippedCount };
}
