import type { PullResult, QuizSessionDto } from '../../packages/contracts/src/study';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { LocalWorkspace } from './workspace-storage';

const metroHost = Constants.expoConfig?.hostUri;
export const libraryEndpoint = process.env.EXPO_PUBLIC_KANJI_API_BASE_URL?.trim().replace(/\/+$/, '') ||
  (Platform.OS === 'web' ? '/api' : __DEV__ && metroHost ? `http://${metroHost}/api` : undefined);

export async function pushLibrary(changes: LocalWorkspace, signal: AbortSignal) {
  const response = await fetch(`${libraryEndpoint}/sync/push`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes), signal,
  });
  if (!response.ok) throw new Error(`Không gửi được thay đổi (HTTP ${response.status}).`);
}

async function postStudy<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(`${libraryEndpoint}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Không lưu được kết quả (HTTP ${response.status}).`);
  return response.json();
}

export function saveQuiz(payload: import('./TypingQuiz').QuizSubmission) {
  return postStudy<QuizSessionDto>('/quiz/sessions', payload);
}

export async function loadLibrary(signal: AbortSignal): Promise<PullResult> {
  if (!libraryEndpoint) throw new Error('Chưa cấu hình địa chỉ máy chủ.');
  const response = await fetch(`${libraryEndpoint.replace(/\/+$/, '')}/sync/pull`, { signal });
  if (!response.ok) throw new Error(`Không tải được thư viện (HTTP ${response.status}).`);
  const result: PullResult = await response.json();
  if (typeof result.serverTime !== 'string' || !Array.isArray(result.vocabularies) || !Array.isArray(result.folders)) {
    throw new Error('Máy chủ trả về dữ liệu thư viện không hợp lệ.');
  }
  return result;
}
