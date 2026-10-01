/**
 * Base URL của API.
 * - Dev: mặc định '/api' — gọi cùng-origin rồi Vite proxy chuyển sang Fastify (xem vite.config.ts).
 * - Môi trường build khác: đặt VITE_API_BASE_URL để trỏ tuyệt đối tới server.
 */
const DEFAULT_API_BASE = '/api';

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE;
