import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { stripBom } from '../../import-parser';
import { getCachedAdminSession, readAdminSession } from '../auth/auth-store';
import {
  getApiBase,
  type JlptLevel,
  type LessonItemDto,
  type LessonMaterialDto,
  type LessonStatus,
  type SubscriptionTier,
} from '../lessons/lessons-api';

export interface AdminPlanDefinition {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPriceVnd: number;
  yearlyPriceVnd: number;
  yearlyPerMonthVnd: number;
  multiplier: number;
  shadowingCustomPerDay: number | null;
  readingPerWeek: number | null;
  writingPerWeek: number | null;
  speakingLifePerDay: number | null;
  speakingWorkPerDay: number | null;
  itEngineerAllowed: boolean;
  uploadCvAllowed: boolean;
  fullRubricAllowed: boolean;
  highlights: string[];
}

export interface AdminOverviewKpi {
  totalUsers: number;
  newUsers30d: number;
  activeUsersToday: number;
  paidUsersCount: number;
  tierCounts: { free: number; plus: number; pro: number };
  revenueRealVnd: number;
  revenueDemoVnd: number;
  revenueThisMonthRealVnd: number;
  revenueThisMonthDemoVnd: number;
  paidOrderCount: number;
  publishedLessonCount: number;
  draftLessonCount: number;
  materialCount: number;
}

export interface RevenueSeriesPoint {
  label: string;
  dateKey: string;
  amountVnd: number;
  orderCount: number;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
  adminEmail: string;
  adminName: string;
}

export interface AdminOverviewResponse {
  kpi: AdminOverviewKpi;
  revenueSeries: RevenueSeriesPoint[];
  recentAuditLogs: AdminAuditEntry[];
}

export interface AdminOrderDto {
  id: string;
  orderCode: string;
  userId: string;
  userEmail: string;
  userName: string;
  tier: 'plus' | 'pro';
  billingCycle: 'monthly' | 'yearly';
  amountVnd: number;
  status: 'paid' | 'pending' | 'refunded';
  isDemo: boolean;
  provider: string;
  note: string;
  paidAt: string | null;
  createdAt: string;
}

export type SubscriptionStatusKind = 'active' | 'expiring_soon' | 'expired' | 'free';

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  createdAt: string;
  tier: SubscriptionTier;
  rawTier?: SubscriptionTier;
  planName?: string;
  billingCycle: 'monthly' | 'yearly';
  startedAt?: string | null;
  expiresAt: string | null;
  listPriceVnd?: number;
  subscriptionStatus?: SubscriptionStatusKind;
  daysRemaining?: number | null;
  isLifetime?: boolean;
  currentOrderCode?: string | null;
  totalPaidVnd?: number;
  jlptLevel: string;
  ksBalance: number;
  studyDays: number;
  totalStudyMinutes: number;
  vocabCount: number;
}

export interface AdminSubscriptionRow {
  userId: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  userCreatedAt: string;
  tier: SubscriptionTier;
  effectiveTier: SubscriptionTier;
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  listPriceVnd: number;
  monthlyEquivalentVnd: number;
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  isLifetime: boolean;
  subscriptionStatus: SubscriptionStatusKind;
  currentOrderCode: string | null;
  lastOrderCode: string | null;
  lastPaidAmountVnd: number | null;
  lastPaidAt: string | null;
  lastProvider: string | null;
  lastIsDemo: boolean | null;
  totalPaidVnd: number;
  totalDemoVnd: number;
  paidOrderCount: number;
}

export interface AdminSubscriptionsSummary {
  totalCustomers: number;
  activePaidCount: number;
  activePlusCount: number;
  activeProCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  freeCount: number;
  estimatedMrrVnd: number;
  totalRevenueCollectedVnd: number;
}

export interface AdminPlanPriceInfo {
  name: string;
  monthlyPriceVnd: number;
  yearlyPriceVnd: number;
  yearlyPerMonthVnd: number;
}

export interface AdminSubscriptionsResponse {
  summary: AdminSubscriptionsSummary;
  planCatalog: {
    plus: AdminPlanPriceInfo;
    pro: AdminPlanPriceInfo;
  };
  total: number;
  subscriptions: AdminSubscriptionRow[];
}

