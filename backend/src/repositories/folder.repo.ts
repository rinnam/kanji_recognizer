import { sql } from 'kysely';
import { db } from '../config/database.js';
import type { FolderRow, NewFolderRow } from '../types/database.js';
import type { Executor } from './types.js';

function exec(trx?: Executor): Executor {
  return trx ?? db;
}

export async function insert(row: NewFolderRow, trx?: Executor): Promise<FolderRow> {
  return exec(trx)
    .insertInto('folders')
    .values(row)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function selectById(
  ownerId: string,
  id: string,
  trx?: Executor,
): Promise<FolderRow | undefined> {
  return exec(trx)
    .selectFrom('folders')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
}

export async function listByOwner(
  ownerId: string,
  filters: { parentId?: string },
  trx?: Executor,
): Promise<FolderRow[]> {
  let query = exec(trx)
    .selectFrom('folders')
    .selectAll()
    .where('owner_id', '=', ownerId)
    .where('deleted_at', 'is', null);

  if (filters.parentId !== undefined) {
    query = query.where('parent_id', '=', filters.parentId);
  }

  return query
    .orderBy('sort_order', 'asc')
    .orderBy('created_at', 'asc')
    .execute();
}

export async function update(
  ownerId: string,
  id: string,
  patch: {
    name?: string;
    parent_id?: string | null;
    sort_order?: number | null;
  },
  trx?: Executor,
): Promise<FolderRow | undefined> {
  return exec(trx)
    .updateTable('folders')
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
): Promise<FolderRow | undefined> {
  return exec(trx)
    .updateTable('folders')
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

/** Pull theo delta: trả các folder có updated_at > since (kèm tombstone). */
export async function listChangedSince(
  ownerId: string,
  since: Date | undefined,
  trx?: Executor,
): Promise<FolderRow[]> {
  let query = exec(trx)
    .selectFrom('folders')
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
): Promise<FolderRow | undefined> {
  return exec(trx)
    .selectFrom('folders')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .executeTakeFirst();
}

/**
 * Upsert từ client: insert, hoặc nếu trùng id thì ghi đè TẤT CẢ cột scalar
 * bằng giá trị client (bao gồm created_at/updated_at/deleted_at — tôn trọng
 * timestamp client, KHÔNG dùng now()). parent_id xử lý ở pha B (setParentId).
 */
export async function upsertFromClient(
  row: NewFolderRow,
  trx: Executor,
): Promise<FolderRow> {
  return trx
    .insertInto('folders')
    .values(row)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet({
        name: row.name,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? null,
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** Pha B: gán parent_id sau khi mọi folder đã tồn tại (tránh FK tự tham chiếu). */
export async function setParentId(
  ownerId: string,
  id: string,
  parentId: string | null,
  trx: Executor,
): Promise<void> {
  await trx
    .updateTable('folders')
    .set({ parent_id: parentId })
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .execute();
}
