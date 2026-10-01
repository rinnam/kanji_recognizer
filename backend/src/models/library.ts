export const MAX_DECK_DEPTH = 8;
export const SORT_POSITION_STEP = 1024;

export interface DeckRecord {
  id: string;
  libraryId: string;
  ownerId: string;
  parentId: string | null;
  sortPosition: string;
  name: string;
  description: string | null;
  version: string;
  archivedAt: Date | null;
  deletedAt: Date | null;
}

export interface DeckPlacement {
  id: string;
  parentId: string | null;
}

export const LIBRARY_ITEM_KINDS = ['kanji', 'vocabulary', 'grammar'] as const;
export const LIBRARY_ITEM_SORTS = ['saved-desc', 'saved-asc', 'key-asc', 'key-desc'] as const;

export type LibraryItemKind = typeof LIBRARY_ITEM_KINDS[number];
export type LibraryItemSort = typeof LIBRARY_ITEM_SORTS[number];

export interface LibraryItemCursor {
  sort: LibraryItemSort;
  value: string;
  id: string;
}

export interface LibraryItemQuery {
  q?: string;
  kind?: LibraryItemKind;
  deckId?: string;
  jlptLevel?: number;
  sort: LibraryItemSort;
  limit: number;
  cursor?: LibraryItemCursor;
}

export interface LibraryItemRecord {
  id: string;
  contentItemId: string;
  kind: LibraryItemKind;
  canonicalKey: string;
  jlptLevel: number | null;
  sourceKind: 'recognition' | 'import' | 'manual' | 'reference';
  sourceRef: string | null;
  savedAt: Date;
  version: string;
  deckIds: string[];
}

export interface LibraryBrowseResult {
  items: LibraryItemRecord[];
  nextCursor: string | null;
}

export interface LibrarySnapshot extends LibraryBrowseResult {
  id: string;
  ownerId: string;
  version: string;
  decks: DeckRecord[];
}
