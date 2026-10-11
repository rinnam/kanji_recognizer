import type { LocalVocabulary } from '../../../entities/vocabulary';

/** Kết quả cắt trang: lát hiện tại + siêu dữ liệu để hiển thị "x–y / tổng". */
export interface Pagination<T> {
  items: T[];
  /** Trang hiện tại sau khi kẹp vào [1, pageCount]. */
  page: number;
  /** Số trang, tối thiểu 1 (kể cả khi rỗng hoặc size <= 0). */
  pageCount: number;
  total: number;
  /** Chỉ số 1-based của phần tử ĐẦU trang (0 khi trang rỗng). */
  from: number;
  /** Chỉ số 1-based của phần tử CUỐI trang (0 khi trang rỗng). */
  to: number;
}

/**
 * Cắt một lát trang từ `items`. An toàn với mọi đầu vào:
 * - `size <= 0` hoặc danh sách rỗng → trang rỗng, `pageCount = 1`, `from = to = 0`.
 * - `page` được kẹp vào `[1, pageCount]` (trang vượt giới hạn → trang cuối/đầu).
 * KHÔNG sửa mảng đầu vào.
 */
export function paginate<T>(items: readonly T[], page: number, size: number): Pagination<T> {
  const total = items.length;
  const safeSize = Math.max(0, Math.floor(size));
  const pageCount = safeSize <= 0 || total === 0 ? 1 : Math.ceil(total / safeSize);
  const safePage = Math.min(Math.max(Math.floor(page), 1), pageCount);
  const start = safeSize <= 0 ? 0 : (safePage - 1) * safeSize;
  const slice = safeSize <= 0 ? [] : items.slice(start, start + safeSize);
  const from = slice.length === 0 ? 0 : start + 1;
  const to = slice.length === 0 ? 0 : start + slice.length;
  return { items: slice, page: safePage, pageCount, total, from, to };
}

/** Bật/tắt một id trong tập chọn — trả về Set MỚI, không sửa `sel`. */
export function toggleId(sel: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(sel);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Thêm (checked=true) hoặc bỏ (checked=false) nhiều id cùng lúc — trả Set MỚI. */
export function setMany(
  sel: ReadonlySet<string>,
  ids: readonly string[],
  checked: boolean,
): Set<string> {
  const next = new Set(sel);
  for (const id of ids) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
}

/**
 * Dải id liên tục từ `anchorId` tới `targetId` (GỒM cả hai đầu) theo thứ tự trong
 * `orderedIds`. Hoạt động cả khi target đứng TRƯỚC anchor. Nếu một trong hai id
 * không có trong `orderedIds` → trả `[]`. Trả MẢNG (dễ nối với `setMany`).
 */
export function selectRange(
  orderedIds: readonly string[],
  anchorId: string,
  targetId: string,
): string[] {
  const anchor = orderedIds.indexOf(anchorId);
  const target = orderedIds.indexOf(targetId);
  if (anchor === -1 || target === -1) return [];
  const start = Math.min(anchor, target);
  const end = Math.max(anchor, target);
  return orderedIds.slice(start, end + 1);
}

/**
 * Trạng thái chọn của các id trên trang hiện tại:
 * - `'none'`: không id nào được chọn (hoặc trang rỗng).
 * - `'all'`: tất cả id trên trang đều được chọn.
 * - `'some'`: chọn một phần (dùng cho checkbox indeterminate).
 */
export function pageState(
  sel: ReadonlySet<string>,
  pageIds: readonly string[],
): 'none' | 'some' | 'all' {
  if (pageIds.length === 0) return 'none';
  let selected = 0;
  for (const id of pageIds) if (sel.has(id)) selected += 1;
  if (selected === 0) return 'none';
  if (selected === pageIds.length) return 'all';
  return 'some';
}

export type VocabSort = 'added' | 'newest';

/**
 * Sắp từ theo `createdAt`: `'added'` = cũ → mới (tăng dần),
 * `'newest'` = mới → cũ (giảm dần). Khi trùng `createdAt`, tie-break theo `id`
 * tăng dần để kết quả ỔN ĐỊNH, không phụ thuộc thứ tự nhập. KHÔNG sửa mảng đầu vào.
 */
export function sortVocabs(
  items: readonly LocalVocabulary[],
  order: VocabSort,
): LocalVocabulary[] {
  const direction = order === 'newest' ? -1 : 1;
  return [...items].sort((a, b) => {
    if (a.createdAt < b.createdAt) return -direction;
    if (a.createdAt > b.createdAt) return direction;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}
