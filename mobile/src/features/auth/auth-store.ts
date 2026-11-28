import AsyncStorage from '@react-native-async-storage/async-storage';
import { libraryEndpoint } from '../../library-source';

export type AuthPortal = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  portal?: AuthPortal;
}

const AUTH_KEY = 'kanji_nest_auth_session_v1';
const ADMIN_AUTH_KEY = 'kanji_nest_admin_session_v1';

let cachedSession: AuthSession | null | undefined = undefined;
const sessionListeners = new Set<(session: AuthSession | null) => void>();

let cachedAdminSession: AuthSession | null | undefined = undefined;
const adminSessionListeners = new Set<(session: AuthSession | null) => void>();

function notifySessionListeners(session: AuthSession | null) {
  for (const fn of sessionListeners) fn(session);
}

function notifyAdminSessionListeners(session: AuthSession | null) {
  for (const fn of adminSessionListeners) fn(session);
}

export function getCachedAuthSession(): AuthSession | null {
  return cachedSession ?? null;
}

export function subscribeAuthSession(fn: (session: AuthSession | null) => void): () => void {
  sessionListeners.add(fn);
  return () => {
    sessionListeners.delete(fn);
  };
}

export function getCachedAdminSession(): AuthSession | null {
  return cachedAdminSession ?? null;
}

export function subscribeAdminSession(fn: (session: AuthSession | null) => void): () => void {
  adminSessionListeners.add(fn);
  return () => {
    adminSessionListeners.delete(fn);
  };
}

function apiBase(): string {
  return (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
}

export async function readAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) {
      if (cachedSession !== null) {
        cachedSession = null;
        notifySessionListeners(null);
      }
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    const prevId = cachedSession?.user.id ?? null;
    const prevRole = cachedSession?.user.role ?? null;
    cachedSession = parsed;
    if (prevId !== parsed.user.id || prevRole !== parsed.user.role) {
      notifySessionListeners(parsed);
    }
    return parsed;
  } catch {
    cachedSession = null;
    return null;
  }
}

export async function readAdminSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_AUTH_KEY);
    if (!raw) {
      if (cachedAdminSession !== null) {
        cachedAdminSession = null;
        notifyAdminSessionListeners(null);
      }
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    const prevId = cachedAdminSession?.user.id ?? null;
    const prevRole = cachedAdminSession?.user.role ?? null;
    cachedAdminSession = parsed;
    if (prevId !== parsed.user.id || prevRole !== parsed.user.role) {
      notifyAdminSessionListeners(parsed);
    }
    return parsed;
  } catch {
    cachedAdminSession = null;
    return null;
  }
}

export async function getUserScopedKey(baseKey: string): Promise<string> {
  const session = cachedSession !== undefined ? cachedSession : await readAuthSession();
  const uid = session?.user.id || 'guest';
  return `${baseKey}:${uid}`;
}

export async function saveAuthSession(session: AuthSession | null): Promise<void> {
  cachedSession = session;
  try {
    if (!session) {
      await AsyncStorage.removeItem(AUTH_KEY);
    } else {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore
  }
  notifySessionListeners(session);
}

export async function saveAdminSession(session: AuthSession | null): Promise<void> {
  cachedAdminSession = session;
  try {
    if (!session) {
      await AsyncStorage.removeItem(ADMIN_AUTH_KEY);
    } else {
      await AsyncStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore
  }
  notifyAdminSessionListeners(session);
}

export async function loginApi(email: string, password: string): Promise<AuthSession> {
  const resp = await fetch(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: AuthUser;
    portal?: AuthPortal;
    message?: string;
  };
  if (!resp.ok || !data.accessToken || !data.user) {
    throw new Error(data.message || 'Đăng nhập thất bại.');
  }
  const session: AuthSession = {
    accessToken: data.accessToken,
    user: data.user,
    portal: data.portal ?? 'user',
  };
  await saveAuthSession(session);
  return session;
}

export async function adminLoginApi(email: string, password: string): Promise<AuthSession> {
  const resp = await fetch(`${apiBase()}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: AuthUser;
    portal?: AuthPortal;
    message?: string;
  };
  if (!resp.ok || !data.accessToken || !data.user) {
    throw new Error(data.message || 'Đăng nhập quản trị thất bại.');
  }
  const session: AuthSession = {
    accessToken: data.accessToken,
    user: data.user,
    portal: data.portal ?? 'admin',
  };
  await saveAdminSession(session);
  return session;
}

export async function registerApi(email: string, password: string, displayName: string): Promise<AuthSession> {
  const resp = await fetch(`${apiBase()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: AuthUser;
    portal?: AuthPortal;
    message?: string;
  };
  if (!resp.ok || !data.accessToken || !data.user) {
    throw new Error(data.message || 'Đăng ký thất bại.');
  }
  const session: AuthSession = {
    accessToken: data.accessToken,
    user: data.user,
    portal: data.portal ?? 'user',
  };
  await saveAuthSession(session);
  return session;
}

/** Đồng bộ lại phiên học viên từ máy chủ. */
export async function refreshAuthMe(): Promise<AuthSession | null> {
  const cur = cachedSession !== undefined ? cachedSession : await readAuthSession();
  if (!cur?.accessToken) return null;
  try {
    const resp = await fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${cur.accessToken}` },
    });
    if (resp.status === 401 || resp.status === 403) {
      await saveAuthSession(null);
      return null;
    }
    if (!resp.ok) return cur;
    const data = (await resp.json().catch(() => null)) as {
      user?: AuthUser;
      portal?: AuthPortal;
    } | null;
    if (!data?.user) return cur;
    const nextPortal: AuthPortal = data.portal ?? cur.portal ?? 'user';
    const next: AuthSession = { accessToken: cur.accessToken, user: data.user, portal: nextPortal };
    if (
      next.user.role !== cur.user.role ||
      next.user.displayName !== cur.user.displayName ||
      next.user.email !== cur.user.email ||
      next.portal !== cur.portal
    ) {
      await saveAuthSession(next);
    }
    return next;
  } catch {
    return cur;
  }
}

/** Đồng bộ lại phiên Quản trị từ máy chủ (bắt buộc role='admin' và portal='admin'). */
export async function refreshAdminAuthMe(): Promise<AuthSession | null> {
  const cur = cachedAdminSession !== undefined ? cachedAdminSession : await readAdminSession();
  if (!cur?.accessToken) return null;
  try {
    const resp = await fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${cur.accessToken}` },
    });
    if (resp.status === 401 || resp.status === 403) {
      await saveAdminSession(null);
      return null;
    }
    if (!resp.ok) return cur;
    const data = (await resp.json().catch(() => null)) as {
      user?: AuthUser;
      portal?: AuthPortal;
    } | null;
    if (!data?.user || data.user.role !== 'admin' || data.portal !== 'admin') {
      await saveAdminSession(null);
      return null;
    }
    const next: AuthSession = { accessToken: cur.accessToken, user: data.user, portal: 'admin' };
    if (
      next.user.role !== cur.user.role ||
      next.user.displayName !== cur.user.displayName ||
      next.user.email !== cur.user.email ||
      next.portal !== cur.portal
    ) {
      await saveAdminSession(next);
    }
    return next;
  } catch {
    return cur;
  }
}
