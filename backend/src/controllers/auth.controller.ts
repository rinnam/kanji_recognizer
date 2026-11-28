import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  extractBearerUser,
  loginAdmin,
  loginUser,
  registerUser,
  resolveAuthRecordByHeader,
} from '../services/auth.service.js';
import { ForbiddenError } from '../utils/errors.js';
import {
  getUserStudyState,
  saveUserStudyState,
  type DailyStudyLogDto,
  type LearningProfileDto,
} from '../services/study-state.service.js';

export async function handleRegister(req: FastifyRequest, reply: FastifyReply) {
  const body = (req.body ?? {}) as { email?: string; password?: string; displayName?: string };
  try {
    const result = await registerUser(body.email ?? '', body.password ?? '', body.displayName);
    return reply.status(201).send(result);
  } catch (err) {
    return reply.status(400).send({ message: err instanceof Error ? err.message : 'Đăng ký thất bại.' });
  }
}

export async function handleLogin(req: FastifyRequest, reply: FastifyReply) {
  const body = (req.body ?? {}) as { email?: string; password?: string };
  try {
    const result = await loginUser(body.email ?? '', body.password ?? '');
    return reply.send(result);
  } catch (err) {
    const status = err instanceof ForbiddenError ? 403 : 401;
    return reply.status(status).send({ message: err instanceof Error ? err.message : 'Đăng nhập thất bại.' });
  }
}

export async function handleAdminLogin(req: FastifyRequest, reply: FastifyReply) {
  const body = (req.body ?? {}) as { email?: string; password?: string };
  try {
    const result = await loginAdmin(body.email ?? '', body.password ?? '');
    return reply.send(result);
  } catch (err) {
    const status = err instanceof ForbiddenError ? 403 : 401;
    return reply.status(status).send({ message: err instanceof Error ? err.message : 'Đăng nhập thất bại.' });
  }
}

export async function handleMe(req: FastifyRequest, reply: FastifyReply) {
  const record = await resolveAuthRecordByHeader(req.headers.authorization);
  if (!record || record.isBanned) {
    return reply.status(401).send({ message: 'Chưa đăng nhập, tài khoản bị khóa hoặc token hết hạn.' });
  }
  return reply.send({ user: record.user, portal: record.portal });
}

export async function handleGetStudyState(req: FastifyRequest, reply: FastifyReply) {
  const user = extractBearerUser(req.headers.authorization);
  if (!user) return reply.status(401).send({ message: 'Chưa đăng nhập hoặc token hết hạn.' });
  const state = await getUserStudyState(user.id);
  return reply.send(state);
}

export async function handlePutStudyState(req: FastifyRequest, reply: FastifyReply) {
  const user = extractBearerUser(req.headers.authorization);
  if (!user) return reply.status(401).send({ message: 'Chưa đăng nhập hoặc token hết hạn.' });
  const body = (req.body ?? {}) as {
    logs?: Record<string, DailyStudyLogDto>;
    profile?: Partial<LearningProfileDto>;
  };
  const state = await saveUserStudyState(user.id, body);
  return reply.send(state);
}
