import { db } from '../config/database.js';
import type {
  NewQuizAttemptRow,
  NewQuizSessionRow,
  QuizAttemptRow,
  QuizSessionRow,
} from '../types/database.js';
import type { Executor } from './types.js';

/**
 * Repository cho tính năng quiz (quiz_sessions / quiz_attempts).
 * Chỉ truy cập DB bằng Kysely — KHÔNG chứa business logic (chấm điểm nằm ở
 * services/quiz.service.ts). Hai bảng này là analytics server, KHÔNG local-first.
 */

function exec(trx?: Executor): Executor {
  return trx ?? db;
}

/** Ghi một phiên quiz (score/total do service tính sẵn). */
export async function insertSession(
  row: NewQuizSessionRow,
  trx?: Executor,
): Promise<QuizSessionRow> {
  return exec(trx)
    .insertInto('quiz_sessions')
    .values(row)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** Ghi các lần trả lời của một phiên (bỏ qua nếu rỗng). */
export async function insertAttempts(
  rows: NewQuizAttemptRow[],
  trx?: Executor,
): Promise<QuizAttemptRow[]> {
  if (rows.length === 0) return [];
  return exec(trx)
    .insertInto('quiz_attempts')
    .values(rows)
    .returningAll()
    .execute();
}

/** Đọc một phiên theo id, scope theo owner. */
export async function selectSessionById(
  ownerId: string,
  id: string,
  trx?: Executor,
): Promise<QuizSessionRow | undefined> {
  return exec(trx)
    .selectFrom('quiz_sessions')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', ownerId)
    .executeTakeFirst();
}

/** Lấy toàn bộ lần trả lời của một phiên (theo thời điểm trả lời). */
export async function listAttemptsBySession(
  sessionId: string,
  trx?: Executor,
): Promise<QuizAttemptRow[]> {
  return exec(trx)
    .selectFrom('quiz_attempts')
    .selectAll()
    .where('session_id', '=', sessionId)
    .orderBy('answered_at', 'asc')
    .execute();
}
