/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL của API khi build cho môi trường khác dev (dev dùng Vite proxy /api). */
  readonly VITE_API_BASE_URL?: string;
}
