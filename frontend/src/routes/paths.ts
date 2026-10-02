/** Phân đoạn đường dẫn cũ (/library, /study, /quiz) — giữ lại để redirect về tab. */
export const ROUTE_PATHS = {
  library: 'library',
  study: 'study',
  quiz: 'quiz',
} as const;

/** Query param mang tab đang mở trên màn hình gộp (ví dụ /?tab=flashcard). */
export const TAB_PARAM = 'tab';

/** Các tab trong màn hình làm việc gộp (Tổng quan | Flashcard | Quiz). */
export const TABS = ['overview', 'flashcard', 'quiz'] as const;
export type TabId = (typeof TABS)[number];
export const DEFAULT_TAB: TabId = 'overview';

/** Chuẩn hóa giá trị tab lấy từ URL về một TabId hợp lệ (mặc định 'overview'). */
export function parseTab(value: string | null): TabId {
  return (TABS as readonly string[]).includes(value ?? '')
    ? (value as TabId)
    : DEFAULT_TAB;
}

/** Ánh xạ path cũ sang tab tương ứng để redirect sang màn hình gộp. */
export const LEGACY_REDIRECTS: readonly { readonly path: string; readonly tab: TabId }[] = [
  { path: ROUTE_PATHS.library, tab: 'overview' },
  { path: ROUTE_PATHS.study, tab: 'flashcard' },
  { path: ROUTE_PATHS.quiz, tab: 'quiz' },
];
