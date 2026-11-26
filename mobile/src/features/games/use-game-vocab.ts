import { useEffect, useState } from 'react';
import type { FolderDto, VocabularyDto } from '../../../../packages/contracts/src/study';
import { libraryEndpoint, loadLibrary } from '../../library-source';
import { sampleLibrary } from '../../sample-library';
import { readServerCache, saveServerCache } from '../../workspace-storage';

export type SrsFocusMode = 'all' | 'due' | 'new_learning';

export interface GameDeckSelection {
  folderIds: string[];
  jlptLevel: string;
  srsFocus: SrsFocusMode;
  limitCount: number;
}

export const DEFAULT_GAME_DECK_SELECTION: GameDeckSelection = {
  folderIds: [],
  jlptLevel: 'ALL',
  srsFocus: 'all',
  limitCount: 20,
};

export interface FolderDeckOption {
  id: string;
  name: string;
  fullPath: string;
  parentId: string | null;
  count: number;
  depth: number;
}

export interface SelectedGameDeckResult {
  targets: VocabularyDto[];
  distractorPool: VocabularyDto[];
  matchedCount: number;
  deckLabel: string;
  broadened: boolean;
}

const STARTER_BACKUP_DATE = '2026-11-26T00:00:00.000Z';

const STARTER_WORDS: Array<[string, string, string, VocabularyDto['jlptLevel']]> = [
  ['学校', 'がっこう', 'trường học', 'N5'],
  ['先生', 'せんせい', 'giáo viên, thầy cô', 'N5'],
  ['図書館', 'としょかん', 'thư viện', 'N5'],
  ['電車', 'でんしゃ', 'tàu điện', 'N5'],
  ['食べる', 'たべる', 'ăn', 'N5'],
  ['飲む', 'のむ', 'uống', 'N5'],
  ['約束', 'やくそく', 'lời hứa, cuộc hẹn', 'N4'],
  ['経験', 'けいけん', 'kinh nghiệm', 'N4'],
  ['準備', 'じゅんび', 'chuẩn bị', 'N4'],
  ['安心', 'あんしん', 'an tâm', 'N4'],
  ['努力', 'どりょく', 'nỗ lực', 'N3'],
  ['目的', 'もくてき', 'mục đích', 'N3'],
  ['確認', 'かくにん', 'xác nhận', 'N3'],
  ['連絡', 'れんらく', 'liên lạc', 'N4'],
];

const FALLBACK_VOCAB: VocabularyDto[] = [
  ...sampleLibrary.vocabularies,
  ...STARTER_WORDS.map(
    ([word, reading, meaning, jlptLevel], idx): VocabularyDto => ({
      id: `starter-game-word-${idx}`,
      word,
      reading,
      meaning,
      sinoVietnamese: null,
      example: null,
      exampleMeaning: null,
      note: null,
      tags: [],
      jlptLevel,
      srsInterval: null,
      srsRepetition: null,
      srsEaseFactor: null,
      srsNextReview: null,
      folderIds: [],
      createdAt: STARTER_BACKUP_DATE,
      updatedAt: STARTER_BACKUP_DATE,
      deletedAt: null,
    }),
  ),
];

export function shuffleItems<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function isValidGameWord(w: VocabularyDto): boolean {
  return !w.deletedAt && w.word.trim().length > 0 && w.meaning.trim().length > 0;
}

export function isWordDueSrs(w: VocabularyDto, nowMs = Date.now()): boolean {
  return !w.srsNextReview || new Date(w.srsNextReview).getTime() <= nowMs;
}

export function isWordNewOrLearning(w: VocabularyDto): boolean {
  return (w.srsRepetition ?? 0) < 2 || (w.srsInterval ?? 0) <= 3;
}

/**
 * Recursively expands root folder IDs to include all active child/descendant folder IDs.
 * Uses a visited set so malformed circular parent references cannot loop infinitely.
 */
