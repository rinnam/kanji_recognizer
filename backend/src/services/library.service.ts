import type { LibraryItemQuery } from '../models/library.js';
import type { LibraryRepository } from '../repositories/library.repository.js';
import { conflict, invalid, notFound } from '../utils/errors.js';
import { validateDeckHierarchy } from '../utils/deck-hierarchy.js';

export class LibraryService {
  constructor(private readonly repository: LibraryRepository) {}

  async getLibrary(ownerId: string, query: LibraryItemQuery = { sort: 'saved-desc', limit: 24 }) {
    const library = await this.repository.ensureLibrary(ownerId);
    if (query.deckId && !(await this.repository.findActiveDeck(ownerId, library.id, query.deckId))) {
      throw notFound('Deck not found');
    }
    const [decks, browse] = await Promise.all([
      this.repository.listActiveDecks(ownerId, library.id),
      this.repository.listSavedItems(ownerId, library.id, query)
    ]);
    return { id: library.id, ownerId, version: library.version, decks, ...browse };
  }

  async saveItem(ownerId: string, input: { contentItemId: string; deckId?: string | undefined; sourceKind: 'import' | 'manual' | 'reference'; sourceRef?: string | undefined; sourceContext?: Record<string, unknown> | undefined }) {
    return this.repository.transaction(async (repository) => {
      const library = await repository.ensureLibrary(ownerId);
      if (!(await repository.contentExists(input.contentItemId))) throw notFound('Content item not found');
      if (input.deckId && !(await repository.findActiveDeck(ownerId, library.id, input.deckId))) throw notFound('Deck not found');
      const existing = await repository.findSavedItem(ownerId, library.id, input.contentItemId);
      const inserted = existing ? undefined : await repository.insertSavedItem({ ownerId, libraryId: library.id, contentItemId: input.contentItemId, sourceKind: input.sourceKind, ...(input.sourceRef === undefined ? {} : { sourceRef: input.sourceRef }) });
      const item = existing ?? inserted ?? await repository.findSavedItem(ownerId, library.id, input.contentItemId);
      if (!item) throw conflict('Content was saved concurrently; reload and try again');
      const membershipAdded = input.deckId ? await repository.addMembership(ownerId, input.deckId, item.id, input.sourceContext) : false;
      if (inserted || membershipAdded) await repository.incrementLibraryVersion(ownerId, library.id);
      return item;
    });
  }

  async createDeck(ownerId: string, input: { name: string; description?: string | null | undefined; parentId?: string | null | undefined }) {
    return this.repository.transaction(async (repository) => {
      const library = await repository.ensureLibrary(ownerId);
      const parentId = input.parentId ?? null;
      if (parentId && !(await repository.findActiveDeck(ownerId, library.id, parentId))) throw notFound('Parent deck not found');
      const decks = await repository.listActiveDecks(ownerId, library.id);
      validateDeckHierarchy([...decks.map(({ id, parentId: parent }) => ({ id, parentId: parent })), { id: '__new__', parentId }]);
      const sortPosition = await repository.nextSortPosition(ownerId, library.id, parentId);
      const created = await repository.createDeck({ ownerId, libraryId: library.id, name: input.name, description: input.description ?? null, parentId, sortPosition });
      await repository.incrementLibraryVersion(ownerId, library.id);
      return created;
    });
  }

  async updateDeck(ownerId: string, deckId: string, input: { expectedVersion: bigint; name?: string | undefined; description?: string | null | undefined; parentId?: string | null | undefined }) {
    return this.repository.transaction(async (repository) => {
      const library = await repository.ensureLibrary(ownerId);
      const current = await repository.findActiveDeck(ownerId, library.id, deckId);
      if (!current) throw notFound('Deck not found');
      const decks = await repository.listActiveDecks(ownerId, library.id);
      const placements = decks.map((deck) => ({ id: deck.id, parentId: deck.id === deckId && input.parentId !== undefined ? input.parentId : deck.parentId }));
      validateDeckHierarchy(placements);
      const updated = await repository.updateDeck({ ownerId, libraryId: library.id, deckId, ...input });
      if (!updated) throw conflict('Deck was changed by another request');
      await repository.incrementLibraryVersion(ownerId, library.id);
      return updated;
    });
  }

  async rebalanceDecks(ownerId: string, input: { expectedLibraryVersion: bigint; placements: Array<{ deckId: string; parentId: string | null; sortPosition: bigint }> }) {
    return this.repository.transaction(async (repository) => {
      const library = await repository.ensureLibrary(ownerId);
      const activeDecks = await repository.listActiveDecks(ownerId, library.id);
      const activeIds = new Set(activeDecks.map((deck) => deck.id));
      if (input.placements.some((placement) => !activeIds.has(placement.deckId))) throw notFound('One or more decks do not belong to this active library');
      const placementMap = new Map(input.placements.map((placement) => [placement.deckId, placement.parentId]));
      validateDeckHierarchy(activeDecks.map((deck) => ({
        id: deck.id,
        parentId: placementMap.has(deck.id) ? placementMap.get(deck.id) ?? null : deck.parentId
      })));
      const bumped = await repository.bumpLibraryVersion(ownerId, library.id, input.expectedLibraryVersion);
      if (!bumped) throw conflict('Library was changed by another request');
      for (const placement of input.placements) {
        const updated = await repository.updatePlacement(ownerId, library.id, placement);
        if (!updated) throw invalid('Unable to place deck');
      }
      return {
        libraryVersion: bumped.version,
        placements: input.placements.map((placement) => ({ ...placement, sortPosition: placement.sortPosition.toString() }))
      };
    });
  }

  async deleteDeck(ownerId: string, deckId: string, expectedVersion: bigint): Promise<void> {
    await this.repository.transaction(async (repository) => {
      const library = await repository.ensureLibrary(ownerId);
      if (!(await repository.findActiveDeck(ownerId, library.id, deckId))) throw notFound('Deck not found');
      if (await repository.hasActiveChildren(ownerId, library.id, deckId)) throw conflict('Delete child decks before their parent');
      if (!(await repository.softDeleteDeck(ownerId, library.id, deckId, expectedVersion))) throw conflict('Deck was changed by another request');
      await repository.incrementLibraryVersion(ownerId, library.id);
    });
  }
}
