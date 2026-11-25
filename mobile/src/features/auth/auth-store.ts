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

function apiBase(): string {
  return (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
}

export async function readAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession | null): Promise<void> {
  try {
    if (!session) {
      await AsyncStorage.removeItem(AUTH_KEY);
    } else {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore
  }
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
