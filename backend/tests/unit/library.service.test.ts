import { describe, expect, it, vi } from 'vitest';
import { LibraryService } from '../../src/services/library.service.js';
import type { LibraryRepository } from '../../src/repositories/library.repository.js';

function repository(overrides: Record<string, unknown> = {}): LibraryRepository {
  const base = {
    transaction: async (callback: (repo: unknown) => Promise<unknown>) => callback(base),
    ensureLibrary: vi.fn().mockResolvedValue({ id: 'library', version: '1' }),
    ensureLocalOwner: vi.fn(),
    listActiveDecks: vi.fn().mockResolvedValue([]), listSavedItems: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    contentExists: vi.fn().mockResolvedValue(true), findSavedItem: vi.fn().mockResolvedValue({ id: 'saved' }),
    findActiveDeck: vi.fn().mockResolvedValue(undefined), addMembership: vi.fn().mockResolvedValue(false), insertSavedItem: vi.fn(),
    incrementLibraryVersion: vi.fn().mockResolvedValue({ version: '2' }),
    nextSortPosition: vi.fn().mockResolvedValue(1024n), createDeck: vi.fn().mockResolvedValue({ id: 'deck' }),
    hasActiveChildren: vi.fn().mockResolvedValue(false), softDeleteDeck: vi.fn().mockResolvedValue({ id: 'deck' }),
    ...overrides
  };
  return base as unknown as LibraryRepository;
}

describe('LibraryService', () => {
  it('returns owner-scoped library state', async () => {
    const service = new LibraryService(repository());
    await expect(service.getLibrary('owner')).resolves.toMatchObject({ id: 'library', ownerId: 'owner', decks: [], items: [] });
  });

  it('saves eligible content transactionally and adds duplicate-safe membership', async () => {
    const insertSavedItem = vi.fn().mockResolvedValue({ id: 'saved' });
    const addMembership = vi.fn().mockResolvedValue(true);
    const repo = repository({ findSavedItem: vi.fn().mockResolvedValue(undefined), insertSavedItem, addMembership, findActiveDeck: vi.fn().mockResolvedValue({ id: 'deck' }) });
    await expect(new LibraryService(repo).saveItem('owner', { contentItemId: 'content', deckId: 'deck', sourceKind: 'reference', sourceRef: 'catalog:1' })).resolves.toEqual({ id: 'saved' });
    expect(insertSavedItem).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'owner', libraryId: 'library', contentItemId: 'content', sourceKind: 'reference', sourceRef: 'catalog:1' }));
    expect(addMembership).toHaveBeenCalledWith('owner', 'deck', 'saved', undefined);
    expect(repo.incrementLibraryVersion).toHaveBeenCalledWith('owner', 'library');
  });

  it('reuses an existing save instead of inserting a duplicate', async () => {
    const existing = { id: 'saved' };
    const insertSavedItem = vi.fn();
    const repo = repository({ findSavedItem: vi.fn().mockResolvedValue(existing), insertSavedItem });
    await expect(new LibraryService(repo).saveItem('owner', { contentItemId: 'content', sourceKind: 'manual' })).resolves.toBe(existing);
    expect(insertSavedItem).not.toHaveBeenCalled();
  });

  it('refuses content that is not eligible for saving', async () => {
    const repo = repository({ contentExists: vi.fn().mockResolvedValue(false) });
    await expect(new LibraryService(repo).saveItem('owner', { contentItemId: 'missing', sourceKind: 'manual' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updates deck fields with the expected version and reports conflicts', async () => {
    const current = { id: 'deck', parentId: null, version: '1' };
    const updateDeck = vi.fn().mockResolvedValue(undefined);
    const repo = repository({ findActiveDeck: vi.fn().mockResolvedValue(current), listActiveDecks: vi.fn().mockResolvedValue([current]), updateDeck });
    await expect(new LibraryService(repo).updateDeck('owner', 'deck', { expectedVersion: 1n, name: 'Renamed', description: 'Notes' })).rejects.toMatchObject({ statusCode: 409 });
    expect(updateDeck).toHaveBeenCalledWith(expect.objectContaining({ deckId: 'deck', expectedVersion: 1n, name: 'Renamed', description: 'Notes' }));
  });

  it('refuses an unknown parent deck', async () => {
    const service = new LibraryService(repository());
    await expect(service.createDeck('owner', { name: 'Child', parentId: 'missing' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuses parent deletion while active children exist', async () => {
    const repo = repository({ findActiveDeck: vi.fn().mockResolvedValue({ id: 'deck' }), hasActiveChildren: vi.fn().mockResolvedValue(true) });
    await expect(new LibraryService(repo).deleteDeck('owner', 'deck', 1n)).rejects.toMatchObject({ statusCode: 409 });
  });
});
