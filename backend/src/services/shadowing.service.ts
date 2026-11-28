import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { INITIAL_SHADOWING_VIDEOS } from '../seeds/shadowing-seed.data.js';
import { appendAdminAuditLog } from '../utils/audit-log.js';
import { DuplicateError, NotFoundError, ValidationFailedError } from '../utils/errors.js';
import { extractYouTubeVideoId } from '../validators/shadowing.js';
import { ensureAdminAndLessonTables } from './admin-schema.service.js';
import type { AuthUser } from './auth.service.js';

export type ShadowingStatus = 'published' | 'hidden';

interface AdminShadowingRow {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  level: string;
  duration: string;
  description: string;
  status: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface UserShadowingRow {
  id: string;
  owner_id: string;
  video_id: string;
  title: string;
  channel: string;
  level: string;
  duration: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

function mapAdminVideo(r: AdminShadowingRow) {
  return {
    id: r.id,
    videoId: r.video_id,
    title: r.title,
    channel: r.channel,
    level: r.level,
    duration: r.duration,
    description: r.description,
    status: (r.status === 'hidden' ? 'hidden' : 'published') as ShadowingStatus,
    sortOrder: Number(r.sort_order) || 0,
    source: 'admin' as const,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function mapUserVideo(r: UserShadowingRow) {
  return {
    id: r.id,
    videoId: r.video_id,
    title: r.title,
    channel: r.channel,
    level: r.level,
    duration: r.duration,
    description: r.description,
    source: 'user' as const,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

let shadowingSeedPromise: Promise<void> | null = null;

/** Seed 1 lần duy nhất 3 video Shadowing ban đầu vào PostgreSQL nếu chưa từng seed. */
export function ensureShadowingSeeded(): Promise<void> {
  if (!shadowingSeedPromise) {
    shadowingSeedPromise = (async () => {
      await ensureAdminAndLessonTables();
      const seededCheck = await pool.query<{ seed_key: string }>(
        `SELECT seed_key FROM content_seed_meta WHERE seed_key = 'shadowing_v1'`,
      );
      if (seededCheck.rows[0]) return;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const recheck = await client.query<{ seed_key: string }>(
          `SELECT seed_key FROM content_seed_meta WHERE seed_key = 'shadowing_v1' FOR UPDATE`,
        );
        if (!recheck.rows[0]) {
          for (const item of INITIAL_SHADOWING_VIDEOS) {
            await client.query(
              `INSERT INTO admin_shadowing_videos
                (id, video_id, title, channel, level, duration, description, status, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8)
               ON CONFLICT (id) DO NOTHING`,
              [
                item.id,
                item.videoId,
                item.title,
                item.channel,
                item.level,
                item.duration,
                item.description,
                item.sortOrder,
              ],
            );
          }
          await client.query(
            `INSERT INTO content_seed_meta (seed_key) VALUES ('shadowing_v1') ON CONFLICT (seed_key) DO NOTHING`,
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    })().catch((err) => {
      shadowingSeedPromise = null;
      throw err;
    });
  }
  return shadowingSeedPromise;
}

async function fetchYouTubeOEmbed(
  videoId: string,
): Promise<{ title?: string; channel?: string } | null> {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { title?: unknown; author_name?: unknown };
    const out: { title?: string; channel?: string } = {};
    if (typeof data.title === 'string' && data.title.trim()) {
      out.title = data.title.trim().slice(0, 240);
    }
    if (typeof data.author_name === 'string' && data.author_name.trim()) {
      out.channel = data.author_name.trim().slice(0, 160);
    }
    return out;
  } catch {
    return null;
  }
}

export async function listAdminShadowingVideos(params: {
  status: 'all' | ShadowingStatus;
  q?: string | undefined;
}) {
  await ensureShadowingSeeded();
  const clauses = ['deleted_at IS NULL'];
  const values: unknown[] = [];

  if (params.status !== 'all') {
    values.push(params.status);
    clauses.push(`status = $${values.length}`);
  }
  const qClean = (params.q ?? '').trim();
  if (qClean) {
    values.push(`%${qClean}%`);
    clauses.push(
      `(title ILIKE $${values.length} OR channel ILIKE $${values.length} OR video_id ILIKE $${values.length} OR level ILIKE $${values.length})`,
    );
  }

  const res = await pool.query<AdminShadowingRow>(
    `SELECT * FROM admin_shadowing_videos
     WHERE ${clauses.join(' AND ')}
     ORDER BY sort_order ASC, created_at DESC`,
    values,
  );
  return { videos: res.rows.map(mapAdminVideo) };
}

export async function createAdminShadowingVideo(
  adminId: string,
  input: {
    urlOrId: string;
    title: string;
    channel: string;
    level: string;
    duration: string;
    description: string;
    status: ShadowingStatus;
    sortOrder: number;
  },
) {
  await ensureShadowingSeeded();
  const videoId = extractYouTubeVideoId(input.urlOrId);
  if (!videoId) {
    throw new ValidationFailedError('Link hoặc mã video YouTube không hợp lệ (cần ID 11 ký tự hoặc URL YouTube).');
  }

  const dupRes = await pool.query<{ id: string }>(
    `SELECT id FROM admin_shadowing_videos WHERE video_id = $1 AND deleted_at IS NULL`,
    [videoId],
  );
  if (dupRes.rows[0]) {
    throw new DuplicateError(`Video YouTube (${videoId}) đã có trong danh sách quản trị.`);
  }

  let resolvedTitle = input.title.trim();
  let resolvedChannel = input.channel.trim();
  if (!resolvedTitle || !resolvedChannel) {
    const oembed = await fetchYouTubeOEmbed(videoId);
    if (!resolvedTitle) resolvedTitle = oembed?.title ?? `YouTube Shadowing (${videoId})`;
    if (!resolvedChannel) resolvedChannel = oembed?.channel ?? 'YouTube';
  }

  const id = `shv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<AdminShadowingRow>(
      `INSERT INTO admin_shadowing_videos
        (id, video_id, title, channel, level, duration, description, status, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        videoId,
        resolvedTitle,
        resolvedChannel,
        input.level.trim(),
        input.duration.trim(),
        input.description.trim(),
        input.status,
        input.sortOrder,
        adminId,
      ],
    );
    await appendAdminAuditLog(client, {
      adminId,
      action: 'shadowing_video_create',
      targetType: 'shadowing_video',
      targetId: id,
      detail: `Thêm video Shadowing "${resolvedTitle}" (${videoId})`,
    });
    await client.query('COMMIT');
    return mapAdminVideo(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateAdminShadowingVideo(
  adminId: string,
  id: string,
  input: {
    urlOrId?: string | undefined;
    title?: string | undefined;
    channel?: string | undefined;
    level?: string | undefined;
    duration?: string | undefined;
    description?: string | undefined;
    status?: ShadowingStatus | undefined;
    sortOrder?: number | undefined;
  },
) {
  await ensureShadowingSeeded();
  let nextVideoId: string | undefined;
  if (input.urlOrId !== undefined) {
    const parsedId = extractYouTubeVideoId(input.urlOrId);
    if (!parsedId) {
      throw new ValidationFailedError('Link hoặc mã video YouTube không hợp lệ.');
    }
    nextVideoId = parsedId;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query<AdminShadowingRow>(
      `SELECT * FROM admin_shadowing_videos WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new NotFoundError('Không tìm thấy video Shadowing.');
    }

    const finalVideoId = nextVideoId ?? existing.video_id;
    if (finalVideoId !== existing.video_id) {
      const dupRes = await client.query<{ id: string }>(
        `SELECT id FROM admin_shadowing_videos WHERE video_id = $1 AND id <> $2 AND deleted_at IS NULL`,
        [finalVideoId, id],
      );
      if (dupRes.rows[0]) {
        throw new DuplicateError(`Video YouTube (${finalVideoId}) đã tồn tại trong danh sách.`);
      }
    }

    const res = await client.query<AdminShadowingRow>(
      `UPDATE admin_shadowing_videos
       SET video_id = $2,
           title = $3,
           channel = $4,
           level = $5,
           duration = $6,
           description = $7,
           status = $8,
           sort_order = $9,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        finalVideoId,
        input.title !== undefined ? input.title.trim() : existing.title,
        input.channel !== undefined ? input.channel.trim() : existing.channel,
        input.level !== undefined ? input.level.trim() : existing.level,
        input.duration !== undefined ? input.duration.trim() : existing.duration,
        input.description !== undefined ? input.description.trim() : existing.description,
        input.status ?? existing.status,
        input.sortOrder ?? existing.sort_order,
      ],
    );

    const updated = res.rows[0]!;
    const detail =
      input.status && input.status !== existing.status
        ? `${input.status === 'hidden' ? 'Ẩn' : 'Hiển thị'} video Shadowing "${updated.title}"`
        : `Cập nhật video Shadowing "${updated.title}"`;
    await appendAdminAuditLog(client, {
      adminId,
      action: 'shadowing_video_update',
      targetType: 'shadowing_video',
      targetId: id,
      detail,
    });
    await client.query('COMMIT');
    return mapAdminVideo(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAdminShadowingVideo(adminId: string, id: string) {
  await ensureShadowingSeeded();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string; title: string }>(
      `UPDATE admin_shadowing_videos
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, title`,
      [id],
    );
    if (!res.rows[0]) {
      throw new NotFoundError('Không tìm thấy video Shadowing.');
    }
    await appendAdminAuditLog(client, {
      adminId,
      action: 'shadowing_video_delete',
      targetType: 'shadowing_video',
      targetId: id,
      detail: `Xóa video Shadowing "${res.rows[0].title}"`,
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

export async function listPublicShadowingCatalog(user: AuthUser | null) {
  await ensureShadowingSeeded();
  const [adminRes, myRes] = await Promise.all([
    pool.query<AdminShadowingRow>(
      `SELECT * FROM admin_shadowing_videos
       WHERE status = 'published' AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at DESC`,
    ),
    user
      ? pool.query<UserShadowingRow>(
          `SELECT * FROM user_shadowing_videos
           WHERE owner_id = $1 AND deleted_at IS NULL
           ORDER BY updated_at DESC, created_at DESC`,
          [user.id],
        )
      : Promise.resolve({ rows: [] as UserShadowingRow[] }),
  ]);

  return {
    adminVideos: adminRes.rows.map((r) => ({
      id: r.id,
      videoId: r.video_id,
      title: r.title,
      channel: r.channel,
      level: r.level,
      duration: r.duration,
      description: r.description,
      source: 'admin' as const,
    })),
    myVideos: myRes.rows.map(mapUserVideo),
  };
}

export async function saveUserShadowingVideo(
  user: AuthUser,
  input: {
    urlOrId: string;
    title?: string | undefined;
    channel?: string | undefined;
    level?: string | undefined;
    duration?: string | undefined;
    description?: string | undefined;
  },
) {
  await ensureShadowingSeeded();
  const videoId = extractYouTubeVideoId(input.urlOrId);
  if (!videoId) {
    throw new ValidationFailedError('Link YouTube không hợp lệ. Vui lòng kiểm tra lại đường dẫn.');
  }

  const existingRes = await pool.query<UserShadowingRow>(
    `SELECT * FROM user_shadowing_videos
     WHERE owner_id = $1 AND video_id = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [user.id, videoId],
  );
  const existing = existingRes.rows[0];
  if (existing) {
    const nextTitle = input.title?.trim() || existing.title;
    const nextChannel = input.channel?.trim() || existing.channel;
    const updatedRes = await pool.query<UserShadowingRow>(
      `UPDATE user_shadowing_videos
       SET title = $2,
           channel = $3,
           level = $4,
           duration = $5,
           description = $6,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        existing.id,
        nextTitle,
        nextChannel,
        input.level?.trim() ?? existing.level,
        input.duration?.trim() ?? existing.duration,
        input.description?.trim() ?? existing.description,
      ],
    );
    return { video: mapUserVideo(updatedRes.rows[0]!) };
  }

  let resolvedTitle = input.title?.trim() ?? '';
  let resolvedChannel = input.channel?.trim() ?? '';
  if (!resolvedTitle || !resolvedChannel) {
    const oembed = await fetchYouTubeOEmbed(videoId);
    if (!resolvedTitle) resolvedTitle = oembed?.title ?? `YouTube Video (${videoId})`;
    if (!resolvedChannel) resolvedChannel = oembed?.channel ?? 'YouTube (Đã lưu)';
  }

  const id = `ushv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const insertedRes = await pool.query<UserShadowingRow>(
    `INSERT INTO user_shadowing_videos
      (id, owner_id, video_id, title, channel, level, duration, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      user.id,
      videoId,
      resolvedTitle,
      resolvedChannel,
      input.level?.trim() ?? '',
      input.duration?.trim() ?? '',
      input.description?.trim() ?? '',
    ],
  );

  return { video: mapUserVideo(insertedRes.rows[0]!) };
}

export async function deleteUserShadowingVideo(user: AuthUser, rawVideoId: string) {
  await ensureShadowingSeeded();
  const parsed = extractYouTubeVideoId(rawVideoId) ?? rawVideoId.trim();
  const res = await pool.query<{ id: string }>(
    `UPDATE user_shadowing_videos
     SET deleted_at = now(), updated_at = now()
     WHERE owner_id = $1 AND (video_id = $2 OR id = $2) AND deleted_at IS NULL
     RETURNING id`,
    [user.id, parsed],
  );
  if (!res.rows[0]) {
    throw new NotFoundError('Không tìm thấy video trong danh sách của bạn.');
  }
  return { ok: true };
}
