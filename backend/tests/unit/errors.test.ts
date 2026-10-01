import { describe, expect, it } from 'vitest';
import {
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  isPgForeignKeyViolation,
  isPgUniqueViolation,
} from '../../src/utils/errors.js';

/**
 * Unit test THUẦN cho nhận diện mã lỗi Postgres. KHÔNG cần DB/mạng, tất định.
 */

describe('isPgForeignKeyViolation', () => {
  it('đúng khi error có code 23503 (foreign_key_violation)', () => {
    expect(isPgForeignKeyViolation({ code: PG_FOREIGN_KEY_VIOLATION })).toBe(true);
    expect(isPgForeignKeyViolation({ code: '23503' })).toBe(true);
  });

  it('sai với code khác / null / không phải object', () => {
    expect(isPgForeignKeyViolation({ code: PG_UNIQUE_VIOLATION })).toBe(false);
    expect(isPgForeignKeyViolation(null)).toBe(false);
    expect(isPgForeignKeyViolation(undefined)).toBe(false);
    expect(isPgForeignKeyViolation(new Error('boom'))).toBe(false);
    expect(isPgForeignKeyViolation('23503')).toBe(false);
  });
});

describe('isPgUniqueViolation', () => {
  it('đúng khi error có code 23505, sai khi là FK (23503)', () => {
    expect(isPgUniqueViolation({ code: PG_UNIQUE_VIOLATION })).toBe(true);
    expect(isPgUniqueViolation({ code: PG_FOREIGN_KEY_VIOLATION })).toBe(false);
  });
});
