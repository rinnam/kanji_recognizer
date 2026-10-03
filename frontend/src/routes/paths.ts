import { JLPT_LEVELS, type JlptLevel } from '../shared/api';

/** Phân đoạn đường dẫn cũ (/library, /study, /quiz) — giữ lại để redirect về tab. */
export const ROUTE_PATHS = {
  library: 'library',
  study: 'study',
  quiz: 'quiz',
} as const;

/** Query param mang tab đang mở trên màn hình gộp (ví dụ /?tab=flashcard). */
export const TAB_PARAM = 'tab';

/** Query param mang từ khóa tìm kiếm Overview, chia sẻ giữa header và trang (ví dụ /?q=ăn). */
export const SEARCH_PARAM = 'q';

/** Query param mang cấp JLPT đang lọc Overview, chia sẻ giữa header và trang (ví dụ /?jlpt=N3). */
export const JLPT_PARAM = 'jlpt';

/** Chuẩn hóa giá trị JLPT lấy từ URL về một JlptLevel hợp lệ, hoặc null nếu không hợp lệ. */
export function parseJlpt(value: string | null): JlptLevel | null {
  return (JLPT_LEVELS as readonly string[]).includes(value ?? '') ? (value as JlptLevel) : null;
}

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
