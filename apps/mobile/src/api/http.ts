/**
 * Client HTTP tối thiểu cho mobile (mirror `apps/web/.../shared/api/http.ts`).
 * Base URL: `EXPO_PUBLIC_API_URL` (VD http://192.168.1.10:3000/api khi chạy máy
 * thật) — mặc định localhost cho giả lập.
 */
const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:3000/api';

/** Lỗi API kèm HTTP status + payload lỗi (nếu server trả JSON). */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type QueryValue = string | number | boolean | undefined;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = `${API_BASE_URL}${path}`;
  if (query === undefined) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs === '' ? base : `${base}?${qs}`;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Gọi API JSON. Ném `ApiError` khi status >= 400. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options;
  const headers: Record<string, string> = {};
  const init: RequestInit = { method, headers };
  if (signal !== undefined) init.signal = signal;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path, query), init);
  const payload = await parseBody(res);

  if (!res.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Yêu cầu thất bại (HTTP ${res.status})`;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}
