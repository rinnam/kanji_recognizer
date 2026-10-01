import { describe, expect, it } from 'vitest';
import { assertSafeTestDatabase } from '../../src/utils/database-safety.js';

describe('integration database guard', () => {
  it('refuses the application database', () => {
    const url = 'postgresql://user:placeholder@localhost/app';
    expect(() => assertSafeTestDatabase(url, url)).toThrow(/must not equal/);
  });
  it('refuses names without the _test suffix', () => {
    expect(() => assertSafeTestDatabase('postgresql://user:placeholder@localhost/app_dev', undefined)).toThrow(/end with _test/);
  });
  it('accepts a dedicated test database', () => {
    expect(assertSafeTestDatabase('postgresql://user:placeholder@localhost/app_test', undefined)).toMatch(/app_test$/);
  });
});
