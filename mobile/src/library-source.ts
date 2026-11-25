import type { PullResult, QuizSessionDto } from '../../packages/contracts/src/study';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { LocalWorkspace } from './workspace-storage';
import { readAuthSession } from './features/auth/auth-store';

async function authHeaders(): Promise<Record<string, string>> {
  const session = await readAuthSession();
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

const metroHost = Constants.expoConfig?.hostUri;

export function resolveLibraryEndpoint(platform: string, configured: string | undefined, hostUri: string | undefined, dev: boolean) {
  const explicit = configured?.trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  if (!dev) return undefined;
  if (platform === 'web') return 'http://localhost:3000/api';
  const host = hostUri?.replace(/^[a-z]+:\/\//i, '').split('/')[0]?.split(':')[0];
  return host ? `http://${host}:3000/api` : undefined;
}

export const libraryEndpoint = resolveLibraryEndpoint(
  Platform.OS,
  process.env.EXPO_PUBLIC_KANJI_API_BASE_URL,
  metroHost,
  __DEV__,
);

export async function pushLibrary(changes: LocalWorkspace, signal: AbortSignal) {
  const headers = await authHeaders();
  const response = await fetch(`${libraryEndpoint}/sync/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(changes),
    signal,
  });
  if (!response.ok) throw new Error(`Không gửi được thay đổi (HTTP ${response.status}).`);
}

async function postStudy<T>(path: string, data: unknown): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${libraryEndpoint}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Không lưu được kết quả (HTTP ${response.status}).`);
  return response.json();
}

export function saveQuiz(payload: import('./TypingQuiz').QuizSubmission) {
  return postStudy<QuizSessionDto>('/quiz/sessions', payload);
}

export async function loadLibrary(signal: AbortSignal): Promise<PullResult> {
  if (!libraryEndpoint) throw new Error('Chưa cấu hình địa chỉ máy chủ.');
  const headers = await authHeaders();
  const response = await fetch(`${libraryEndpoint.replace(/\/+$/, '')}/sync/pull`, { headers, signal });
  if (!response.ok) throw new Error(`Không tải được thư viện (HTTP ${response.status}).`);
  const result: PullResult = await response.json();
  if (typeof result.serverTime !== 'string' || !Array.isArray(result.vocabularies) || !Array.isArray(result.folders)) {
    throw new Error('Máy chủ trả về dữ liệu thư viện không hợp lệ.');
  }
  return result;
}
