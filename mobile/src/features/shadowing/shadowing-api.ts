import { Platform } from 'react-native';
import { libraryEndpoint } from '../../library-source';
import type { ShadowingLine } from './types';

export function parseYouTubeVideoId(input: string): string {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
    const id = url.searchParams.get('v');
    if (id) return id;
    const match = value.match(/\/(?:embed|shorts)\/([^/?&#]+)/);
    return match ? match[1] : '';
  } catch {
    const match = value.match(/(?:youtu\.be\/|(?:v|embed|shorts)[=/])([^?&#/]+)/);
    return match ? match[1] : '';
  }
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

export async function fetchTranscriptApi(
  videoId: string,
  signal?: AbortSignal,
): Promise<{ videoId: string; lines: ShadowingLine[] }> {
  const base = libraryEndpoint || (Platform.OS === 'web' ? '/api' : 'http://localhost:3000/api');
  const url = `${base.replace(/\/+$/, '')}/transcript?id=${encodeURIComponent(videoId)}`;

  let response: Response | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(url, { signal });
      break;
    } catch (err) {
      lastErr = err;
      if (signal?.aborted || attempt === 1) break;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  if (!response) {
    const rawMsg = lastErr instanceof Error ? lastErr.message : '';
    if (/failed to fetch|networkerror|load failed/i.test(rawMsg)) {
      throw new Error(
        `Không kết nối được tới máy chủ backend (${base}). Hãy kiểm tra backend đang chạy (npm run dev) rồi bấm thử lại.`,
      );
    }
    throw lastErr instanceof Error ? lastErr : new Error('Không kết nối được tới máy chủ backend.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi tải phụ đề (HTTP ${response.status})`);
  }
  return response.json();
}

export async function translateJapaneseApi(text: string, signal?: AbortSignal): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';
  const base = libraryEndpoint || (Platform.OS === 'web' ? '/api' : 'http://localhost:3000/api');
  const url = `${base.replace(/\/+$/, '')}/transcript/translate?text=${encodeURIComponent(clean)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return '';
  const data = (await response.json()) as { translation?: string };
  return data.translation ?? '';
}
