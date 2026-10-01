import { randomUUID } from 'node:crypto';
import { sql, type Kysely, type Transaction } from 'kysely';
import type { Database } from '../types/database.js';
import type { DeckRecord, LibraryBrowseResult, LibraryItemQuery, LibraryItemRecord } from '../models/library.js';

export type DbExecutor = Kysely<Database> | Transaction<Database>;

const deckSelection = [
  'id', 'library_id', 'owner_id', 'parent_id', 'sort_position', 'name', 'description',
  'version', 'archived_at', 'deleted_at'
] as const;

function mapDeck(row: {
  id: string; library_id: string; owner_id: string; parent_id: string | null;
  sort_position: string; name: string; description: string | null; version: string;
  archived_at: Date | null; deleted_at: Date | null;
}): DeckRecord {
  return {
    id: row.id, libraryId: row.library_id, ownerId: row.owner_id, parentId: row.parent_id,
    sortPosition: row.sort_position, name: row.name, description: row.description,
    version: row.version, archivedAt: row.archived_at, deletedAt: row.deleted_at
  };
}

export class LibraryRepository {
  constructor(private readonly db: Kysely<Database>) {}

  transaction<T>(callback: (repository: LibraryRepository) => Promise<T>): Promise<T> {
    return this.db.transaction().execute((trx) => callback(new LibraryRepository(trx as unknown as Kysely<Database>)));
  }

  async findLibrary(ownerId: string) {
    return this.db.selectFrom('library').selectAll().where('owner_id', '=', ownerId).executeTakeFirst();
  }

  async ensureLocalOwner(ownerId: string): Promise<void> {
    const now = new Date();
    await this.db.insertInto('owner_scope').values({
      id: ownerId, kind: 'local', external_subject: null, locale: 'ja-JP', timezone_id: 'UTC',
      created_at: now, updated_at: now, deleted_at: null
    }).onConflict((conflict) => conflict.column('id').doNothing()).execute();
  }

  async ensureLibrary(ownerId: string) {
    await this.ensureLocalOwner(ownerId);
    const existing = await this.findLibrary(ownerId);
    if (existing) return existing;
    const now = new Date();
    return this.db.insertInto('library').values({ id: randomUUID(), owner_id: ownerId, created_at: now, updated_at: now })
      .returningAll().executeTakeFirstOrThrow();
  }

  async listActiveDecks(ownerId: string, libraryId: string): Promise<DeckRecord[]> {
    const rows = await this.db.selectFrom('deck').select(deckSelection)
      .where('owner_id', '=', ownerId).where('library_id', '=', libraryId)
      .where('archived_at', 'is', null).where('deleted_at', 'is', null)
      .orderBy('sort_position').orderBy('id').execute();
    return rows.map(mapDeck);
  }

