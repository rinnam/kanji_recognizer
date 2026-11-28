import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import {
  INITIAL_CONJUGATION_BLITZ,
  INITIAL_GRAMMAR_POINTS,
  INITIAL_PARTICLE_BLITZ,
  INITIAL_STAR_SENTENCES,
} from '../seeds/grammar-seed.data.js';
import { appendAdminAuditLog } from '../utils/audit-log.js';
import { NotFoundError } from '../utils/errors.js';
import { ensureAdminAndLessonTables } from './admin-schema.service.js';

export type GrammarLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type GrammarStatus = 'published' | 'hidden';
export type GrammarBlitzKind = 'particle' | 'conjugation';

export interface GrammarExampleDto {
  ja: string;
  reading: string;
  vi: string;
}

interface GrammarPointRow {
  id: string;
  jlpt_level: string;
  category: string;
  pattern: string;
  structure: string;
  meaning_vi: string;
  nuance_vi: string;
  examples: unknown;
  status: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface GrammarStarRow {
  id: string;
  jlpt_level: string;
  meaning_vi: string;
  prefix_ja: string;
  suffix_ja: string;
  parts: unknown;
  star_index: number;
  explanation_vi: string;
  status: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface GrammarBlitzRow {
  id: string;
  kind: string;
  jlpt_level: string;
  prompt_main: string;
  prompt_sub: string;
  meaning_vi: string;
  correct: string;
  choices: unknown;
  tip_vi: string;
  status: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

function parseExamplesJson(raw: unknown): GrammarExampleDto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const ja = typeof rec.ja === 'string' ? rec.ja.trim() : '';
      const vi = typeof rec.vi === 'string' ? rec.vi.trim() : '';
      const reading = typeof rec.reading === 'string' ? rec.reading.trim() : '';
      if (!ja || !vi) return null;
      return { ja, reading, vi };
    })
    .filter((v): v is GrammarExampleDto => v !== null);
}

function parseFourTuple(raw: unknown): [string, string, string, string] {
  const arr = Array.isArray(raw) ? raw.map((v) => String(v ?? '')) : [];
  return [arr[0] ?? '', arr[1] ?? '', arr[2] ?? '', arr[3] ?? ''];
}

