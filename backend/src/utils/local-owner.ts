import { db } from '../config/database.js';
import { env } from '../config/env.js';

/**
 * Đảm bảo user LOCAL_OWNER_ID tồn tại (MVP không có auth).
 * Idempotent: INSERT ... ON CONFLICT DO NOTHING.
 */
export async function ensureLocalOwner(): Promise<void> {
  await db
    .insertInto('users')
    .values({ id: env.LOCAL_OWNER_ID })
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
}
