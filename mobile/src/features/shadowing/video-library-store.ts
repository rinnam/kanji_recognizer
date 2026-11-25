import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { libraryEndpoint } from '../../library-source';
import type { SampleVideoItem } from './types';

export interface VideoFolder {
  id: string;
  name: string;
}

export interface SavedVideoItem extends SampleVideoItem {
  folderId?: string | null;
  isCustom?: boolean;
}

export interface ShadowingLibraryData {
  folders: VideoFolder[];
  customVideos: SavedVideoItem[];
}

const STORAGE_KEY = 'kanji_nest_shadowing_library_v1';

const DEFAULT_DATA: ShadowingLibraryData = {
  folders: [
    { id: 'vfolder_fav', name: 'Yêu thích' },
    { id: 'vfolder_podcast', name: 'Podcast luyện nghe' },
  ],
  customVideos: [],
};

function apiBase(): string {
  return (libraryEndpoint || (Platform.OS === 'web' ? 'http://localhost:3000/api' : 'http://localhost:3000/api')).replace(
    /\/+$/,
    '',
  );
}

export async function readShadowingLibrary(): Promise<ShadowingLibraryData> {
  // 1) Try PostgreSQL backend first so data survives browser clearing & syncs across devices
  try {
    const resp = await fetch(`${apiBase()}/transcript/library`);
    if (resp.ok) {
      const remote = (await resp.json()) as Partial<ShadowingLibraryData>;
      const merged: ShadowingLibraryData = {
        folders: remote.folders && remote.folders.length > 0 ? remote.folders : DEFAULT_DATA.folders,
        customVideos: Array.isArray(remote.customVideos) ? remote.customVideos : [],
      };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => undefined);
      return merged;
    }
  } catch {
    // Offline fallback to AsyncStorage
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as Partial<ShadowingLibraryData>;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : DEFAULT_DATA.folders,
      customVideos: Array.isArray(parsed.customVideos) ? parsed.customVideos : [],
    };
  } catch {
    return DEFAULT_DATA;
  }
}

export async function saveShadowingLibrary(data: ShadowingLibraryData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore local storage errors
  }

  try {
    await fetch(`${apiBase()}/transcript/library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // offline: remains cached in AsyncStorage
  }
}