function mapGrammarPoint(r: GrammarPointRow) {
  return {
    id: r.id,
    level: r.jlpt_level as GrammarLevel,
    category: r.category,
    pattern: r.pattern,
    structure: r.structure,
    meaningVi: r.meaning_vi,
    nuanceVi: r.nuance_vi,
    examples: parseExamplesJson(r.examples),
    status: (r.status === 'hidden' ? 'hidden' : 'published') as GrammarStatus,
    sortOrder: Number(r.sort_order) || 0,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function mapGrammarStar(r: GrammarStarRow) {
  const idx = Number(r.star_index);
  return {
    id: r.id,
    level: r.jlpt_level as GrammarLevel,
    meaningVi: r.meaning_vi,
    prefixJa: r.prefix_ja,
    suffixJa: r.suffix_ja,
    parts: parseFourTuple(r.parts),
    starIndex: (idx >= 0 && idx <= 3 ? idx : 0) as 0 | 1 | 2 | 3,
    explanationVi: r.explanation_vi,
    status: (r.status === 'hidden' ? 'hidden' : 'published') as GrammarStatus,
    sortOrder: Number(r.sort_order) || 0,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function mapGrammarBlitz(r: GrammarBlitzRow) {
  return {
    id: r.id,
    kind: (r.kind === 'conjugation' ? 'conjugation' : 'particle') as GrammarBlitzKind,
    level: r.jlpt_level as GrammarLevel,
    promptMain: r.prompt_main,
    promptSub: r.prompt_sub,
    meaningVi: r.meaning_vi,
    correct: r.correct,
    choices: parseFourTuple(r.choices),
    tipVi: r.tip_vi,
    status: (r.status === 'hidden' ? 'hidden' : 'published') as GrammarStatus,
    sortOrder: Number(r.sort_order) || 0,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

let grammarSeedPromise: Promise<void> | null = null;

/** Seed 1 lần duy nhất toàn bộ mẫu ngữ pháp, câu ghép ★ và Blitz JLPT vào PostgreSQL. */
export function ensureGrammarSeeded(): Promise<void> {
  if (!grammarSeedPromise) {
    grammarSeedPromise = (async () => {
      await ensureAdminAndLessonTables();
      const check = await pool.query<{ seed_key: string }>(
        `SELECT seed_key FROM content_seed_meta WHERE seed_key = 'grammar_v1'`,
      );
      if (check.rows[0]) return;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const recheck = await client.query<{ seed_key: string }>(
          `SELECT seed_key FROM content_seed_meta WHERE seed_key = 'grammar_v1' FOR UPDATE`,
        );
        if (!recheck.rows[0]) {
          for (let i = 0; i < INITIAL_GRAMMAR_POINTS.length; i += 1) {
            const p = INITIAL_GRAMMAR_POINTS[i]!;
            await client.query(
              `INSERT INTO grammar_points
                (id, jlpt_level, category, pattern, structure, meaning_vi, nuance_vi, examples, status, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'published', $9)
               ON CONFLICT (id) DO NOTHING`,
              [
                p.id,
                p.level,
                p.category,
                p.pattern,
                p.structure,
                p.meaningVi,
                p.nuanceVi,
                JSON.stringify(p.examples),
                i,
              ],
            );
          }

          for (let i = 0; i < INITIAL_STAR_SENTENCES.length; i += 1) {
            const s = INITIAL_STAR_SENTENCES[i]!;
            await client.query(
              `INSERT INTO grammar_star_questions
                (id, jlpt_level, meaning_vi, prefix_ja, suffix_ja, parts, star_index, explanation_vi, status, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 'published', $9)
               ON CONFLICT (id) DO NOTHING`,
              [
                s.id,
                s.level,
                s.meaningVi,
                s.prefixJa,
                s.suffixJa,
                JSON.stringify(s.parts),
                s.starIndex,
                s.explanationVi,
                i,
              ],
            );
          }

          const allBlitz = [...INITIAL_PARTICLE_BLITZ, ...INITIAL_CONJUGATION_BLITZ];
          for (let i = 0; i < allBlitz.length; i += 1) {
            const b = allBlitz[i]!;
            await client.query(
              `INSERT INTO grammar_blitz_questions
                (id, kind, jlpt_level, prompt_main, prompt_sub, meaning_vi, correct, choices, tip_vi, status, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, 'published', $10)
               ON CONFLICT (id) DO NOTHING`,
              [
                b.id,
                b.kind,
                b.level,
                b.promptMain,
                b.promptSub,
                b.meaningVi,
                b.correct,
                JSON.stringify(b.choices),
                b.tipVi,
                i,
              ],
            );
          }

          await client.query(
            `INSERT INTO content_seed_meta (seed_key) VALUES ('grammar_v1') ON CONFLICT (seed_key) DO NOTHING`,
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
      grammarSeedPromise = null;
      throw err;
    });
  }
  return grammarSeedPromise;
}

export async function getPublicGrammarSummary() {
  await ensureGrammarSeeded();
  const res = await pool.query<{ jlpt_level: string; cnt: number }>(
    `SELECT jlpt_level, COUNT(*)::int AS cnt
     FROM grammar_points
     WHERE status = 'published' AND deleted_at IS NULL
     GROUP BY jlpt_level`,
  );
  const levelCounts: Record<GrammarLevel, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
  let totalPoints = 0;
  for (const row of res.rows) {
    if (row.jlpt_level in levelCounts) {
      const c = Number(row.cnt) || 0;
      levelCounts[row.jlpt_level as GrammarLevel] = c;
      totalPoints += c;
    }
  }
  return { totalPoints, levelCounts };
}

export async function getPublicGrammarCatalog(level: 'ALL' | GrammarLevel = 'ALL') {
  await ensureGrammarSeeded();
  const levelFilterSql = level !== 'ALL' ? 'AND jlpt_level = $1' : '';
  const levelParams = level !== 'ALL' ? [level] : [];

  const [pointsRes, starRes, blitzRes, summary] = await Promise.all([
    pool.query<GrammarPointRow>(
      `SELECT * FROM grammar_points
       WHERE status = 'published' AND deleted_at IS NULL ${levelFilterSql}
       ORDER BY sort_order ASC, created_at ASC`,
      levelParams,
    ),
    pool.query<GrammarStarRow>(
      `SELECT * FROM grammar_star_questions
       WHERE status = 'published' AND deleted_at IS NULL ${levelFilterSql}
       ORDER BY sort_order ASC, created_at ASC`,
      levelParams,
    ),
    pool.query<GrammarBlitzRow>(
      `SELECT * FROM grammar_blitz_questions
       WHERE status = 'published' AND deleted_at IS NULL ${levelFilterSql}
       ORDER BY sort_order ASC, created_at ASC`,
      levelParams,
    ),
    getPublicGrammarSummary(),
  ]);

  const mappedBlitz = blitzRes.rows.map(mapGrammarBlitz);
  return {
    points: pointsRes.rows.map(mapGrammarPoint),
    starSentences: starRes.rows.map(mapGrammarStar),
    particleBlitz: mappedBlitz.filter((b) => b.kind === 'particle'),
    conjugationBlitz: mappedBlitz.filter((b) => b.kind === 'conjugation'),
    levelCounts: { ALL: summary.totalPoints, ...summary.levelCounts },
  };
}

export async function listAdminGrammarPoints(params: {
  level: 'ALL' | GrammarLevel;
  category?: string | undefined;
  status: 'all' | GrammarStatus;
  q?: string | undefined;
}) {
  await ensureGrammarSeeded();
  const clauses = ['deleted_at IS NULL'];
  const values: unknown[] = [];

  if (params.level !== 'ALL') {
    values.push(params.level);
    clauses.push(`jlpt_level = $${values.length}`);
  }
  if (params.category && params.category !== 'ALL' && params.category !== 'all') {
    values.push(params.category);
    clauses.push(`category = $${values.length}`);
  }
  if (params.status !== 'all') {
    values.push(params.status);
    clauses.push(`status = $${values.length}`);
  }
  const qClean = (params.q ?? '').trim();
  if (qClean) {
    values.push(`%${qClean}%`);
    clauses.push(
      `(pattern ILIKE $${values.length} OR structure ILIKE $${values.length} OR meaning_vi ILIKE $${values.length} OR nuance_vi ILIKE $${values.length})`,
    );
  }

  const [pointsRes, countsRes] = await Promise.all([
    pool.query<GrammarPointRow>(
      `SELECT * FROM grammar_points
       WHERE ${clauses.join(' AND ')}
       ORDER BY jlpt_level DESC, sort_order ASC, created_at DESC`,
      values,
    ),
    Promise.all([
      pool.query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM grammar_points WHERE deleted_at IS NULL`),
      pool.query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM grammar_star_questions WHERE deleted_at IS NULL`),
      pool.query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM grammar_blitz_questions WHERE deleted_at IS NULL`),
    ]),
  ]);

  return {
    points: pointsRes.rows.map(mapGrammarPoint),
    totals: {
      points: Number(countsRes[0].rows[0]?.cnt ?? 0),
      star: Number(countsRes[1].rows[0]?.cnt ?? 0),
      blitz: Number(countsRes[2].rows[0]?.cnt ?? 0),
    },
  };
}

export async function createAdminGrammarPoint(
  adminId: string,
  input: {
    level: GrammarLevel;
    category: string;
    pattern: string;
    structure: string;
    meaningVi: string;
    nuanceVi: string;
    examples: GrammarExampleDto[];
    status: GrammarStatus;
    sortOrder: number;
  },
) {
  await ensureGrammarSeeded();
  const id = `gp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<GrammarPointRow>(
      `INSERT INTO grammar_points
        (id, jlpt_level, category, pattern, structure, meaning_vi, nuance_vi, examples, status, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
       RETURNING *`,
      [
        id,
        input.level,
        input.category,
        input.pattern,
        input.structure,
        input.meaningVi,
        input.nuanceVi,
        JSON.stringify(input.examples),
        input.status,
        input.sortOrder,
        adminId,
      ],
    );
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_point_create',
      targetType: 'grammar_point',
      targetId: id,
      detail: `Thêm ngữ pháp ${input.level}: "${input.pattern}"`,
    });
    await client.query('COMMIT');
    return mapGrammarPoint(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateAdminGrammarPoint(
  adminId: string,
  id: string,
  input: {
    level?: GrammarLevel | undefined;
    category?: string | undefined;
    pattern?: string | undefined;
    structure?: string | undefined;
    meaningVi?: string | undefined;
    nuanceVi?: string | undefined;
    examples?: GrammarExampleDto[] | undefined;
    status?: GrammarStatus | undefined;
    sortOrder?: number | undefined;
  },
) {
  await ensureGrammarSeeded();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query<GrammarPointRow>(
      `SELECT * FROM grammar_points WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new NotFoundError('Không tìm thấy mẫu ngữ pháp.');
    }

    const res = await client.query<GrammarPointRow>(
      `UPDATE grammar_points
       SET jlpt_level = $2,
           category = $3,
           pattern = $4,
           structure = $5,
           meaning_vi = $6,
           nuance_vi = $7,
           examples = $8::jsonb,
           status = $9,
           sort_order = $10,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.level ?? existing.jlpt_level,
        input.category ?? existing.category,
        input.pattern ?? existing.pattern,
        input.structure ?? existing.structure,
        input.meaningVi ?? existing.meaning_vi,
        input.nuanceVi ?? existing.nuance_vi,
        JSON.stringify(input.examples ?? parseExamplesJson(existing.examples)),
        input.status ?? existing.status,
        input.sortOrder ?? existing.sort_order,
      ],
    );
    const updated = res.rows[0]!;
    const detail =
      input.status && input.status !== existing.status
        ? `${input.status === 'hidden' ? 'Ẩn' : 'Hiển thị'} ngữ pháp "${updated.pattern}"`
        : `Cập nhật ngữ pháp "${updated.pattern}"`;
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_point_update',
      targetType: 'grammar_point',
      targetId: id,
      detail,
    });
    await client.query('COMMIT');
    return mapGrammarPoint(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAdminGrammarPoint(adminId: string, id: string) {
  await ensureGrammarSeeded();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string; pattern: string }>(
      `UPDATE grammar_points
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, pattern`,
      [id],
    );
    if (!res.rows[0]) {
      throw new NotFoundError('Không tìm thấy mẫu ngữ pháp.');
    }
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_point_delete',
      targetType: 'grammar_point',
      targetId: id,
      detail: `Xóa mẫu ngữ pháp "${res.rows[0].pattern}"`,
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

export async function listAdminGrammarStarQuestions(params: {
  level: 'ALL' | GrammarLevel;
  status: 'all' | GrammarStatus;
  q?: string | undefined;
}) {
  await ensureGrammarSeeded();
  const clauses = ['deleted_at IS NULL'];
  const values: unknown[] = [];

  if (params.level !== 'ALL') {
    values.push(params.level);
    clauses.push(`jlpt_level = $${values.length}`);
  }
  if (params.status !== 'all') {
    values.push(params.status);
    clauses.push(`status = $${values.length}`);
  }
  const qClean = (params.q ?? '').trim();
  if (qClean) {
    values.push(`%${qClean}%`);
    clauses.push(
      `(meaning_vi ILIKE $${values.length} OR prefix_ja ILIKE $${values.length} OR suffix_ja ILIKE $${values.length} OR parts::text ILIKE $${values.length})`,
    );
  }

  const res = await pool.query<GrammarStarRow>(
    `SELECT * FROM grammar_star_questions
     WHERE ${clauses.join(' AND ')}
     ORDER BY jlpt_level DESC, sort_order ASC, created_at DESC`,
    values,
  );
  return { questions: res.rows.map(mapGrammarStar) };
}

export async function createAdminGrammarStarQuestion(
  adminId: string,
  input: {
    level: GrammarLevel;
    meaningVi: string;
    prefixJa: string;
    suffixJa: string;
    parts: [string, string, string, string];
    starIndex: number;
    explanationVi: string;
    status: GrammarStatus;
    sortOrder: number;
  },
) {
  await ensureGrammarSeeded();
  const id = `star_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<GrammarStarRow>(
      `INSERT INTO grammar_star_questions
        (id, jlpt_level, meaning_vi, prefix_ja, suffix_ja, parts, star_index, explanation_vi, status, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        input.level,
        input.meaningVi,
        input.prefixJa,
        input.suffixJa,
        JSON.stringify(input.parts),
        input.starIndex,
        input.explanationVi,
        input.status,
        input.sortOrder,
        adminId,
      ],
    );
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_star_create',
      targetType: 'grammar_star',
      targetId: id,
      detail: `Thêm câu ghép ★ ${input.level}: "${input.meaningVi}"`,
    });
    await client.query('COMMIT');
    return mapGrammarStar(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateAdminGrammarStarQuestion(
  adminId: string,
  id: string,
  input: {
    level?: GrammarLevel | undefined;
    meaningVi?: string | undefined;
    prefixJa?: string | undefined;
    suffixJa?: string | undefined;
    parts?: [string, string, string, string] | undefined;
    starIndex?: number | undefined;
    explanationVi?: string | undefined;
    status?: GrammarStatus | undefined;
    sortOrder?: number | undefined;
  },
) {
  await ensureGrammarSeeded();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query<GrammarStarRow>(
      `SELECT * FROM grammar_star_questions WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new NotFoundError('Không tìm thấy câu ghép ★.');
    }
    const res = await client.query<GrammarStarRow>(
      `UPDATE grammar_star_questions
       SET jlpt_level = $2,
           meaning_vi = $3,
           prefix_ja = $4,
           suffix_ja = $5,
           parts = $6::jsonb,
           star_index = $7,
           explanation_vi = $8,
           status = $9,
           sort_order = $10,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.level ?? existing.jlpt_level,
        input.meaningVi ?? existing.meaning_vi,
        input.prefixJa ?? existing.prefix_ja,
        input.suffixJa ?? existing.suffix_ja,
        JSON.stringify(input.parts ?? parseFourTuple(existing.parts)),
        input.starIndex ?? existing.star_index,
        input.explanationVi ?? existing.explanation_vi,
        input.status ?? existing.status,
        input.sortOrder ?? existing.sort_order,
      ],
    );
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_star_update',
      targetType: 'grammar_star',
      targetId: id,
      detail: `Cập nhật câu ghép ★ (${res.rows[0]!.jlpt_level})`,
    });
    await client.query('COMMIT');
    return mapGrammarStar(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAdminGrammarStarQuestion(adminId: string, id: string) {
  await ensureGrammarSeeded();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string }>(
      `UPDATE grammar_star_questions
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id],
    );
    if (!res.rows[0]) {
      throw new NotFoundError('Không tìm thấy câu ghép ★.');
    }
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_star_delete',
      targetType: 'grammar_star',
      targetId: id,
      detail: `Xóa câu ghép ★ ${id}`,
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

export async function listAdminGrammarBlitzQuestions(params: {
  kind: 'all' | GrammarBlitzKind;
  level: 'ALL' | GrammarLevel;
  status: 'all' | GrammarStatus;
  q?: string | undefined;
}) {
  await ensureGrammarSeeded();
  const clauses = ['deleted_at IS NULL'];
  const values: unknown[] = [];

  if (params.kind !== 'all') {
    values.push(params.kind);
    clauses.push(`kind = $${values.length}`);
  }
  if (params.level !== 'ALL') {
    values.push(params.level);
    clauses.push(`jlpt_level = $${values.length}`);
  }
  if (params.status !== 'all') {
    values.push(params.status);
    clauses.push(`status = $${values.length}`);
  }
  const qClean = (params.q ?? '').trim();
  if (qClean) {
    values.push(`%${qClean}%`);
    clauses.push(
      `(prompt_main ILIKE $${values.length} OR meaning_vi ILIKE $${values.length} OR correct ILIKE $${values.length})`,
    );
  }

  const res = await pool.query<GrammarBlitzRow>(
    `SELECT * FROM grammar_blitz_questions
     WHERE ${clauses.join(' AND ')}
     ORDER BY kind ASC, jlpt_level DESC, sort_order ASC, created_at DESC`,
    values,
  );
  return { questions: res.rows.map(mapGrammarBlitz) };
}

export async function createAdminGrammarBlitzQuestion(
  adminId: string,
  input: {
    kind: GrammarBlitzKind;
    level: GrammarLevel;
    promptMain: string;
    promptSub: string;
    meaningVi: string;
    correct: string;
    choices: [string, string, string, string];
    tipVi: string;
    status: GrammarStatus;
    sortOrder: number;
  },
) {
  await ensureGrammarSeeded();
  const id = `${input.kind === 'particle' ? 'pb' : 'cb'}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<GrammarBlitzRow>(
      `INSERT INTO grammar_blitz_questions
        (id, kind, jlpt_level, prompt_main, prompt_sub, meaning_vi, correct, choices, tip_vi, status, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        input.kind,
        input.level,
        input.promptMain,
        input.promptSub,
        input.meaningVi,
        input.correct,
        JSON.stringify(input.choices),
        input.tipVi,
        input.status,
        input.sortOrder,
        adminId,
      ],
    );
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_blitz_create',
      targetType: 'grammar_blitz',
      targetId: id,
      detail: `Thêm câu Blitz (${input.kind} · ${input.level})`,
    });
    await client.query('COMMIT');
    return mapGrammarBlitz(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateAdminGrammarBlitzQuestion(
  adminId: string,
  id: string,
  input: {
    kind?: GrammarBlitzKind | undefined;
    level?: GrammarLevel | undefined;
    promptMain?: string | undefined;
    promptSub?: string | undefined;
    meaningVi?: string | undefined;
    correct?: string | undefined;
    choices?: [string, string, string, string] | undefined;
    tipVi?: string | undefined;
    status?: GrammarStatus | undefined;
    sortOrder?: number | undefined;
  },
) {
  await ensureGrammarSeeded();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query<GrammarBlitzRow>(
      `SELECT * FROM grammar_blitz_questions WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new NotFoundError('Không tìm thấy câu hỏi Blitz.');
    }
    const res = await client.query<GrammarBlitzRow>(
      `UPDATE grammar_blitz_questions
       SET kind = $2,
           jlpt_level = $3,
           prompt_main = $4,
           prompt_sub = $5,
           meaning_vi = $6,
           correct = $7,
           choices = $8::jsonb,
           tip_vi = $9,
           status = $10,
           sort_order = $11,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.kind ?? existing.kind,
        input.level ?? existing.jlpt_level,
        input.promptMain ?? existing.prompt_main,
        input.promptSub ?? existing.prompt_sub,
        input.meaningVi ?? existing.meaning_vi,
        input.correct ?? existing.correct,
        JSON.stringify(input.choices ?? parseFourTuple(existing.choices)),
        input.tipVi ?? existing.tip_vi,
        input.status ?? existing.status,
        input.sortOrder ?? existing.sort_order,
      ],
    );
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_blitz_update',
      targetType: 'grammar_blitz',
      targetId: id,
      detail: `Cập nhật câu Blitz ${id}`,
    });
    await client.query('COMMIT');
    return mapGrammarBlitz(res.rows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAdminGrammarBlitzQuestion(adminId: string, id: string) {
  await ensureGrammarSeeded();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: string }>(
      `UPDATE grammar_blitz_questions
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id],
    );
    if (!res.rows[0]) {
      throw new NotFoundError('Không tìm thấy câu hỏi Blitz.');
    }
    await appendAdminAuditLog(client, {
      adminId,
      action: 'grammar_blitz_delete',
      targetType: 'grammar_blitz',
      targetId: id,
      detail: `Xóa câu Blitz ${id}`,
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
