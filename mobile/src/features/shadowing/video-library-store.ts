import AsyncStorage from '@react-native-async-storage/async-storage';
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

export async function readShadowingLibrary(): Promise<ShadowingLibraryData> {
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
    // ignore storage errors
  }
}