export interface AdminSubscriptionDetailResponse {
  subscription: AdminSubscriptionRow;
  orders: Array<{
    id: string;
    orderCode: string;
    tier: 'plus' | 'pro';
    billingCycle: 'monthly' | 'yearly';
    amountVnd: number;
    status: 'paid' | 'pending' | 'refunded';
    isDemo: boolean;
    provider: string;
    note: string;
    paidAt: string | null;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    detail: string;
    createdAt: string;
    adminName: string;
  }>;
}

export interface AdminLessonDto {
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
  createdAt: string;
  updatedAt: string;
}

async function getAdminAuthHeaders(includeJson = false): Promise<Record<string, string>> {
  const session = getCachedAdminSession() ?? (await readAdminSession());
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  return headers;
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAdminAuthHeaders(Boolean(init?.body));
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || `Lỗi máy chủ (${res.status}).`);
  }
  return data;
}

export function fetchAdminPlans() {
  return adminRequest<{ plans: AdminPlanDefinition[]; defaults: AdminPlanDefinition[] }>(
    '/admin/plans',
  );
}

export function updateAdminPlan(
  tier: SubscriptionTier,
  payload: Omit<AdminPlanDefinition, 'tier'>,
) {
  return adminRequest<{ plan: AdminPlanDefinition }>(`/admin/plans/${encodeURIComponent(tier)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function resetAdminPlan(tier: SubscriptionTier) {
  return adminRequest<{ plan: AdminPlanDefinition }>(
    `/admin/plans/${encodeURIComponent(tier)}/reset`,
    { method: 'POST' },
  );
}

export async function fileAssetToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const s = String(reader.result ?? '');
        const idx = s.indexOf(',');
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      reader.onerror = () => reject(new Error('Không đọc được tệp đã chọn.'));
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

export async function fileAssetToText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const text = await resp.text();
    return stripBom(text);
  }
  const text = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
  return stripBom(text);
}

export function fetchAdminOverview(days: 7 | 30 | 90 | 365, kind: 'all' | 'real' | 'demo') {
  return adminRequest<AdminOverviewResponse>(`/admin/overview?days=${days}&kind=${kind}`);
}

export function fetchAdminOrders(params: {
  status?: 'all' | 'paid' | 'pending' | 'refunded';
  kind?: 'all' | 'real' | 'demo';
  q?: string;
}) {
  const qs = new URLSearchParams({
    status: params.status ?? 'all',
    kind: params.kind ?? 'all',
    q: params.q ?? '',
    limit: '50',
  });
  return adminRequest<{ orders: AdminOrderDto[]; total: number }>(`/admin/orders?${qs.toString()}`);
}

export function createAdminManualOrder(payload: {
  email: string;
  tier: 'plus' | 'pro';
  billingCycle: 'monthly' | 'yearly';
  amountVnd?: number;
  status: 'paid' | 'pending';
  isDemo: boolean;
  note?: string;
}) {
  return adminRequest<{ id: string; orderCode: string }>('/admin/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminOrderStatus(
  orderId: string,
  status: 'paid' | 'pending' | 'refunded',
  note?: string,
) {
  return adminRequest<{ ok: boolean }>(`/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

export function fetchAdminUsers(params: {
  q?: string;
  role?: 'all' | 'user' | 'admin';
  tier?: 'all' | 'free' | 'plus' | 'pro';
  status?: 'all' | 'active' | 'banned';
}) {
  const qs = new URLSearchParams({
    q: params.q ?? '',
    role: params.role ?? 'all',
    tier: params.tier ?? 'all',
    status: params.status ?? 'all',
    limit: '60',
  });
  return adminRequest<{ users: AdminUserRow[]; total: number }>(`/admin/users?${qs.toString()}`);
}

export function updateAdminUserRole(userId: string, role: 'user' | 'admin') {
  return adminRequest<{ ok: boolean; role: 'user' | 'admin' }>(
    `/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  );
}

export function updateAdminUserBan(userId: string, isBanned: boolean) {
  return adminRequest<{ ok: boolean; isBanned: boolean }>(
    `/admin/users/${encodeURIComponent(userId)}/ban`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isBanned }),
    },
  );
}

export function fetchAdminSubscriptions(params: {
  q?: string;
  status?: 'all' | SubscriptionStatusKind;
  tier?: 'all' | SubscriptionTier;
  cycle?: 'all' | 'monthly' | 'yearly';
  sort?: 'expires_asc' | 'started_desc' | 'spent_desc';
}) {
  const qs = new URLSearchParams({
    q: params.q ?? '',
    status: params.status ?? 'all',
    tier: params.tier ?? 'all',
    cycle: params.cycle ?? 'all',
    sort: params.sort ?? 'expires_asc',
    limit: '80',
  });
  return adminRequest<AdminSubscriptionsResponse>(`/admin/subscriptions?${qs.toString()}`);
}

export function fetchAdminSubscriptionDetail(userId: string) {
  return adminRequest<AdminSubscriptionDetailResponse>(
    `/admin/subscriptions/${encodeURIComponent(userId)}`,
  );
}

export function adminSetUserSubscriptionApi(
  userId: string,
  payload: {
    tier: SubscriptionTier;
    billingCycle: 'monthly' | 'yearly';
    mode?: 'replace' | 'extend';
    durationDays?: number;
    recordOrder: boolean;
    amountVnd?: number;
    isDemo: boolean;
    provider?: string;
    startedAt?: string;
    expiresAt?: string;
    note?: string;
  },
) {
  return adminRequest<unknown>(`/admin/users/${encodeURIComponent(userId)}/subscription`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function adminAdjustUserPointsApi(userId: string, delta: number, reason: string) {
  return adminRequest<{ applied: boolean; delta: number; balanceAfter: number }>(
    `/admin/users/${encodeURIComponent(userId)}/points`,
    {
      method: 'POST',
      body: JSON.stringify({ delta, reason }),
    },
  );
}

export function fetchAdminLessons(
  level: 'ALL' | JlptLevel = 'ALL',
  status: 'all' | LessonStatus = 'all',
  q = '',
) {
  const qs = new URLSearchParams({
    level,
    status,
    q,
  });
  return adminRequest<{ lessons: AdminLessonDto[] }>(`/admin/lessons?${qs.toString()}`);
}

export function fetchAdminLessonDetail(id: string) {
  return adminRequest<{
    lesson: AdminLessonDto;
    items: LessonItemDto[];
    materials: LessonMaterialDto[];
  }>(`/admin/lessons/${encodeURIComponent(id)}`);
}

export function createAdminLesson(payload: {
  title: string;
  jlptLevel: JlptLevel;
  category: string;
  summary: string;
  contentMd: string;
  accessTier: SubscriptionTier;
  status: LessonStatus;
  sortOrder: number;
}) {
  return adminRequest<{ lesson: AdminLessonDto }>('/admin/lessons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminLesson(
  id: string,
  payload: Partial<{
    title: string;
    jlptLevel: JlptLevel;
    category: string;
    summary: string;
    contentMd: string;
    accessTier: SubscriptionTier;
    status: LessonStatus;
    sortOrder: number;
  }>,
) {
  return adminRequest<{ lesson: AdminLessonDto }>(`/admin/lessons/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminLesson(id: string) {
  return adminRequest<{ ok: boolean }>(`/admin/lessons/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function addAdminLessonItem(
  lessonId: string,
  payload: {
    word: string;
    reading?: string | null;
    meaning: string;
    sinoVietnamese?: string | null;
    example?: string | null;
    exampleMeaning?: string | null;
  },
) {
  return adminRequest<{ item: LessonItemDto }>(
    `/admin/lessons/${encodeURIComponent(lessonId)}/items`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminLessonItem(
  lessonId: string,
  itemId: string,
  payload: Partial<{
    word: string;
    reading: string | null;
    meaning: string;
    sinoVietnamese: string | null;
    example: string | null;
    exampleMeaning: string | null;
    sortOrder: number;
  }>,
) {
  return adminRequest<{ item: LessonItemDto }>(
    `/admin/lessons/${encodeURIComponent(lessonId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function bulkAddAdminLessonItems(
  lessonId: string,
  items: Array<{
    word: string;
    reading?: string | null;
    meaning: string;
    sinoVietnamese?: string | null;
    example?: string | null;
    exampleMeaning?: string | null;
  }>,
) {
  return adminRequest<{ addedCount: number; items: LessonItemDto[] }>(
    `/admin/lessons/${encodeURIComponent(lessonId)}/items/bulk`,
    {
      method: 'POST',
      body: JSON.stringify({ items }),
    },
  );
}

export function deleteAdminLessonItem(lessonId: string, itemId: string) {
  return adminRequest<{ ok: boolean }>(
    `/admin/lessons/${encodeURIComponent(lessonId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  );
}

export function uploadAdminLessonMaterialFile(
  lessonId: string,
  payload: {
    title: string;
    fileName: string;
    mimeType: string;
    base64Data: string;
    description: string;
  },
) {
  return adminRequest<{ material: LessonMaterialDto }>(
    `/admin/lessons/${encodeURIComponent(lessonId)}/materials/file`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function addAdminLessonMaterialLink(
  lessonId: string,
  payload: {
    title: string;
    externalUrl: string;
    description: string;
  },
) {
  return adminRequest<{ material: LessonMaterialDto }>(
    `/admin/lessons/${encodeURIComponent(lessonId)}/materials/link`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminLessonMaterial(lessonId: string, materialId: string) {
  return adminRequest<{ ok: boolean }>(
    `/admin/lessons/${encodeURIComponent(lessonId)}/materials/${encodeURIComponent(materialId)}`,
    { method: 'DELETE' },
  );
}

export type AdminShadowingStatus = 'published' | 'hidden';

export interface AdminShadowingVideoDto {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  level: string;
  duration: string;
  description: string;
  status: AdminShadowingStatus;
  sortOrder: number;
  source: 'admin';
  createdAt: string;
  updatedAt: string;
}

export function fetchAdminShadowingVideos(
  status: 'all' | AdminShadowingStatus = 'all',
  q = '',
) {
  const qs = new URLSearchParams({ status, q });
  return adminRequest<{ videos: AdminShadowingVideoDto[] }>(`/admin/shadowing?${qs.toString()}`);
}

export function createAdminShadowingVideo(payload: {
  urlOrId: string;
  title?: string;
  channel?: string;
  level?: string;
  duration?: string;
  description?: string;
  status: AdminShadowingStatus;
  sortOrder: number;
}) {
  return adminRequest<{ video: AdminShadowingVideoDto }>('/admin/shadowing', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminShadowingVideo(
  id: string,
  payload: Partial<{
    urlOrId: string;
    title: string;
    channel: string;
    level: string;
    duration: string;
    description: string;
    status: AdminShadowingStatus;
    sortOrder: number;
  }>,
) {
  return adminRequest<{ video: AdminShadowingVideoDto }>(
    `/admin/shadowing/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminShadowingVideo(id: string) {
  return adminRequest<{ ok: boolean }>(`/admin/shadowing/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export type AdminGrammarStatus = 'published' | 'hidden';

export interface AdminGrammarExampleDto {
  ja: string;
  reading: string;
  vi: string;
}

export interface AdminGrammarPointDto {
  id: string;
  level: JlptLevel;
  category: string;
  pattern: string;
  structure: string;
  meaningVi: string;
  nuanceVi: string;
  examples: AdminGrammarExampleDto[];
  status: AdminGrammarStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGrammarStarDto {
  id: string;
  level: JlptLevel;
  meaningVi: string;
  prefixJa: string;
  suffixJa: string;
  parts: [string, string, string, string];
  starIndex: 0 | 1 | 2 | 3;
  explanationVi: string;
  status: AdminGrammarStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGrammarBlitzDto {
  id: string;
  kind: 'particle' | 'conjugation';
  level: JlptLevel;
  promptMain: string;
  promptSub: string;
  meaningVi: string;
  correct: string;
  choices: [string, string, string, string];
  tipVi: string;
  status: AdminGrammarStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function fetchAdminGrammarPoints(params: {
  level: 'ALL' | JlptLevel;
  category: string;
  status: 'all' | AdminGrammarStatus;
  q: string;
}) {
  const qs = new URLSearchParams(params);
  return adminRequest<{
    points: AdminGrammarPointDto[];
    totals: { points: number; star: number; blitz: number };
  }>(`/admin/grammar?${qs.toString()}`);
}

export function createAdminGrammarPoint(payload: {
  level: JlptLevel;
  category: string;
  pattern: string;
  structure: string;
  meaningVi: string;
  nuanceVi: string;
  examples: AdminGrammarExampleDto[];
  status: AdminGrammarStatus;
  sortOrder: number;
}) {
  return adminRequest<{ point: AdminGrammarPointDto }>('/admin/grammar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminGrammarPoint(
  id: string,
  payload: Partial<{
    level: JlptLevel;
    category: string;
    pattern: string;
    structure: string;
    meaningVi: string;
    nuanceVi: string;
    examples: AdminGrammarExampleDto[];
    status: AdminGrammarStatus;
    sortOrder: number;
  }>,
) {
  return adminRequest<{ point: AdminGrammarPointDto }>(`/admin/grammar/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminGrammarPoint(id: string) {
  return adminRequest<{ ok: boolean }>(`/admin/grammar/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function fetchAdminGrammarStar(params: {
  level: 'ALL' | JlptLevel;
  status: 'all' | AdminGrammarStatus;
  q: string;
}) {
  const qs = new URLSearchParams(params);
  return adminRequest<{ questions: AdminGrammarStarDto[] }>(`/admin/grammar/star?${qs.toString()}`);
}

export function createAdminGrammarStar(payload: {
  level: JlptLevel;
  meaningVi: string;
  prefixJa: string;
  suffixJa: string;
  parts: [string, string, string, string];
  starIndex: number;
  explanationVi: string;
  status: AdminGrammarStatus;
  sortOrder: number;
}) {
  return adminRequest<{ question: AdminGrammarStarDto }>('/admin/grammar/star', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminGrammarStar(
  id: string,
  payload: Partial<{
    level: JlptLevel;
    meaningVi: string;
    prefixJa: string;
    suffixJa: string;
    parts: [string, string, string, string];
    starIndex: number;
    explanationVi: string;
    status: AdminGrammarStatus;
    sortOrder: number;
  }>,
) {
  return adminRequest<{ question: AdminGrammarStarDto }>(
    `/admin/grammar/star/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminGrammarStar(id: string) {
  return adminRequest<{ ok: boolean }>(`/admin/grammar/star/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function fetchAdminGrammarBlitz(params: {
  kind: 'all' | 'particle' | 'conjugation';
  level: 'ALL' | JlptLevel;
  status: 'all' | AdminGrammarStatus;
  q: string;
}) {
  const qs = new URLSearchParams(params);
  return adminRequest<{ questions: AdminGrammarBlitzDto[] }>(
    `/admin/grammar/blitz?${qs.toString()}`,
  );
}

export function createAdminGrammarBlitz(payload: {
  kind: 'particle' | 'conjugation';
  level: JlptLevel;
  promptMain: string;
  promptSub: string;
  meaningVi: string;
  correct: string;
  choices: [string, string, string, string];
  tipVi: string;
  status: AdminGrammarStatus;
  sortOrder: number;
}) {
  return adminRequest<{ question: AdminGrammarBlitzDto }>('/admin/grammar/blitz', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminGrammarBlitz(
  id: string,
  payload: Partial<{
    kind: 'particle' | 'conjugation';
    level: JlptLevel;
    promptMain: string;
    promptSub: string;
    meaningVi: string;
    correct: string;
    choices: [string, string, string, string];
    tipVi: string;
    status: AdminGrammarStatus;
    sortOrder: number;
  }>,
) {
  return adminRequest<{ question: AdminGrammarBlitzDto }>(
    `/admin/grammar/blitz/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminGrammarBlitz(id: string) {
  return adminRequest<{ ok: boolean }>(`/admin/grammar/blitz/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
