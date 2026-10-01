import { describe, expect, it } from 'vitest';
import { libraryQuerySchema } from '../../src/validators/library.validators.js';

const id = '00000000-0000-4000-8000-000000000001';

describe('library query validation', () => {
  it('applies bounded deterministic defaults', () => {
    expect(libraryQuerySchema.parse({})).toEqual({ sort: 'saved-desc', limit: 24 });
  });

  it('accepts Japanese search and supported filters', () => {
    expect(libraryQuerySchema.parse({ q: ' 日本語 ', kind: 'vocabulary', deckId: id, jlptLevel: '3', sort: 'key-asc', limit: '100' }))
      .toMatchObject({ q: '日本語', kind: 'vocabulary', deckId: id, jlptLevel: 3, sort: 'key-asc', limit: 100 });
  });

  it.each([{ limit: 101 }, { limit: 0 }, { jlptLevel: 6 }, { kind: 'sentence' }, { sort: 'random' }, { cursor: 'broken' }])('rejects unsupported query %#', (query) => {
    expect(() => libraryQuerySchema.parse(query)).toThrow();
  });

  it('rejects a malformed saved-date cursor', () => {
    const cursor = Buffer.from(JSON.stringify({ sort: 'saved-desc', value: '0', id })).toString('base64url');
    expect(() => libraryQuerySchema.parse({ cursor })).toThrow(/Invalid library cursor/);
  });

  it('rejects a cursor from another sort', () => {
    const cursor = Buffer.from(JSON.stringify({ sort: 'saved-desc', value: new Date().toISOString(), id })).toString('base64url');
    expect(() => libraryQuerySchema.parse({ sort: 'key-asc', cursor })).toThrow(/Cursor does not match/);
  });
});
