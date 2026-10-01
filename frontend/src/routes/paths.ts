/** Phân đoạn đường dẫn tương đối (dùng khi khai báo route con trong router). */
export const ROUTE_PATHS = {
  library: 'library',
  study: 'study',
  quiz: 'quiz',
} as const;

/** Đường dẫn tuyệt đối (dùng cho NavLink, Navigate, Link). */
export const ROUTES = {
  library: `/${ROUTE_PATHS.library}`,
  study: `/${ROUTE_PATHS.study}`,
  quiz: `/${ROUTE_PATHS.quiz}`,
} as const;

export interface NavItem {
  readonly to: string;
  readonly label: string;
}

/** Mục điều hướng chính trên header. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: ROUTES.library, label: 'Thư viện' },
  { to: ROUTES.study, label: 'Ôn tập' },
  { to: ROUTES.quiz, label: 'Quiz' },
];
