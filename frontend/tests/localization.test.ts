import { describe, expect, it } from 'vitest';
import indexSource from '../index.html?raw';
import appSource from '../src/App.tsx?raw';
import statePanelSource from '../src/components/StatePanel.tsx?raw';
import deckTreeSource from '../src/features/library/DeckTree.tsx?raw';
import libraryScreenSource from '../src/features/library/LibraryScreen.tsx?raw';
import apiSource from '../src/features/library/api.ts?raw';
import learningSource from '../src/learning.ts?raw';

const localizedSurfaces = [
  ['index.html', indexSource],
  ['App.tsx', appSource],
  ['StatePanel.tsx', statePanelSource],
  ['DeckTree.tsx', deckTreeSource],
  ['LibraryScreen.tsx', libraryScreenSource],
  ['api.ts', apiSource],
  ['learning.ts', learningSource]
] as const;

const prohibitedEnglishUi = [
  'Primary navigation',
  'Recognition is not available',
  '>Library<',
  'Japanese collection',
  'Search and filter saved items',
  'Search library',
  'All kinds',
  'Any level',
  'Recently saved',
  'All saved items',
  'Loading library',
  'You’re offline',
  '>Retry<',
  '>Try again<',
  'Create child deck',
  'Archive and delete deck',
  'Remove deck permanently',
  'Source detail unavailable',
  'The Library is unavailable while you are offline.'
];

describe('Vietnamese user-facing copy', () => {
  it.each(localizedSurfaces)('contains no prohibited active English UI in %s', (_fileName, source) => {
    for (const phrase of prohibitedEnglishUi) expect(source).not.toContain(phrase);
  });
});