  async listSavedItems(ownerId: string, libraryId: string, input: LibraryItemQuery): Promise<LibraryBrowseResult> {
    let query = this.db.selectFrom('saved_item')
      .innerJoin('content_item', 'content_item.id', 'saved_item.content_item_id')
      .select([
        'saved_item.id', 'saved_item.content_item_id', 'saved_item.source_kind', 'saved_item.source_ref',
        'saved_item.created_at', 'saved_item.version', 'content_item.kind', 'content_item.canonical_key',
        'content_item.jlpt_level'
      ])
      .where('saved_item.owner_id', '=', ownerId)
      .where('saved_item.library_id', '=', libraryId)
      .where('saved_item.archived_at', 'is', null)
      .where('saved_item.deleted_at', 'is', null)
      .where('content_item.status', '=', 'active');

    if (input.q) query = query.where(sql<boolean>`lower(${sql.ref('content_item.canonical_key')}) like ${`%${input.q.toLocaleLowerCase('ja-JP')}%`}`);
    if (input.kind) query = query.where('content_item.kind', '=', input.kind);
    if (input.jlptLevel) query = query.where('content_item.jlpt_level', '=', input.jlptLevel);
    if (input.deckId) {
      query = query.where((expression) => expression.exists(
        expression.selectFrom('deck_membership')
          .innerJoin('deck', 'deck.id', 'deck_membership.deck_id')
          .select('deck_membership.saved_item_id')
          .whereRef('deck_membership.saved_item_id', '=', 'saved_item.id')
          .where('deck_membership.owner_id', '=', ownerId)
          .where('deck_membership.deck_id', '=', input.deckId!)
          .where('deck.owner_id', '=', ownerId)
          .where('deck.library_id', '=', libraryId)
          .where('deck.archived_at', 'is', null)
          .where('deck.deleted_at', 'is', null)
      ));
    }

    const keySort = input.sort.startsWith('key-');
    const direction = input.sort.endsWith('asc') ? 'asc' : 'desc';
    if (input.cursor) {
      const operator = direction === 'asc' ? '>' : '<';
      if (keySort) {
        query = query.where((expression) => expression.or([
          expression('content_item.canonical_key', operator, input.cursor!.value),
          expression.and([
            expression('content_item.canonical_key', '=', input.cursor!.value),
            expression('saved_item.id', operator, input.cursor!.id)
          ])
        ]));
      } else {
        const date = new Date(input.cursor.value);
        query = query.where((expression) => expression.or([
          expression('saved_item.created_at', operator, date),
          expression.and([
            expression('saved_item.created_at', '=', date),
            expression('saved_item.id', operator, input.cursor!.id)
          ])
        ]));
      }
    }

    query = keySort
      ? query.orderBy('content_item.canonical_key', direction).orderBy('saved_item.id', direction)
      : query.orderBy('saved_item.created_at', direction).orderBy('saved_item.id', direction);
    const rows = await query.limit(input.limit + 1).execute();
    const page = rows.slice(0, input.limit);
    const memberships = page.length === 0 ? [] : await this.db.selectFrom('deck_membership')
      .innerJoin('deck', 'deck.id', 'deck_membership.deck_id')
      .select(['deck_membership.saved_item_id', 'deck_membership.deck_id'])
      .where('deck_membership.owner_id', '=', ownerId)
      .where('deck.owner_id', '=', ownerId).where('deck.library_id', '=', libraryId)
      .where('deck.archived_at', 'is', null).where('deck.deleted_at', 'is', null)
      .where('deck_membership.saved_item_id', 'in', page.map((row) => row.id)).execute();
    const deckIds = new Map<string, string[]>();
    for (const membership of memberships) deckIds.set(membership.saved_item_id, [...(deckIds.get(membership.saved_item_id) ?? []), membership.deck_id]);
    const items: LibraryItemRecord[] = page.map((row) => ({
      id: row.id, contentItemId: row.content_item_id, kind: row.kind, canonicalKey: row.canonical_key,
      jlptLevel: row.jlpt_level, sourceKind: row.source_kind, sourceRef: row.source_ref,
      savedAt: row.created_at, version: row.version, deckIds: deckIds.get(row.id) ?? []
    }));
    const last = items.at(-1);
    const nextCursor = rows.length > input.limit && last ? Buffer.from(JSON.stringify({
      sort: input.sort,
      value: keySort ? last.canonicalKey : last.savedAt.toISOString(),
      id: last.id
    })).toString('base64url') : null;
    return { items, nextCursor };
  }

  async contentExists(contentItemId: string): Promise<boolean> {
    return Boolean(await this.db.selectFrom('content_item').select('id')
      .where('id', '=', contentItemId).where('status', '=', 'active').executeTakeFirst());
  }

  async findSavedItem(ownerId: string, libraryId: string, contentItemId: string) {
    return this.db.selectFrom('saved_item').selectAll().where('owner_id', '=', ownerId)
      .where('library_id', '=', libraryId).where('content_item_id', '=', contentItemId)
      .where('deleted_at', 'is', null).executeTakeFirst();
  }

  async insertSavedItem(input: { ownerId: string; libraryId: string; contentItemId: string; sourceKind: 'import' | 'manual' | 'reference'; sourceRef?: string }) {
    return this.db.insertInto('saved_item').values({
      id: randomUUID(), owner_id: input.ownerId, library_id: input.libraryId,
      content_item_id: input.contentItemId, source_kind: input.sourceKind,
      source_ref: input.sourceRef ?? null, created_at: new Date(), archived_at: null, deleted_at: null
    }).onConflict((conflict) => conflict.columns(['library_id', 'content_item_id'])
      .where('deleted_at', 'is', null).doNothing())
      .returningAll().executeTakeFirst();
  }

  async addMembership(ownerId: string, deckId: string, savedItemId: string, sourceContext?: Record<string, unknown>): Promise<boolean> {
    const inserted = await this.db.insertInto('deck_membership').values({
      owner_id: ownerId, deck_id: deckId, saved_item_id: savedItemId,
      added_at: new Date(), source_context: sourceContext ?? null
    }).onConflict((conflict) => conflict.columns(['deck_id', 'saved_item_id']).doNothing())
      .returning('deck_id').executeTakeFirst();
    return Boolean(inserted);
  }

