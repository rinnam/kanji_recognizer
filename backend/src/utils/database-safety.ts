export function databaseName(databaseUrl: string): string {
  const name = new URL(databaseUrl).pathname.replace(/^\//, '');
  if (!name) throw new Error('Database URL must include a database name');
  return name;
}

export function assertSafeTestDatabase(testDatabaseUrl: string | undefined, applicationDatabaseUrl: string | undefined): string {
  if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for integration tests');
  if (applicationDatabaseUrl && testDatabaseUrl === applicationDatabaseUrl) throw new Error('TEST_DATABASE_URL must not equal DATABASE_URL');
  if (!databaseName(testDatabaseUrl).endsWith('_test')) throw new Error('Integration database name must end with _test');
  return testDatabaseUrl;
}
