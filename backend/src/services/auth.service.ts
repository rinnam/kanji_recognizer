import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { ForbiddenError } from '../utils/errors.js';
import { ensureAdminAndLessonTables } from './admin-schema.service.js';

export type UserRole = 'user' | 'admin';
export type AuthPortal = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface LiveAuthRecord {
  user: AuthUser;
  isBanned: boolean;
  portal: AuthPortal;
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

export function signToken(user: AuthUser, portal: AuthPortal = 'user'): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      portal,
      iat: now,
      exp: now + JWT_TTL_SECONDS,
    }),
  );
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyTokenWithPortal(token: string): { user: AuthUser; portal: AuthPortal } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const header = parts[0];
  const payload = parts[1];
  const sig = parts[2];
  if (!header || !payload || !sig) return null;
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
      portal?: AuthPortal;
      exp?: number;
    };
    if (!parsed.sub || !parsed.email || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      portal: parsed.portal === 'admin' ? 'admin' : 'user',
      user: {
        id: parsed.sub,
        email: parsed.email,
        displayName: parsed.displayName || parsed.email.split('@')[0] || 'User',
        role: parsed.role === 'admin' ? 'admin' : 'user',
      },
    };
  } catch {
    return null;
  }
}

export function verifyToken(token: string): AuthUser | null {
  return verifyTokenWithPortal(token)?.user ?? null;
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
  return { accessToken: signToken(user, 'user'), user, portal: 'user' as const };
}

async function authenticateCredentials(emailRaw: string, password: string) {
  await ensureAdminAndLessonTables();
  const email = emailRaw.trim().toLowerCase();
  const res = await pool.query<{
    id: string;
    email: string;
    password_hash: string | null;
    displayName: string | null;
    role: UserRole;
    is_banned?: boolean;
  }>(
    'SELECT id, email, password_hash, display_name AS "displayName", role, is_banned FROM users WHERE email = $1',
    [email],
  );
  if (res.rows.length === 0) throw new Error('Sai email hoặc mật khẩu.');
  const row = res.rows[0]!;
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error('Sai email hoặc mật khẩu.');
  }
  if (row.is_banned) {
    throw new ForbiddenError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
  }
  const user: AuthUser = {
    id: row.id,
    email: row.email,
    displayName: row.displayName || row.email.split('@')[0] || 'User',
    role: row.role === 'admin' ? 'admin' : 'user',
  };
  return user;
}

/** Đăng nhập cổng Học viên: luôn cấp phiên portal='user' (kể cả khi tài khoản có role='admin'). */
export async function loginUser(emailRaw: string, password: string) {
  const user = await authenticateCredentials(emailRaw, password);
  return { accessToken: signToken(user, 'user'), user, portal: 'user' as const };
}

/** Đăng nhập cổng Quản trị: bắt buộc tài khoản đang có role='admin', cấp phiên portal='admin'. */
export async function loginAdmin(emailRaw: string, password: string) {
  const user = await authenticateCredentials(emailRaw, password);
  if (user.role !== 'admin') {
    throw new ForbiddenError('Tài khoản này không có quyền quản trị viên.');
  }
  return { accessToken: signToken(user, 'admin'), user, portal: 'admin' as const };
}

export function extractBearerUser(authHeader?: string): AuthUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7).trim());
}

/** Kiểm tra token + đối chiếu quyền, cổng đăng nhập và trạng thái khóa trực tiếp từ DB. */
export async function resolveAuthRecordByToken(rawToken?: string): Promise<LiveAuthRecord | null> {
  const token = (rawToken ?? '').trim();
  if (!token) return null;
  const decoded = verifyTokenWithPortal(token);
  if (!decoded) return null;

  await ensureAdminAndLessonTables();
  const res = await pool.query<{
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    is_banned: boolean;
  }>(
    `SELECT id, email, display_name, role, is_banned
     FROM users
     WHERE id = $1`,
    [decoded.user.id],
  );
  const row = res.rows[0];
  if (!row || !row.email) return null;

  return {
    isBanned: Boolean(row.is_banned),
    portal: decoded.portal,
    user: {
      id: row.id,
      email: row.email,
      displayName: row.display_name || row.email.split('@')[0] || 'User',
      role: row.role === 'admin' ? 'admin' : 'user',
    },
  };
}

export async function resolveAuthRecordByHeader(authHeader?: string): Promise<LiveAuthRecord | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return resolveAuthRecordByToken(authHeader.slice(7).trim());
}

export async function resolveAuthenticatedToken(rawToken?: string): Promise<AuthUser | null> {
  const record = await resolveAuthRecordByToken(rawToken);
  if (!record || record.isBanned) return null;
  return record.user;
}

export async function resolveAuthenticatedUser(authHeader?: string): Promise<AuthUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return resolveAuthenticatedToken(authHeader.slice(7).trim());
}
