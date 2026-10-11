/** Thời điểm hiện tại dạng ISO (UTC) — dùng cho createdAt/updatedAt/deletedAt. */
export function nowIso(): string {
  return new Date().toISOString();
}
