import { describe, expect, it } from 'vitest';
import { validateDeckHierarchy } from '../../src/utils/deck-hierarchy.js';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

describe('validateDeckHierarchy', () => {
  it('accepts a hierarchy at depth eight', () => {
    const decks = Array.from({ length: 8 }, (_, index) => ({ id: id(index), parentId: index === 0 ? null : id(index - 1) }));
    expect(() => validateDeckHierarchy(decks)).not.toThrow();
  });

  it('rejects depth nine', () => {
    const decks = Array.from({ length: 9 }, (_, index) => ({ id: id(index), parentId: index === 0 ? null : id(index - 1) }));
    expect(() => validateDeckHierarchy(decks)).toThrow(/maximum depth 8/);
  });

  it('rejects cycles', () => {
    expect(() => validateDeckHierarchy([{ id: id(1), parentId: id(2) }, { id: id(2), parentId: id(1) }])).toThrow(/cycle/);
  });

  it('rejects a parent outside the active owner library', () => {
    expect(() => validateDeckHierarchy([{ id: id(1), parentId: id(2) }])).toThrow(/does not belong/);
  });
});
