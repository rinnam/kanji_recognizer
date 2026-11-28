/** Lỗi nghiệp vụ: chưa xác thực hoặc phiên đăng nhập không hợp lệ (map → 401). */
export class UnauthorizedError extends Error {
  readonly statusCode = 401;
  constructor(message = 'Vui lòng đăng nhập để tiếp tục.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Lỗi nghiệp vụ: không đủ quyền truy cập hoặc tài khoản bị khóa (map → 403). */
export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message = 'Bạn không có quyền thực hiện thao tác này.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

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

/** Mã lỗi Postgres cho foreign key violation (tham chiếu tới bản ghi không tồn tại). */
export const PG_FOREIGN_KEY_VIOLATION = '23503';

export function isPgForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === PG_FOREIGN_KEY_VIOLATION
  );
}
