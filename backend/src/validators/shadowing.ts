import { z } from 'zod';

/** Tách YouTube video ID 11 ký tự từ URL đầy đủ hoặc chuỗi ID trực tiếp. */
export function extractYouTubeVideoId(rawInput: string): string | null {
  const value = rawInput.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) {
    return value;
  }

  let candidateUrl = value;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidateUrl)) {
    candidateUrl = `https://${candidateUrl}`;
  }

  try {
    const url = new URL(candidateUrl);
    const host = url.hostname.toLowerCase();
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const seg = url.pathname.replace(/^\/+/, '').split('/')[0] ?? '';
      return /^[A-Za-z0-9_-]{11}$/.test(seg) ? seg : null;
    }
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const vParam = url.searchParams.get('v') ?? '';
      if (/^[A-Za-z0-9_-]{11}$/.test(vParam)) return vParam;
      const pathMatch = url.pathname.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
      if (pathMatch?.[1]) return pathMatch[1];
    }
  } catch {
    const fallback = value.match(/(?:youtu\.be\/|(?:v|embed|shorts|live)[=/])([A-Za-z0-9_-]{11})/);
    if (fallback?.[1]) return fallback[1];
  }
  return null;
}

export const adminShadowingListQuerySchema = z.object({
  status: z.enum(['all', 'published', 'hidden']).default('all'),
  q: z.string().trim().max(120).optional().default(''),
});

export const createAdminShadowingSchema = z.object({
  urlOrId: z.string().trim().min(5, 'Vui lòng nhập link YouTube hoặc mã video hợp lệ.').max(500),
  title: z.string().trim().max(240).optional().default(''),
  channel: z.string().trim().max(160).optional().default(''),
  level: z.string().trim().max(40).optional().default(''),
  duration: z.string().trim().max(30).optional().default(''),
  description: z.string().trim().max(600).optional().default(''),
  status: z.enum(['published', 'hidden']).default('published'),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const updateAdminShadowingSchema = z.object({
  urlOrId: z.string().trim().min(5).max(500).optional(),
  title: z.string().trim().min(1, 'Tiêu đề video không được trống.').max(240).optional(),
  channel: z.string().trim().max(160).optional(),
  level: z.string().trim().max(40).optional(),
  duration: z.string().trim().max(30).optional(),
  description: z.string().trim().max(600).optional(),
  status: z.enum(['published', 'hidden']).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const saveUserShadowingSchema = z.object({
  urlOrId: z.string().trim().min(5, 'Link YouTube không hợp lệ.').max(500),
  title: z.string().trim().max(240).optional(),
  channel: z.string().trim().max(160).optional(),
  level: z.string().trim().max(40).optional(),
  duration: z.string().trim().max(30).optional(),
  description: z.string().trim().max(600).optional(),
});
