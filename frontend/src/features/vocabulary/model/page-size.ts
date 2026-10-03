/** Các cỡ trang cho danh sách từ (số dòng render mỗi trang). */
export const PAGE_SIZES = [25, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 50;

const STORAGE_KEY = 'kn:vocab:page-size';

/** Quy đổi một giá trị bất kỳ về cỡ trang hợp lệ; không hợp lệ → mặc định. */
export function toPageSize(value: string | number): PageSize {
  const parsed = Number(value);
  return PAGE_SIZES.find((size) => size === parsed) ?? DEFAULT_PAGE_SIZE;
}

/** Đọc cỡ trang đã nhớ từ localStorage (bọc try/catch cho chế độ riêng tư). */
export function loadPageSize(): PageSize {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return toPageSize(raw);
  } catch {
    // Bỏ qua nếu localStorage không khả dụng (vd chế độ riêng tư).
  }
  return DEFAULT_PAGE_SIZE;
}

/** Ghi nhớ cỡ trang vào localStorage (bọc try/catch). */
export function savePageSize(size: PageSize): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    // Bỏ qua nếu localStorage không khả dụng.
  }
}
