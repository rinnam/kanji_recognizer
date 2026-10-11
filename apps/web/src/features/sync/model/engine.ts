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
/**
 * Chia mảng thành các lô tối đa `size` phần tử (THUẦN). `size<=0` → một lô chứa tất cả
 * (rỗng → `[]`). Dùng để đẩy push theo lô, tránh vượt giới hạn body của server.
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (items.length === 0) return [];
  if (size <= 0) return [[...items]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Con trỏ `lastPushedAt` AN TOÀN sau khi đã đẩy `pushedCount` bản ghi ĐẦU của danh sách đã
 * SẮP TĂNG theo `updatedAt`. Trả về mốc muộn nhất T sao cho MỌI bản `updatedAt <= T` đều đã
 * đẩy — KHÔNG bao giờ lùi dưới `previous` (giữ con trỏ tăng đơn điệu). Nếu lô cắt ngang các
 * bản cùng `updatedAt`, lùi về mốc < ranh giới ⇒ các bản cùng mốc được đẩy lại ở vòng sau
 * (push idempotent nên an toàn, không mất dữ liệu).
 */
/** Bản ghi tối thiểu để sắp thư mục theo quan hệ cha–con. */
interface FolderOrderRecord {
  id: string;
  parentId: string | null;
  updatedAt: string;
}

/**
 * Sắp thư mục CHA TRƯỚC CON (theo độ sâu tăng dần), rồi `updatedAt` tăng, rồi `id` — THUẦN,
 * tất định. Đẩy theo thứ tự này đảm bảo một thư mục con KHÔNG tới server trước thư mục cha
 * (tránh FK violation ⇒ "Lỗi đồng bộ"), kể cả khi chia nhiều lô. Độ sâu tính trong CHÍNH tập
 * truyền vào: nếu cha không nằm trong tập (đã đẩy trước đó) thì cha đã tồn tại ở server nên
 * thứ tự không còn quan trọng. Chống chu trình bằng `seen`.
 */
export function orderFoldersParentsFirst<T extends FolderOrderRecord>(folders: readonly T[]): T[] {
  const byId = new Map<string, T>(folders.map((folder) => [folder.id, folder]));
  const depthOf = (folder: T): number => {
    let depth = 0;
    let current: T | undefined = folder;
    const seen = new Set<string>();
    while (current !== undefined && current.parentId !== null && byId.has(current.parentId)) {
      if (seen.has(current.id)) break;
      seen.add(current.id);
      depth += 1;
      current = byId.get(current.parentId);
    }
    return depth;
  };
  return [...folders].sort((a, b) => {
    const da = depthOf(a);
    const db = depthOf(b);
    if (da !== db) return da - db;
    const ta = toTime(a.updatedAt);
    const tb = toTime(b.updatedAt);
    if (ta !== tb) return ta - tb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function highWaterMarkAfter(
  sortedAsc: readonly SyncRecord[],
  pushedCount: number,
  previous: string | null,
): string | null {
  if (pushedCount <= 0) return previous;
  const pushed = Math.min(pushedCount, sortedAsc.length);
  if (pushed >= sortedAsc.length) return latestIso([previous, maxUpdatedAt(sortedAsc)]);
  const boundary = toTime(sortedAsc[pushed].updatedAt);
  for (let i = pushed - 1; i >= 0; i -= 1) {
    if (toTime(sortedAsc[i].updatedAt) < boundary) {
      return latestIso([previous, sortedAsc[i].updatedAt]);
    }
  }
  return previous;
}

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
