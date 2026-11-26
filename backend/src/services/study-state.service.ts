import { pool } from '../config/database.js';

export interface DailyStudyLogDto {
  date: string;
  seconds: number;
  goalSeconds: number;
}

export interface LearningProfileDto {
  displayName: string;
  jlptLevel: string;
  primaryGoal: string;
  dailyMinutes: number;
}

let tablesReadyPromise: Promise<void> | null = null;

export function ensureStudyStateTables(): Promise<void> {
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_study_logs (
          user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          study_date   text NOT NULL,
          seconds      integer NOT NULL DEFAULT 0 CHECK (seconds >= 0),
          goal_seconds integer NOT NULL DEFAULT 1800 CHECK (goal_seconds > 0),
          created_at   timestamptz NOT NULL DEFAULT now(),
          updated_at   timestamptz NOT NULL DEFAULT now(),
          deleted_at   timestamptz,
          PRIMARY KEY (user_id, study_date)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_learning_profiles (
          user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          display_name  text NOT NULL,
          jlpt_level    text NOT NULL DEFAULT 'N3',
          primary_goal  text NOT NULL DEFAULT 'Ôn thi JLPT',
          daily_minutes integer NOT NULL DEFAULT 30 CHECK (daily_minutes > 0),
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          deleted_at    timestamptz
        );
      `);
    })().catch((err) => {
      tablesReadyPromise = null;
      throw err;
    });
  }
  return tablesReadyPromise;
}

export async function getUserStudyState(userId: string): Promise<{
  logs: Record<string, DailyStudyLogDto>;
  profile: LearningProfileDto | null;
}> {
  await ensureStudyStateTables();
  const [logsRes, profileRes] = await Promise.all([
    pool.query<{ study_date: string; seconds: number; goal_seconds: number }>(
      `SELECT study_date, seconds, goal_seconds
       FROM user_study_logs
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    ),
    pool.query<{
      display_name: string;
      jlpt_level: string;
      primary_goal: string;
      daily_minutes: number;
    }>(
      `SELECT display_name, jlpt_level, primary_goal, daily_minutes
       FROM user_learning_profiles
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    ),
  ]);

  const logs: Record<string, DailyStudyLogDto> = {};
  for (const row of logsRes.rows) {
    logs[row.study_date] = {
      date: row.study_date,
      seconds: Number(row.seconds) || 0,
      goalSeconds: Number(row.goal_seconds) || 1800,
    };
  }

  const pRow = profileRes.rows[0];
  const profile: LearningProfileDto | null = pRow
    ? {
        displayName: pRow.display_name,
        jlptLevel: pRow.jlpt_level,
        primaryGoal: pRow.primary_goal,
        dailyMinutes: Number(pRow.daily_minutes) || 30,
      }
    : null;

  return { logs, profile };
}

export async function saveUserStudyState(
  userId: string,
  payload: {
    logs?: Record<string, DailyStudyLogDto> | undefined;
    profile?: Partial<LearningProfileDto> | undefined;
  },
): Promise<{
  logs: Record<string, DailyStudyLogDto>;
  profile: LearningProfileDto | null;
}> {
  await ensureStudyStateTables();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (payload.logs && typeof payload.logs === 'object') {
      const entries = Object.values(payload.logs).filter(
        (item) =>
          item &&
          typeof item.date === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
          Number.isFinite(item.seconds) &&
          item.seconds >= 0,
      );
      for (const item of entries) {
        const secs = Math.max(0, Math.round(item.seconds));
        const goalSecs = Math.max(60, Math.round(item.goalSeconds || 1800));
        await client.query(
          `INSERT INTO user_study_logs (user_id, study_date, seconds, goal_seconds, updated_at, deleted_at)
           VALUES ($1, $2, $3, $4, now(), NULL)
           ON CONFLICT (user_id, study_date) DO UPDATE SET
             seconds = GREATEST(user_study_logs.seconds, EXCLUDED.seconds),
             goal_seconds = EXCLUDED.goal_seconds,
             updated_at = now(),
             deleted_at = NULL`,
          [userId, item.date, secs, goalSecs],
        );
      }
    }

    if (payload.profile && typeof payload.profile === 'object') {
      const displayName = (payload.profile.displayName ?? '').trim() || 'Người học';
      const jlptLevel = (payload.profile.jlptLevel ?? 'N3').trim() || 'N3';
      const primaryGoal = (payload.profile.primaryGoal ?? 'Ôn thi JLPT').trim() || 'Ôn thi JLPT';
      const dailyMinutes = Math.max(1, Math.min(480, Math.round(Number(payload.profile.dailyMinutes) || 30)));
      await client.query(
        `INSERT INTO user_learning_profiles (user_id, display_name, jlpt_level, primary_goal, daily_minutes, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, now(), NULL)
         ON CONFLICT (user_id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           jlpt_level = EXCLUDED.jlpt_level,
           primary_goal = EXCLUDED.primary_goal,
           daily_minutes = EXCLUDED.daily_minutes,
           updated_at = now(),
           deleted_at = NULL`,
        [userId, displayName, jlptLevel, primaryGoal, dailyMinutes],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getUserStudyState(userId);
}
