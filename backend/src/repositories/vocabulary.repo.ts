import { sql } from 'kysely';
import { db } from '../config/database.js';
import type {
  JlptLevel,
  NewVocabularyRow,
  VocabularyRow,
} from '../types/database.js';
import type { Executor } from './types.js';

function exec(trx?: Executor): Executor {
  return trx ?? db;
}

export async function insert(
  row: NewVocabularyRow,
  trx?: Executor,
): Promise<VocabularyRow> {
  return exec(trx)
    .insertInto('vocabularies')
    .values(row)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function selectById(
  ownerId: string,
  id: string,
  trx?: Executor,
): Promise<VocabularyRow | undefined> {
  return exec(trx)
    .selectFrom('vocabularies')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
}

/** Tìm bản ghi sống trùng (owner, word, reading) để chống trùng Quick Add. */
export async function findDuplicate(
  ownerId: string,
  word: string,
  reading: string | null,
  trx?: Executor,
): Promise<VocabularyRow | undefined> {
  let query = exec(trx)
    .selectFrom('vocabularies')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('word', '=', word)
    .where('deleted_at', 'is', null);

  query = reading === null
    ? query.where('reading', 'is', null)
    : query.where('reading', '=', reading);

  return query.executeTakeFirst();
}

export interface VocabularyListFilters {
  folderId?: string;
  jlptLevel?: JlptLevel;
  search?: string;
  limit: number;
  offset: number;
}

export async function list(
  ownerId: string,
  filters: VocabularyListFilters,
  trx?: Executor,
): Promise<VocabularyRow[]> {
  let query = exec(trx)
    .selectFrom('vocabularies')
    .selectAll('vocabularies')
    .where('vocabularies.owner_id', '=', ownerId)
    .where('vocabularies.deleted_at', 'is', null);

  if (filters.folderId !== undefined) {
    query = query.where((eb) =>
      eb.exists(
        eb
          .selectFrom('vocabulary_folders')
          .select('vocabulary_folders.vocabulary_id')
          .whereRef('vocabulary_folders.vocabulary_id', '=', 'vocabularies.id')
          .where('vocabulary_folders.folder_id', '=', filters.folderId as string),
      ),
    );
  }

  if (filters.jlptLevel !== undefined) {
    query = query.where('vocabularies.jlpt_level', '=', filters.jlptLevel);
  }

  if (filters.search !== undefined) {
    const pattern = `%${filters.search}%`;
    query = query.where((eb) =>
      eb.or([
        eb('vocabularies.word', 'ilike', pattern),
        eb('vocabularies.meaning', 'ilike', pattern),
        eb('vocabularies.reading', 'ilike', pattern),
      ]),
    );
  }

  return query
    .orderBy('vocabularies.created_at', 'desc')
    .limit(filters.limit)
    .offset(filters.offset)
    .execute();
}

/**
 * Hàng đợi ôn SRS (docs/reference/kotobase-feature-audit.md §2.3): các thẻ sống
 * tới hạn ôn (srs_next_review <= now) HOẶC chưa có lịch (NULL = thẻ mới).
 * Sắp xếp theo srs_next_review tăng dần (PG đặt NULL cuối → thẻ mới sau thẻ tới hạn).
 */
export async function listDue(
  ownerId: string,
  now: Date,
  limit: number,
  trx?: Executor,
): Promise<VocabularyRow[]> {
  return exec(trx)
    .selectFrom('vocabularies')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .where((eb) =>
      eb.or([
        eb('srs_next_review', 'is', null),
        eb('srs_next_review', '<=', now),
      ]),
    )
    .orderBy('srs_next_review', 'asc')
    .limit(limit)
    .execute();
}

export async function update(
  ownerId: string,
  id: string,
  patch: {
    word?: string;
    meaning?: string;
    reading?: string | null;
    sino_vietnamese?: string | null;
    example?: string | null;
    example_meaning?: string | null;
    note?: string | null;
    tags?: string[];
    jlpt_level?: JlptLevel | null;
    srs_interval?: number | null;
    srs_repetition?: number | null;
    srs_ease_factor?: string | number | null;
    srs_next_review?: Date | string | null;
  },
  trx?: Executor,
): Promise<VocabularyRow | undefined> {
  return exec(trx)
    .updateTable('vocabularies')
    .set({ ...patch, updated_at: sql`now()` })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returningAll()
    .executeTakeFirst();
}

export async function softDelete(
  ownerId: string,
  id: string,
  trx?: Executor,
): Promise<VocabularyRow | undefined> {
  return exec(trx)
    .updateTable('vocabularies')
    .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .returningAll()
    .executeTakeFirst();
}

// ---------------------------------------------------------------------------
// Sync (ADR 0001): LWW theo updated_at + tombstone. Hàm dưới KHÔNG lọc
// deleted_at (phải trả cả tombstone) và tôn trọng timestamp do client gửi.
// ---------------------------------------------------------------------------

/** Pull theo delta: trả các vocab có updated_at > since (kèm tombstone). */
export async function listChangedSince(
  ownerId: string,
  since: Date | undefined,
  trx?: Executor,
): Promise<VocabularyRow[]> {
  let query = exec(trx)
    .selectFrom('vocabularies')
    .selectAll()
    .where('owner_id', '=', ownerId);

  if (since !== undefined) {
    query = query.where('updated_at', '>', since);
  }

  return query.orderBy('updated_at', 'asc').execute();
}

/** Đọc bản ghi server theo id (KỂ CẢ tombstone) để quyết định merge. */
export async function findForMerge(
  ownerId: string,
  id: string,
  trx?: Executor,
): Promise<VocabularyRow | undefined> {
  return exec(trx)
    .selectFrom('vocabularies')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .executeTakeFirst();
}

/**
 * Upsert từ client: insert, hoặc nếu trùng id thì ghi đè TẤT CẢ cột bằng giá
 * trị client (bao gồm created_at/updated_at/deleted_at — tôn trọng timestamp
 * client, KHÔNG dùng now()).
 */
export async function upsertFromClient(
  row: NewVocabularyRow,
  trx: Executor,
): Promise<VocabularyRow> {
  return trx
    .insertInto('vocabularies')
    .values(row)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet({
        word: row.word,
        meaning: row.meaning,
        reading: row.reading ?? null,
        sino_vietnamese: row.sino_vietnamese ?? null,
        example: row.example ?? null,
        example_meaning: row.example_meaning ?? null,
        note: row.note ?? null,
        tags: row.tags ?? [],
        jlpt_level: row.jlpt_level ?? null,
        srs_interval: row.srs_interval ?? null,
        srs_repetition: row.srs_repetition ?? null,
        srs_ease_factor: row.srs_ease_factor ?? null,
        srs_next_review: row.srs_next_review ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? null,
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow();
}
