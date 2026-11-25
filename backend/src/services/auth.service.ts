import crypto from 'node:crypto';
import { pool } from '../config/database.js';

export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

const JWT_TTL_SECONDS = 7 * 24 * 3600; // 7 days

function getJwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || 'kanji-nest-dev-jwt-secret-change-in-prod';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function signToken(user: AuthUser): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      iat: now,
      exp: now + JWT_TTL_SECONDS,
    }),
  );
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token: string): AuthUser | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${payload}`).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as {
      sub?: string;
      email?: string;
      displayName?: string;
      role?: UserRole;
      exp?: number;
    };
    if (!parsed.sub || !parsed.email || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      id: parsed.sub,
      email: parsed.email,
      displayName: parsed.displayName || parsed.email.split('@')[0],
      role: parsed.role === 'admin' ? 'admin' : 'user',
    };
  } catch {
    return null;
  }
}

export async function registerUser(emailRaw: string, password: string, displayNameRaw?: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Email không hợp lệ.');
  if (password.length < 6) throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) throw new Error('Email này đã được đăng ký.');

  const displayName = (displayNameRaw ?? '').trim() || email.split('@')[0];
  const passwordHash = hashPassword(password);
  const res = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, 'user')
     RETURNING id, email, display_name AS "displayName", role`,
    [email, passwordHash, displayName],
  );
  const user = res.rows[0] as AuthUser;
  return { accessToken: signToken(user), user };
}

export async function loginUser(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const res = await pool.query(
    'SELECT id, email, password_hash, display_name AS "displayName", role FROM users WHERE email = $1',
    [email],
  );
  if (res.rows.length === 0) throw new Error('Sai email hoặc mật khẩu.');
  const row = res.rows[0] as {
    id: string;
    email: string;
    password_hash: string | null;
    displayName: string | null;
    role: UserRole;
  };
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error('Sai email hoặc mật khẩu.');
  }
  const user: AuthUser = {
    id: row.id,
    email: row.email,
    displayName: row.displayName || row.email.split('@')[0],
    role: row.role === 'admin' ? 'admin' : 'user',
  };
  return { accessToken: signToken(user), user };
}

export function extractBearerUser(authHeader?: string): AuthUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7).trim());
}
