import AsyncStorage from '@react-native-async-storage/async-storage';
import { libraryEndpoint } from '../../library-source';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

const AUTH_KEY = 'kanji_nest_auth_session_v1';

let cachedSession: AuthSession | null | undefined = undefined;
const sessionListeners = new Set<(session: AuthSession | null) => void>();

function notifySessionListeners(session: AuthSession | null) {
  for (const fn of sessionListeners) fn(session);
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

export async function loginApi(email: string, password: string): Promise<AuthSession> {
  const resp = await fetch(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await resp.json().catch(() => ({}))) as { accessToken?: string; user?: AuthUser; message?: string };
  if (!resp.ok || !data.accessToken || !data.user) {
    throw new Error(data.message || 'Đăng nhập thất bại.');
  }
  const session: AuthSession = { accessToken: data.accessToken, user: data.user };
  await saveAuthSession(session);
  return session;
}

export async function registerApi(email: string, password: string, displayName: string): Promise<AuthSession> {
  const resp = await fetch(`${apiBase()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  const data = (await resp.json().catch(() => ({}))) as { accessToken?: string; user?: AuthUser; message?: string };
  if (!resp.ok || !data.accessToken || !data.user) {
    throw new Error(data.message || 'Đăng ký thất bại.');
  }
  const session: AuthSession = { accessToken: data.accessToken, user: data.user };
  await saveAuthSession(session);
  return session;
}

/** Đồng bộ lại thông tin role & trạng thái tài khoản mới nhất từ máy chủ. */
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
    const data = (await resp.json().catch(() => null)) as { user?: AuthUser } | null;
    if (!data?.user) return cur;
    const next: AuthSession = { accessToken: cur.accessToken, user: data.user };
    if (
      next.user.role !== cur.user.role ||
      next.user.displayName !== cur.user.displayName ||
      next.user.email !== cur.user.email
    ) {
      await saveAuthSession(next);
    }
    return next;
  } catch {
    return cur;
  }
}