export function getDescendantFolderIds(
  rootIds: readonly string[],
  folders: readonly FolderDto[],
): Set<string> {
  const activeFolders = folders.filter((f) => !f.deletedAt);
  const childrenMap = new Map<string, string[]>();
  const activeSet = new Set<string>();

  for (const f of activeFolders) {
    activeSet.add(f.id);
    if (f.parentId) {
      const list = childrenMap.get(f.parentId) ?? [];
      list.push(f.id);
      childrenMap.set(f.parentId, list);
    }
  }

  const visited = new Set<string>();
  const stack: string[] = [];
  for (const id of rootIds) {
    if (activeSet.has(id) && !visited.has(id)) {
      visited.add(id);
      stack.push(id);
    }
  }

  while (stack.length > 0) {
    const cur = stack.pop()!;
    const children = childrenMap.get(cur);
    if (!children) continue;
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId);
        stack.push(childId);
      }
    }
  }

  return visited;
}

/**
 * Builds flattened hierarchical folder deck options (omitting empty folders), sorted in tree order.
 */
export function buildFolderDeckOptions(
  folders: readonly FolderDto[],
  words: readonly VocabularyDto[],
): FolderDeckOption[] {
  const activeFolders = folders.filter((f) => !f.deletedAt);
  if (activeFolders.length === 0) return [];

  const validWords = words.filter(isValidGameWord);
  const folderMap = new Map<string, FolderDto>(activeFolders.map((f) => [f.id, f]));
  const childrenMap = new Map<string | null, FolderDto[]>();

  for (const f of activeFolders) {
    const parentKey = f.parentId && folderMap.has(f.parentId) ? f.parentId : null;
    const list = childrenMap.get(parentKey) ?? [];
    list.push(f);
    childrenMap.set(parentKey, list);
  }

  for (const list of childrenMap.values()) {
    list.sort((a, b) => {
      const oa = a.order ?? Number.MAX_SAFE_INTEGER;
      const ob = b.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name, 'vi');
    });
  }

  const options: FolderDeckOption[] = [];
  const visitedTree = new Set<string>();

  const visit = (folder: FolderDto, ancestors: string[], depth: number) => {
    if (visitedTree.has(folder.id)) return;
    visitedTree.add(folder.id);

    const pathParts = [...ancestors, folder.name];
    const scope = getDescendantFolderIds([folder.id], activeFolders);
    const count = validWords.filter((w) => w.folderIds.some((fid) => scope.has(fid))).length;

    if (count > 0) {
      options.push({
        id: folder.id,
        name: folder.name,
        fullPath: pathParts.join(' / '),
        parentId: folder.parentId && folderMap.has(folder.parentId) ? folder.parentId : null,
        count,
        depth,
      });
    }

    const children = childrenMap.get(folder.id) ?? [];
    for (const child of children) {
      visit(child, pathParts, depth + 1);
    }
  };

  for (const root of childrenMap.get(null) ?? []) {
    visit(root, [], 0);
  }

  // Fallback for any unreachable cycle component
  for (const f of activeFolders) {
    if (!visitedTree.has(f.id)) {
      visit(f, [], 0);
    }
  }

  return options;
}

