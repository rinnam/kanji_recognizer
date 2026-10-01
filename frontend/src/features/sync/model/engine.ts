/**
 * Lõi đồng bộ THUẦN (không DOM/DB/React/network) — tách riêng để unit test dễ.
 * LWW theo `updatedAt` + tombstone, mirror backend/src/services/sync.service.ts.
 */

/** Bản ghi đồng bộ tối thiểu: mọi bảng đồng bộ đều có id + updatedAt + deletedAt (ADR 0001). */
export interface SyncRecord {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
}

function toTime(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * LWW: `incoming` thắng CHỈ khi `updatedAt` MỚI HƠN THỰC SỰ (>) — mirror
 * `isIncomingNewer` ở backend. Bằng hoặc cũ hơn → giữ bản hiện có (push lặp cùng
 * (id, updatedAt) là no-op ⇒ idempotent).
 */
export function isNewer(incomingUpdatedAt: string, existingUpdatedAt: string): boolean {
  return toTime(incomingUpdatedAt) > toTime(existingUpdatedAt);
}

/**
 * Chọn bản ghi "bẩn" cần đẩy: `updatedAt` > con trỏ (`lastPushedAt`).
 * `since === null` (chưa từng đẩy) → đẩy tất cả. So sánh theo mốc thời gian.
 */
export function selectDirty<T extends SyncRecord>(
  records: readonly T[],
  since: string | null,
): T[] {
  if (since === null) return [...records];
  const sinceTime = toTime(since);
  return records.filter((record) => toTime(record.updatedAt) > sinceTime);
}

/**
 * `updatedAt` LỚN NHẤT trong tập bản ghi vừa đẩy — dùng làm con trỏ `lastPushedAt`
 * (KHÔNG dùng giờ máy client, tránh lệch đồng hồ). Rỗng → null.
 */
export function maxUpdatedAt(records: readonly SyncRecord[]): string | null {
  let latest: string | null = null;
  for (const record of records) {
    if (latest === null || toTime(record.updatedAt) > toTime(latest)) {
      latest = record.updatedAt;
    }
  }
  return latest;
}

/** Mốc ISO muộn nhất trong danh sách (bỏ qua null). Tất cả null → null. Giữ con trỏ tăng đơn điệu. */
export function latestIso(values: readonly (string | null)[]): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (value === null) continue;
    if (latest === null || toTime(value) > toTime(latest)) latest = value;
  }
  return latest;
}

/**
 * Merge pull theo LWW: trả về các bản ghi `incoming` CẦN GHI xuống local
 * (local chưa có HOẶC incoming mới hơn). Giữ nguyên tombstone (`deletedAt`) để
 * xóa lan truyền; bản bằng/cũ hơn bị bỏ qua (không ghi đè bản local mới hơn).
 */
export function pickIncomingWinners<T extends SyncRecord>(
  local: readonly T[],
  incoming: readonly T[],
): T[] {
  const localById = new Map<string, T>(local.map((record) => [record.id, record]));
  const winners: T[] = [];
  for (const candidate of incoming) {
    const current = localById.get(candidate.id);
    if (current === undefined || isNewer(candidate.updatedAt, current.updatedAt)) {
      winners.push(candidate);
    }
  }
  return winners;
}
