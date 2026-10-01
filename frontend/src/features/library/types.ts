export type LibraryItemKind = 'kanji' | 'vocabulary' | 'grammar';
export type LibrarySort = 'saved-desc' | 'saved-asc' | 'key-asc' | 'key-desc';

export interface Deck {
  id: string;
  parentId: string | null;
  sortPosition: string;
  name: string;
  description: string | null;
  version: string;
}

export interface LibraryItem {
  id: string;
  contentItemId: string;
  kind: LibraryItemKind;
  canonicalKey: string;
  jlptLevel: number | null;
  sourceKind: 'recognition' | 'import' | 'manual' | 'reference';
  sourceRef: string | null;
  savedAt: string;
  version: string;
  deckIds: string[];
}

export interface LibraryResponse {
  id: string;
  ownerId: string;
  version: string;
  decks: Deck[];
  items: LibraryItem[];
  nextCursor: string | null;
}

export interface LibraryFilters {
  q: string;
  kind: '' | LibraryItemKind;
  deckId: string;
  jlptLevel: '' | '1' | '2' | '3' | '4' | '5';
  sort: LibrarySort;
}

export interface SaveItemInput {
  contentItemId: string;
  deckId?: string;
  sourceKind: 'manual' | 'import' | 'reference';
  sourceRef?: string;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
}