function buildDeckLabel(
  validSelectedFolderIds: readonly string[],
  folderMap: ReadonlyMap<string, FolderDto>,
  selection: GameDeckSelection,
): string {
  const parts: string[] = [];

  if (validSelectedFolderIds.length === 0) {
    parts.push('Tất cả bộ từ');
  } else {
    const names = validSelectedFolderIds
      .map((id) => folderMap.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    if (names.length <= 2) {
      parts.push(names.join(', '));
    } else {
      parts.push(`${names[0]}, ${names[1]} +${names.length - 2} bộ`);
    }
  }

  if (selection.jlptLevel !== 'ALL') {
    parts.push(selection.jlptLevel);
  }
  if (selection.srsFocus === 'due') {
    parts.push('Đến hạn SRS');
  } else if (selection.srsFocus === 'new_learning') {
    parts.push('Từ mới');
  }

  return parts.join(' · ');
}

function filterMatchingWords(
  allWords: readonly VocabularyDto[],
  selection: GameDeckSelection,
  folders: readonly FolderDto[],
) {
  const valid = allWords.filter(isValidGameWord);
  const activeFolders = folders.filter((f) => !f.deletedAt);
  const folderMap = new Map<string, FolderDto>(activeFolders.map((f) => [f.id, f]));
  const validFolderIds = selection.folderIds.filter((id) => folderMap.has(id));

  let chosen = valid;
  if (validFolderIds.length > 0) {
    const allowedFolders = getDescendantFolderIds(validFolderIds, activeFolders);
    chosen = chosen.filter((w) => w.folderIds.some((fid) => allowedFolders.has(fid)));
  }

  if (selection.jlptLevel !== 'ALL') {
    chosen = chosen.filter((w) => w.jlptLevel === selection.jlptLevel);
  }

  const nowMs = Date.now();
  if (selection.srsFocus === 'due') {
    chosen = chosen.filter((w) => isWordDueSrs(w, nowMs));
  } else if (selection.srsFocus === 'new_learning') {
    chosen = chosen.filter((w) => isWordNewOrLearning(w));
  }

  const deckLabel = buildDeckLabel(validFolderIds, folderMap, selection);
  return { valid, chosen, deckLabel, nowMs };
}

export function countDeckMatches(
  allWords: readonly VocabularyDto[],
  selection: GameDeckSelection,
  folders: readonly FolderDto[] = [],
): number {
  return filterMatchingWords(allWords, selection, folders).chosen.length;
}

export function selectGameDeck(
  allWords: readonly VocabularyDto[],
  selection: GameDeckSelection = DEFAULT_GAME_DECK_SELECTION,
  folders: readonly FolderDto[] = [],
): SelectedGameDeckResult {
  const { valid, chosen, deckLabel, nowMs } = filterMatchingWords(allWords, selection, folders);
  const matchedCount = chosen.length;

  if (matchedCount === 0) {
    return {
      targets: [],
      distractorPool: valid,
      matchedCount: 0,
      deckLabel,
      broadened: true,
    };
  }

  // Prioritize words due for SRS review or with shorter repetition intervals
  const sorted = [...chosen].sort((a, b) => {
    const aDue = isWordDueSrs(a, nowMs);
    const bDue = isWordDueSrs(b, nowMs);
    if (aDue !== bDue) return aDue ? -1 : 1;
    return (a.srsInterval ?? 0) - (b.srsInterval ?? 0);
  });

  const capped =
    selection.limitCount > 0 ? sorted.slice(0, Math.min(selection.limitCount, sorted.length)) : sorted;
  const targets = shuffleItems(capped);
  const distractorPool =
    targets.length >= 4 ? targets : chosen.length >= 4 ? chosen : valid;

  return {
    targets,
    distractorPool,
    matchedCount,
    deckLabel,
    broadened: false,
  };
}

export function useGameVocabulary() {
  const [words, setWords] = useState<VocabularyDto[]>(FALLBACK_VOCAB);
  const [folders, setFolders] = useState<FolderDto[]>(sampleLibrary.folders);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        let liveWords: VocabularyDto[] = [];
        let liveFolders: FolderDto[] = [];
        if (libraryEndpoint) {
          const cached = await readServerCache(libraryEndpoint).catch(() => undefined);
          if (cached) {
            liveWords = cached.vocabularies.filter((v) => !v.deletedAt);
            liveFolders = cached.folders.filter((f) => !f.deletedAt);
          }
        }
        if (liveWords.length < 4) {
          const controller = new AbortController();
          const pulled = await loadLibrary(controller.signal).catch(() => undefined);
          if (pulled) {
            if (libraryEndpoint) {
              void saveServerCache(libraryEndpoint, pulled).catch(() => undefined);
            }
            liveWords = pulled.vocabularies.filter((v) => !v.deletedAt);
            liveFolders = pulled.folders.filter((f) => !f.deletedAt);
          }
        }
        if (active && liveWords.length >= 4) {
          setWords(liveWords);
          setFolders(liveFolders);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return { words, folders, loading };
}
