import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FolderDto, PullResult, VocabularyDto } from '../../packages/contracts/src/study';
import { getUserScopedKey } from './features/auth/auth-store';

export type WordInput = Pick<VocabularyDto, 'word' | 'meaning' | 'reading' | 'jlptLevel'>;
export interface LocalWorkspace {
  folders: FolderDto[];
  vocabularies: VocabularyDto[];
}

const localKey = 'kanji-nest.expo.local.v2';
const cacheKey = 'kanji-nest.expo.server-cache.v2';
export const emptyWorkspace: LocalWorkspace = { folders: [], vocabularies: [] };

export async function readLocalWorkspace(): Promise<LocalWorkspace> {
  const key = await getUserScopedKey(localKey);
  const stored = await AsyncStorage.getItem(key);
  if (stored === null) return emptyWorkspace;
  const workspace: LocalWorkspace = JSON.parse(stored);
  if (!Array.isArray(workspace.folders) || !Array.isArray(workspace.vocabularies)) {
    throw new Error('Không đọc được thư viện đã lưu trên thiết bị.');
  }
  return workspace;
}

export async function saveLocalWorkspace(workspace: LocalWorkspace) {
  const key = await getUserScopedKey(localKey);
  await AsyncStorage.setItem(key, JSON.stringify(workspace));
}

export async function readServerCache(endpoint: string): Promise<PullResult | undefined> {
  const key = await getUserScopedKey(cacheKey);
  const value = await AsyncStorage.getItem(key);
  if (!value) return undefined;
  const cached: { endpoint: string; library: PullResult } = JSON.parse(value);
  return cached.endpoint === endpoint ? cached.library : undefined;
}

export async function saveServerCache(endpoint: string, library: PullResult) {
  const key = await getUserScopedKey(cacheKey);
  await AsyncStorage.setItem(key, JSON.stringify({ endpoint, library }));
}

function localId() {
  return `expo-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createLocalWord(input: WordInput, folderId: string | null): VocabularyDto {
  const now = new Date().toISOString();
  return {
    ...input, id: localId(), folderIds: folderId === null ? [] : [folderId],
    sinoVietnamese: null, note: null, example: null, exampleMeaning: null, tags: [],
    srsInterval: null, srsRepetition: null, srsEaseFactor: null, srsNextReview: null,
    createdAt: now, updatedAt: now, deletedAt: null,
  };
}

export function createLocalFolder(name: string, parentId: string | null): FolderDto {
  const now = new Date().toISOString();
  return { id: localId(), name, parentId, order: null, createdAt: now, updatedAt: now, deletedAt: null };
}
