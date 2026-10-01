import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { LibraryItemKind, LibraryItemSort } from '../../src/models/library.js';
import { LibraryRepository } from '../../src/repositories/library.repository.js';
import { LibraryService } from '../../src/services/library.service.js';
import type { Database } from '../../src/types/database.js';
import { assertSafeTestDatabase } from '../../src/utils/database-safety.js';

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const schema = `integration_${randomUUID().replaceAll('-', '')}`;
let pool: pg.Pool;
let db: Kysely<Database>;
let service: LibraryService;

interface ContentFixture {
  id: string;
  key: string;
  kind?: LibraryItemKind;
  jlptLevel?: number | null;
  status?: 'draft' | 'active' | 'deprecated';
}

async function insertContent(fixture: ContentFixture): Promise<void> {
  const client = await pool.connect();
  const now = new Date();
  try {
    await client.query('begin');
    await client.query('set constraints all deferred');
    await client.query(
      `insert into content_item
        (id, kind, canonical_key, status, source_ref, license_ref, current_revision_no,
         content_profile_key, jlpt_level, stroke_count, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, 1, null, $7, null, $8, $8)`,
      [fixture.id, fixture.kind ?? 'kanji', fixture.key, fixture.status ?? 'active',
        `fixture:${fixture.key}`, 'integration-test-only', fixture.jlptLevel ?? null, now]
    );
    await client.query(
      `insert into content_revision
        (item_id, revision_no, schema_version, payload_json, source_ref, license_ref, created_at)
       values ($1, 1, 1, $2, $3, $4, $5)`,
      [fixture.id, JSON.stringify({ key: fixture.key }), `fixture:${fixture.key}`, 'integration-test-only', now]
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function browse(ownerId: string, overrides: {
  q?: string;
  kind?: LibraryItemKind;
  deckId?: string;
  jlptLevel?: number;
  sort?: LibraryItemSort;
  limit?: number;
  cursor?: { sort: LibraryItemSort; value: string; id: string };
} = {}) {
  return service.getLibrary(ownerId, { sort: 'saved-desc', limit: 24, ...overrides });
}

describe.skipIf(!enabled)('Library PostgreSQL integration', () => {
  beforeAll(async () => {
    const connectionString = assertSafeTestDatabase(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
    pool = new pg.Pool({ connectionString, max: 1 });
    await pool.query(`create schema "${schema}"`);
    await pool.query(`set search_path to "${schema}"`);
    const ddl = await readFile(resolve(process.cwd(), '../db/migrations/0001_init.sql'), 'utf8');
    await pool.query(ddl);
    db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
    service = new LibraryService(new LibraryRepository(db));
  }, 30_000);

  afterAll(async () => {
    if (db) await db.destroy();
    const cleanup = new pg.Pool({
      connectionString: assertSafeTestDatabase(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL),
      max: 1
    });
    await cleanup.query(`drop schema if exists "${schema}" cascade`);
    await cleanup.end();
  });

  it('browses populated active data with filters, stable sorts, cursor pagination, and lifecycle exclusion', async () => {
    const ownerId = randomUUID();
    const fixtures: ContentFixture[] = [
      { id: randomUUID(), key: 'alpha-kanji', kind: 'kanji', jlptLevel: 3 },
      { id: randomUUID(), key: 'beta-word', kind: 'vocabulary', jlptLevel: 2 },
      { id: randomUUID(), key: 'gamma-kanji', kind: 'kanji', jlptLevel: 3 },
      { id: randomUUID(), key: 'archived-kanji', kind: 'kanji', jlptLevel: 3 },
      { id: randomUUID(), key: 'deleted-kanji', kind: 'kanji', jlptLevel: 3 }
    ];
    for (const fixture of fixtures) await insertContent(fixture);
    const deck = await service.createDeck(ownerId, { name: 'Filtered' });
    const saved = [];
    for (const fixture of fixtures) {
      saved.push(await service.saveItem(ownerId, {
        contentItemId: fixture.id,
        sourceKind: 'manual',
        sourceRef: `manual:${fixture.key}`,
        ...(fixture.key !== 'beta-word' ? { deckId: deck.id } : {})
      }));
    }
    const now = new Date();
    await db.updateTable('saved_item').set({ archived_at: now }).where('id', '=', saved[3]!.id).execute();
    await db.updateTable('saved_item').set({ deleted_at: now }).where('id', '=', saved[4]!.id).execute();

    expect((await browse(ownerId, { sort: 'key-asc' })).items.map((item) => item.canonicalKey))
      .toEqual(['alpha-kanji', 'beta-word', 'gamma-kanji']);
    expect((await browse(ownerId, { q: 'ALPHA' })).items.map((item) => item.canonicalKey)).toEqual(['alpha-kanji']);
    expect((await browse(ownerId, { kind: 'vocabulary' })).items.map((item) => item.canonicalKey)).toEqual(['beta-word']);
    expect((await browse(ownerId, { jlptLevel: 3, deckId: deck.id, sort: 'key-desc' })).items.map((item) => item.canonicalKey))
      .toEqual(['gamma-kanji', 'alpha-kanji']);

    const first = await browse(ownerId, { sort: 'key-asc', limit: 1 });
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).not.toBeNull();
    const decoded = JSON.parse(Buffer.from(first.nextCursor!, 'base64url').toString('utf8')) as { sort: LibraryItemSort; value: string; id: string };
    const second = await browse(ownerId, { sort: 'key-asc', limit: 1, cursor: decoded });
    expect(second.items[0]!.canonicalKey).toBe('beta-word');
  });

  it('enforces nested hierarchy, cycle, depth, owner, and optimistic-version rules', async () => {
    const ownerId = randomUUID();
    const otherOwnerId = randomUUID();
    const root = await service.createDeck(ownerId, { name: 'Root' });
    const child = await service.createDeck(ownerId, { name: 'Child', parentId: root.id });
    const grandchild = await service.createDeck(ownerId, { name: 'Grandchild', parentId: child.id });
    const hierarchy = (await browse(ownerId)).decks;
    expect(hierarchy.find((deck) => deck.id === root.id)?.parentId).toBeNull();
    expect(hierarchy.find((deck) => deck.id === child.id)?.parentId).toBe(root.id);
    expect(hierarchy.find((deck) => deck.id === grandchild.id)?.parentId).toBe(child.id);
    await expect(service.updateDeck(ownerId, root.id, { expectedVersion: BigInt(root.version), parentId: grandchild.id }))
      .rejects.toMatchObject({ statusCode: 422 });
    await expect(service.createDeck(otherOwnerId, { name: 'Foreign child', parentId: root.id }))
      .rejects.toMatchObject({ statusCode: 404 });

    let parentId: string | undefined;
    for (let depth = 1; depth <= 8; depth += 1) {
      const deck = await service.createDeck(otherOwnerId, { name: `Depth ${depth}`, ...(parentId ? { parentId } : {}) });
      parentId = deck.id;
    }
    await expect(service.createDeck(otherOwnerId, { name: 'Depth 9', parentId }))
      .rejects.toMatchObject({ statusCode: 422 });

    const updated = await service.updateDeck(ownerId, child.id, { expectedVersion: BigInt(child.version), name: 'Renamed child' });
    await expect(service.updateDeck(ownerId, child.id, { expectedVersion: BigInt(child.version), name: 'Stale write' }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(updated.version).toBe((BigInt(child.version) + 1n).toString());
  });

  it('saves active content with provenance and destination while deduplicating and isolating owners', async () => {
    const ownerId = randomUUID();
    const otherOwnerId = randomUUID();
    const activeId = randomUUID();
    const draftId = randomUUID();
    await insertContent({ id: activeId, key: 'save-active' });
    await insertContent({ id: draftId, key: 'save-draft', status: 'draft' });
    const deck = await service.createDeck(ownerId, { name: 'Destination' });
    const first = await service.saveItem(ownerId, {
      contentItemId: activeId,
      deckId: deck.id,
      sourceKind: 'reference',
      sourceRef: 'reference:integration',
      sourceContext: { destination: 'integration' }
    });
    const duplicate = await service.saveItem(ownerId, {
      contentItemId: activeId,
      deckId: deck.id,
      sourceKind: 'manual',
      sourceRef: 'manual:duplicate'
    });
    expect(duplicate.id).toBe(first.id);
    expect(first.source_kind).toBe('reference');
    expect(first.source_ref).toBe('reference:integration');
    expect((await browse(ownerId, { deckId: deck.id })).items[0]!.deckIds).toEqual([deck.id]);
    expect(Number((await db.selectFrom('saved_item').select(({ fn }) => fn.countAll().as('count'))
      .where('owner_id', '=', ownerId).executeTakeFirstOrThrow()).count)).toBe(1);
    expect(Number((await db.selectFrom('deck_membership').select(({ fn }) => fn.countAll().as('count'))
      .where('owner_id', '=', ownerId).executeTakeFirstOrThrow()).count)).toBe(1);
    await expect(service.saveItem(ownerId, { contentItemId: draftId, sourceKind: 'manual' }))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(service.saveItem(otherOwnerId, { contentItemId: activeId, deckId: deck.id, sourceKind: 'manual' }))
      .rejects.toMatchObject({ statusCode: 404 });
    const otherSaved = await service.saveItem(otherOwnerId, { contentItemId: activeId, sourceKind: 'import', sourceRef: 'owner-two' });
    expect(otherSaved.owner_id).toBe(otherOwnerId);
  });

  it('persists create, update, move, conflict, ordering, and reload behavior', async () => {
    const ownerId = randomUUID();
    const initialVersion = BigInt((await browse(ownerId)).version);
    const rootA = await service.createDeck(ownerId, { name: 'Root A', description: 'before' });
    expect(BigInt((await browse(ownerId)).version)).toBe(initialVersion + 1n);
    const rootB = await service.createDeck(ownerId, { name: 'Root B' });
    const child = await service.createDeck(ownerId, { name: 'Child', parentId: rootA.id });
    const moved = await service.updateDeck(ownerId, child.id, {
      expectedVersion: BigInt(child.version),
      name: 'Child renamed',
      description: 'after',
      parentId: rootB.id
    });
    await expect(service.updateDeck(ownerId, child.id, { expectedVersion: BigInt(child.version), name: 'Conflict' }))
      .rejects.toMatchObject({ statusCode: 409 });
    const snapshot = await browse(ownerId);
    await service.rebalanceDecks(ownerId, {
      expectedLibraryVersion: BigInt(snapshot.version),
      placements: [
        { deckId: rootB.id, parentId: null, sortPosition: 1024n },
        { deckId: rootA.id, parentId: null, sortPosition: 2048n }
      ]
    });

    const reloadedService = new LibraryService(new LibraryRepository(db));
    const reloaded = await reloadedService.getLibrary(ownerId);
    expect(reloaded.decks.filter((deck) => deck.parentId === null).map((deck) => deck.id)).toEqual([rootB.id, rootA.id]);
    expect(reloaded.decks.find((deck) => deck.id === child.id)).toMatchObject({
      name: 'Child renamed', description: 'after', parentId: rootB.id, version: moved.version
    });
  });

  it('requires child-first soft delete and preserves SavedItem and ContentItem rows', async () => {
    const ownerId = randomUUID();
    const contentItemId = randomUUID();
    await insertContent({ id: contentItemId, key: 'preserved-content' });
    const root = await service.createDeck(ownerId, { name: 'Delete root' });
    const child = await service.createDeck(ownerId, { name: 'Delete child', parentId: root.id });
    const saved = await service.saveItem(ownerId, { contentItemId, deckId: child.id, sourceKind: 'manual' });
    await expect(service.deleteDeck(ownerId, root.id, BigInt(root.version))).rejects.toMatchObject({ statusCode: 409 });
    await service.deleteDeck(ownerId, child.id, BigInt(child.version));
    await service.deleteDeck(ownerId, root.id, BigInt(root.version));

    expect((await browse(ownerId)).decks).toEqual([]);
    const deletedDecks = await db.selectFrom('deck').select(['id', 'archived_at', 'deleted_at'])
      .where('id', 'in', [root.id, child.id]).execute();
    expect(deletedDecks).toHaveLength(2);
    expect(deletedDecks.every((deck) => deck.archived_at && deck.deleted_at)).toBe(true);
    expect(await db.selectFrom('saved_item').select('id').where('id', '=', saved.id).executeTakeFirst()).toBeDefined();
    expect(await db.selectFrom('content_item').select('id').where('id', '=', contentItemId).executeTakeFirst()).toBeDefined();
    expect(await db.selectFrom('deck_membership').select('deck_id').where('saved_item_id', '=', saved.id).executeTakeFirst()).toBeDefined();
    expect((await browse(ownerId)).items.map((item) => item.contentItemId)).toEqual([contentItemId]);
    expect((await browse(ownerId)).items[0]!.deckIds).toEqual([]);
  });
});
