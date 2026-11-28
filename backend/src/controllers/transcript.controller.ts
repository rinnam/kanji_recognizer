import type { FastifyReply, FastifyRequest } from 'fastify';
import { fetchVideoTranscript } from '../services/transcript.service.js';
import { tokenizeText } from '../services/tokenizer.service.js';
import { recognizeKanjiStrokes } from '../services/kanji-recognizer.service.js';
import { analyzeBodySchema, transcriptQuerySchema } from '../validators/transcript.js';

export async function getTranscript(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const query = transcriptQuerySchema.parse(req.query);

  try {
    const data = await fetchVideoTranscript(query.id);
    void reply.send(data);
  } catch (err: unknown) {
    req.log.warn({ err, videoId: query.id }, 'transcript fetch failed');
    const rawMsg = err instanceof Error ? err.message : '';
    const isInternalCmd =
      /command failed|enoent|spawn|python|scripts[\\/]/i.test(rawMsg);
    const message = isInternalCmd || !rawMsg
      ? 'Video này chưa có phụ đề tiếng Nhật (CC) hoặc tạm thời không trích xuất được phụ đề.'
      : rawMsg;
    void reply.code(400).send({
      error: 'TranscriptError',
      message,
    });
  }
}

export async function analyzeSentence(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = analyzeBodySchema.parse(req.body);

  try {
    const tokens = await tokenizeText(body.text);
    void reply.send({ text: body.text, tokens });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi phân tích câu';
    void reply.code(400).send({
      error: 'AnalyzeError',
      message,
    });
  }
}

export async function recognizeKanji(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = req.body as { strokes?: number[][][] };
  if (!body || !Array.isArray(body.strokes)) {
    void reply.code(400).send({
      error: 'ValidationError',
      message: 'Dữ liệu nét vẽ strokes không hợp lệ',
    });
    return;
  }

  try {
    const candidates = recognizeKanjiStrokes(body.strokes);
    void reply.send({ candidates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi nhận diện nét vẽ';
    void reply.code(500).send({
      error: 'RecognizeError',
      message,
    });
  }
}

const translationCache = new Map<string, string>();

export async function translateSentence(
  req: { query: unknown },
  reply: { status: (code: number) => { send: (body: unknown) => unknown }; send: (body: unknown) => unknown },
) {
  const q = req.query as { text?: string };
  const text = typeof q?.text === 'string' ? q.text.trim() : '';
  if (!text) {
    return reply.status(400).send({ message: 'Thiếu tham số text.' });
  }
  const cached = translationCache.get(text);
  if (cached !== undefined) {
    return reply.send({ translation: cached });
  }
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return reply.status(502).send({ message: 'Không gọi được dịch vụ dịch.' });
    }
    const data = (await resp.json()) as unknown[];
    const segments = Array.isArray(data[0]) ? (data[0] as unknown[][]) : [];
    const translation = segments.map((s) => (typeof s[0] === 'string' ? s[0] : '')).join('').trim();
    translationCache.set(text, translation);
    return reply.send({ translation });
  } catch {
    return reply.status(502).send({ message: 'Lỗi kết nối dịch tiếng Việt.' });
  }
}

export async function getVideoLibrary(
  _req: unknown,
  reply: { status: (code: number) => { send: (body: unknown) => unknown }; send: (body: unknown) => unknown },
) {
  try {
    const { pool } = await import('../config/database.js');
    const [foldersRes, videosRes] = await Promise.all([
      pool.query('SELECT id, name FROM video_folders WHERE deleted_at IS NULL ORDER BY created_at ASC'),
      pool.query(
        'SELECT video_id AS "videoId", title, channel, level, duration, description, folder_id AS "folderId" FROM listening_videos WHERE deleted_at IS NULL ORDER BY created_at DESC',
      ),
    ]);
    return reply.send({
      folders: foldersRes.rows,
      customVideos: videosRes.rows.map((v: Record<string, unknown>) => ({ ...v, isCustom: true })),
    });
  } catch (err) {
    return reply.status(500).send({ message: err instanceof Error ? err.message : 'Lỗi đọc thư viện video.' });
  }
}

export async function saveVideoLibrary(
  req: { body: unknown },
  reply: { status: (code: number) => { send: (body: unknown) => unknown }; send: (body: unknown) => unknown },
) {
  const body = (req.body ?? {}) as {
    folders?: Array<{ id: string; name: string }>;
    customVideos?: Array<{
      videoId: string;
      title: string;
      channel?: string;
      level?: string;
      duration?: string;
      description?: string;
      folderId?: string | null;
    }>;
  };
  try {
    const { pool } = await import('../config/database.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const f of body.folders ?? []) {
        if (!f?.id || !f?.name) continue;
        await client.query(
          `INSERT INTO video_folders (id, name, updated_at, deleted_at)
           VALUES ($1, $2, now(), NULL)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now(), deleted_at = NULL`,
          [f.id, f.name],
        );
      }
      for (const v of body.customVideos ?? []) {
        if (!v?.videoId || !v?.title) continue;
        await client.query(
          `INSERT INTO listening_videos (video_id, title, channel, level, duration, description, folder_id, updated_at, deleted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, now(), NULL)
           ON CONFLICT (video_id) DO UPDATE SET
             title = EXCLUDED.title,
             channel = EXCLUDED.channel,
             level = EXCLUDED.level,
             duration = EXCLUDED.duration,
             description = EXCLUDED.description,
             folder_id = EXCLUDED.folder_id,
             updated_at = now(),
             deleted_at = NULL`,
          [
            v.videoId,
            v.title,
            v.channel ?? null,
            v.level ?? null,
            v.duration ?? null,
            v.description ?? null,
            v.folderId ?? null,
          ],
        );
      }
      await client.query('COMMIT');
      return reply.send({ ok: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    return reply.status(500).send({ message: err instanceof Error ? err.message : 'Lỗi lưu thư viện video.' });
  }
}
