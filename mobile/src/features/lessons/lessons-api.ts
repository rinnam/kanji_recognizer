import { libraryEndpoint } from '../../library-source';
import { getCachedAuthSession, readAuthSession } from '../auth/auth-store';

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type LessonStatus = 'draft' | 'published';

export interface PublicLessonSummary {
  id: string;
  title: string;
  jlptLevel: JlptLevel;
  category: string;
  summary: string;
  contentMd: string;
  accessTier: SubscriptionTier;
  status: LessonStatus;
  sortOrder: number;
  itemCount: number;
  materialCount: number;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonItemDto {
  id: string;
  lessonId: string;
  word: string;
  reading: string | null;
  meaning: string;
  sinoVietnamese: string | null;
  example: string | null;
  exampleMeaning: string | null;
  sortOrder: number;
}

export interface LessonMaterialDto {
  id: string;
  lessonId: string;
  title: string;
  materialType: 'file' | 'link';
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  description: string;
  sortOrder: number;
  createdAt: string;
}

export interface PublicLessonDetailResponse {
  lesson: Omit<PublicLessonSummary, 'locked'>;
  locked: boolean;
  userTier: SubscriptionTier;
  items: LessonItemDto[];
  materials: LessonMaterialDto[];
}

export interface PublicLessonsResponse {
  lessons: PublicLessonSummary[];
  levelCounts: Record<JlptLevel, number>;
  userTier: SubscriptionTier;
}

export function getApiBase(): string {
  return (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
}

export async function getAuthHeaders(includeJson = false): Promise<Record<string, string>> {
  const session = getCachedAuthSession() ?? (await readAuthSession());
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  return headers;
}

export function buildMaterialFileUrl(materialId: string, accessToken?: string | null): string {
  const base = getApiBase();
  const qs = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${base}/lessons/materials/${encodeURIComponent(materialId)}/file${qs}`;
}

export async function fetchPublicLessons(level: 'ALL' | JlptLevel = 'ALL'): Promise<PublicLessonsResponse> {
  const headers = await getAuthHeaders(false);
  const res = await fetch(`${getApiBase()}/lessons?level=${encodeURIComponent(level)}`, { headers });
  if (!res.ok) throw new Error('Không tải được danh sách bài học.');
  return (await res.json()) as PublicLessonsResponse;
}

export async function fetchPublicLessonDetail(id: string): Promise<PublicLessonDetailResponse> {
  const headers = await getAuthHeaders(false);
  const res = await fetch(`${getApiBase()}/lessons/${encodeURIComponent(id)}`, { headers });
  const data = (await res.json().catch(() => ({}))) as PublicLessonDetailResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Không tải được chi tiết bài học.');
  }
  return data;
}

export async function saveLessonToFlashcardsApi(lessonId: string): Promise<{
  folderId: string;
  folderName: string;
  addedCount: number;
  skippedCount: number;
}> {
  const headers = await getAuthHeaders(true);
  const res = await fetch(`${getApiBase()}/lessons/${encodeURIComponent(lessonId)}/save-flashcards`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  const data = (await res.json().catch(() => ({}))) as {
    folderId?: string;
    folderName?: string;
    addedCount?: number;
    skippedCount?: number;
    message?: string;
  };
  if (!res.ok || !data.folderId) {
    throw new Error(data.message || 'Không lưu được bài học vào Flashcard.');
  }
  return {
    folderId: data.folderId,
    folderName: data.folderName ?? 'Bài học',
    addedCount: data.addedCount ?? 0,
    skippedCount: data.skippedCount ?? 0,
  };
}
