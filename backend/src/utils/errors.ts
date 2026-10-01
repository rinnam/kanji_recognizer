/** Lỗi nghiệp vụ: tài nguyên không tồn tại (map → 404). */
export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Lỗi nghiệp vụ: trùng tài nguyên (map → 409). */
export class DuplicateError extends Error {
  readonly statusCode = 409;
  constructor(message = 'Duplicate resource') {
    super(message);
    this.name = 'DuplicateError';
  }
}

/** Lỗi nghiệp vụ: input không hợp lệ ở tầng service (map → 400). */
export class ValidationFailedError extends Error {
  readonly statusCode = 400;
  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationFailedError';
  }
}

/** Mã lỗi Postgres cho unique violation (dùng để nhận diện trùng). */
export const PG_UNIQUE_VIOLATION = '23505';

export function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === PG_UNIQUE_VIOLATION
  );
}