  async findActiveDeck(ownerId: string, libraryId: string, deckId: string): Promise<DeckRecord | undefined> {
    const row = await this.db.selectFrom('deck').select(deckSelection).where('id', '=', deckId)
      .where('owner_id', '=', ownerId).where('library_id', '=', libraryId)
      .where('archived_at', 'is', null).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? mapDeck(row) : undefined;
  }

  async createDeck(input: { ownerId: string; libraryId: string; name: string; description: string | null; parentId: string | null; sortPosition: bigint }) {
    const now = new Date();
    const row = await this.db.insertInto('deck').values({
      id: randomUUID(), owner_id: input.ownerId, library_id: input.libraryId, parent_id: input.parentId,
      sort_position: input.sortPosition.toString(), name: input.name, description: input.description,
      created_at: now, updated_at: now, archived_at: null, deleted_at: null
    }).returning(deckSelection).executeTakeFirstOrThrow();
    return mapDeck(row);
  }

  async nextSortPosition(ownerId: string, libraryId: string, parentId: string | null): Promise<bigint> {
    let query = this.db.selectFrom('deck').select('sort_position').where('owner_id', '=', ownerId)
      .where('library_id', '=', libraryId).where('deleted_at', 'is', null).where('archived_at', 'is', null);
    query = parentId === null ? query.where('parent_id', 'is', null) : query.where('parent_id', '=', parentId);
    const row = await query.orderBy('sort_position', 'desc').executeTakeFirst();
    return row ? BigInt(row.sort_position) + 1024n : 1024n;
  }

  async updateDeck(input: { ownerId: string; libraryId: string; deckId: string; expectedVersion: bigint; name?: string | undefined; description?: string | null | undefined; parentId?: string | null | undefined }) {
    const values: Record<string, unknown> = { version: (input.expectedVersion + 1n).toString() };
    if (input.name !== undefined) values.name = input.name;
    if (input.description !== undefined) values.description = input.description;
    if (input.parentId !== undefined) values.parent_id = input.parentId;
    const row = await this.db.updateTable('deck').set(values).where('id', '=', input.deckId)
      .where('owner_id', '=', input.ownerId).where('library_id', '=', input.libraryId)
      .where('version', '=', input.expectedVersion.toString()).where('deleted_at', 'is', null)
      .returning(deckSelection).executeTakeFirst();
    return row ? mapDeck(row) : undefined;
  }

  async updatePlacement(ownerId: string, libraryId: string, placement: { deckId: string; parentId: string | null; sortPosition: bigint }) {
    return this.db.updateTable('deck').set({ parent_id: placement.parentId, sort_position: placement.sortPosition.toString(), version: (eb) => eb('version', '+', '1') })
      .where('id', '=', placement.deckId).where('owner_id', '=', ownerId).where('library_id', '=', libraryId)
      .where('archived_at', 'is', null).where('deleted_at', 'is', null).returning('id').executeTakeFirst();
  }

  async bumpLibraryVersion(ownerId: string, libraryId: string, expectedVersion: bigint) {
    return this.db.updateTable('library').set({ version: (expectedVersion + 1n).toString(), updated_at: new Date() }).where('id', '=', libraryId)
      .where('owner_id', '=', ownerId).where('version', '=', expectedVersion.toString()).returningAll().executeTakeFirst();
  }

  async incrementLibraryVersion(ownerId: string, libraryId: string) {
    return this.db.updateTable('library').set({ version: (eb) => eb('version', '+', '1'), updated_at: new Date() })
      .where('id', '=', libraryId).where('owner_id', '=', ownerId).returningAll().executeTakeFirstOrThrow();
  }

  async softDeleteDeck(ownerId: string, libraryId: string, deckId: string, expectedVersion: bigint) {
    const now = new Date();
    return this.db.updateTable('deck').set({ archived_at: now, deleted_at: now, version: (expectedVersion + 1n).toString() })
      .where('id', '=', deckId).where('owner_id', '=', ownerId).where('library_id', '=', libraryId)
      .where('version', '=', expectedVersion.toString()).where('deleted_at', 'is', null).returning('id').executeTakeFirst();
  }

  async hasActiveChildren(ownerId: string, libraryId: string, deckId: string): Promise<boolean> {
    return Boolean(await this.db.selectFrom('deck').select('id').where('owner_id', '=', ownerId)
      .where('library_id', '=', libraryId).where('parent_id', '=', deckId)
      .where('archived_at', 'is', null).where('deleted_at', 'is', null).executeTakeFirst());
  }
}
