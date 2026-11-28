import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  resolveAuthRecordByToken,
  type AuthUser,
} from '../services/auth.service.js';

function extractBearerToken(authHeader?: string): string | undefined {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
  const token = authHeader.slice(7).trim();
  return token || undefined;
}

/** Xác thực JWT + kiểm tra user tồn tại và chưa bị khóa từ PostgreSQL. */
export async function requireAuthUser(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthUser | null> {
  const record = await resolveAuthRecordByToken(extractBearerToken(req.headers.authorization));
  if (!record) {
    void reply.status(401).send({
      error: 'Unauthorized',
      message: 'Vui lòng đăng nhập để tiếp tục.',
    });
    return null;
  }
  if (record.isBanned) {
    void reply.status(403).send({
      error: 'Forbidden',
      message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
    });
    return null;
  }
  return record.user;
}

/** Bắt buộc người dùng có quyền admin đang hoạt động VÀ đăng nhập từ cổng Quản trị. */
export async function requireAdminUser(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthUser | null> {
  const record = await resolveAuthRecordByToken(extractBearerToken(req.headers.authorization));
  if (!record) {
    void reply.status(401).send({
      error: 'Unauthorized',
      message: 'Vui lòng đăng nhập để tiếp tục.',
    });
    return null;
  }
  if (record.isBanned) {
    void reply.status(403).send({
      error: 'Forbidden',
      message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
    });
    return null;
  }
  if (record.user.role !== 'admin') {
    void reply.status(403).send({
      error: 'Forbidden',
      message: 'Bạn không có quyền quản trị viên.',
    });
    return null;
  }
  if (record.portal !== 'admin') {
    void reply.status(403).send({
      error: 'Forbidden',
      message: 'Phiên đăng nhập học viên không có quyền truy cập cổng quản trị. Vui lòng đăng nhập tại trang quản trị.',
    });
    return null;
  }
  return record.user;
}
