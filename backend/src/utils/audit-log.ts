import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export interface AuditLogInput {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
}

/** Ghi lại thao tác nhạy cảm của quản trị viên vào admin_audit_logs. */
export async function appendAdminAuditLog(
  queryable: Pool | PoolClient,
  entry: AuditLogInput,
): Promise<void> {
  const id = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  await queryable.query(
    `INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, entry.adminId, entry.action, entry.targetType, entry.targetId, entry.detail],
  );
}
