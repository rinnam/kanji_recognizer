import { MAX_DECK_DEPTH, type DeckPlacement } from '../models/library.js';
import { invalid } from './errors.js';

export function validateDeckHierarchy(decks: readonly DeckPlacement[]): void {
  const parents = new Map(decks.map((deck) => [deck.id, deck.parentId]));
  for (const deck of decks) {
    if (deck.parentId !== null && !parents.has(deck.parentId)) {
      throw invalid(`Parent deck ${deck.parentId} does not belong to this active library`);
    }
    const visited = new Set<string>();
    let current: string | null = deck.id;
    let depth = 0;
    while (current !== null) {
      if (visited.has(current)) throw invalid('Deck hierarchy cycle is not allowed');
      visited.add(current);
      depth += 1;
      if (depth > MAX_DECK_DEPTH) throw invalid(`Deck hierarchy exceeds maximum depth ${MAX_DECK_DEPTH}`);
      current = parents.get(current) ?? null;
    }
  }
}
