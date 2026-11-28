import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { libraryEndpoint } from '../../library-source';
import { getCachedAuthSession, getUserScopedKey, readAuthSession } from '../auth/auth-store';
import type { SampleVideoItem } from './types';

export interface ShadowingCatalogResponse {
  adminVideos: SampleVideoItem[];
  myVideos: SampleVideoItem[];
}

const CACHE_KEY = 'kanji_nest_shadowing_catalog_v2';

function apiBase(): string {
  return (
    libraryEndpoint ||
    (Platform.OS === 'web' ? 'http://localhost:3000/api' : 'http://localhost:3000/api')
  ).replace(/\/+$/, '');
}

async function getAuthHeaders(includeJson = false): Promise<Record<string, string>> {
  const session = getCachedAuthSession() ?? (await readAuthSession());
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return headers;
}

export async function fetchShadowingCatalog(): Promise<ShadowingCatalogResponse> {
  const headers = await getAuthHeaders(false);
  const scopedKey = await getUserScopedKey(CACHE_KEY);

  try {
    const resp = await fetch(`${apiBase()}/shadowing/videos`, { headers });
    if (resp.ok) {
      const remote = (await resp.json()) as Partial<ShadowingCatalogResponse>;
      const data: ShadowingCatalogResponse = {
        adminVideos: Array.isArray(remote.adminVideos) ? remote.adminVideos : [],
        myVideos: Array.isArray(remote.myVideos) ? remote.myVideos : [],
      };
      void AsyncStorage.setItem(scopedKey, JSON.stringify(data)).catch(() => undefined);
      return data;
    }
  } catch {
    // Offline fallback to cached catalog
  }

  try {
    const raw = await AsyncStorage.getItem(scopedKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ShadowingCatalogResponse>;
      return {
        adminVideos: Array.isArray(parsed.adminVideos) ? parsed.adminVideos : [],
        myVideos: Array.isArray(parsed.myVideos) ? parsed.myVideos : [],
      };
    }
  } catch {
    // ignore storage errors
  }

  return { adminVideos: [], myVideos: [] };
}

export async function saveMyShadowingVideoApi(input: {
  urlOrId: string;
  title?: string;
  channel?: string;
  level?: string;
  duration?: string;
  description?: string;
}): Promise<{ video: SampleVideoItem }> {
  const headers = await getAuthHeaders(true);
  if (!headers.Authorization) {
    throw new Error('Vui lòng đăng nhập để lưu video vào mục "Video của tôi".');
  }
  const resp = await fetch(`${apiBase()}/shadowing/my-videos`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    video?: SampleVideoItem;
    message?: string;
  };
  if (!resp.ok || !data.video) {
    throw new Error(data.message || `Không lưu được video (HTTP ${resp.status}).`);
  }
  return { video: data.video };
}

export async function deleteMyShadowingVideoApi(videoId: string): Promise<void> {
  const headers = await getAuthHeaders(false);
  if (!headers.Authorization) {
    throw new Error('Vui lòng đăng nhập để xóa video.');
  }
  const resp = await fetch(`${apiBase()}/shadowing/my-videos/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers,
  });
  if (!resp.ok) {
    const data = (await resp.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Không xóa được video (HTTP ${resp.status}).`);
  }
}
