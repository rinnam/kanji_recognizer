import { useEffect, useState } from 'react';
import type { VocabularyDto } from '../../../../packages/contracts/src/study';
import { libraryEndpoint, loadLibrary } from '../../library-source';
import { sampleLibrary } from '../../sample-library';
import { readServerCache, saveServerCache } from '../../workspace-storage';

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

export function selectGameDeck(
  allWords: readonly VocabularyDto[],
  jlptFilter: string,
): { pool: VocabularyDto[]; broadened: boolean } {
  const valid = allWords.filter(
    (w) => !w.deletedAt && w.word.trim().length > 0 && w.meaning.trim().length > 0,
  );
  let chosen =
    jlptFilter === 'ALL' ? valid : valid.filter((w) => w.jlptLevel === jlptFilter);
  let broadened = false;
  if (chosen.length < 4) {
    chosen = valid;
    broadened = jlptFilter !== 'ALL';
  }

  // Prioritize words due for SRS review or newly learned
  const nowMs = Date.now();
  const sorted = [...chosen].sort((a, b) => {
    const aDue = a.srsNextReview ? new Date(a.srsNextReview).getTime() <= nowMs : true;
    const bDue = b.srsNextReview ? new Date(b.srsNextReview).getTime() <= nowMs : true;
    if (aDue !== bDue) return aDue ? -1 : 1;
    return (a.srsInterval ?? 0) - (b.srsInterval ?? 0);
  });

  // Mix top SRS pool so rounds aren't rigidly identical every replay
  const topSlice = sorted.slice(0, Math.min(80, sorted.length));
  return { pool: shuffleItems(topSlice), broadened };
}

export function useGameVocabulary() {
  const [words, setWords] = useState<VocabularyDto[]>(FALLBACK_VOCAB);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        let live: VocabularyDto[] = [];
        if (libraryEndpoint) {
          const cached = await readServerCache(libraryEndpoint).catch(() => undefined);
          if (cached) {
            live = cached.vocabularies.filter((v) => !v.deletedAt);
          }
        }
        if (live.length < 4) {
          const controller = new AbortController();
          const pulled = await loadLibrary(controller.signal).catch(() => undefined);
          if (pulled) {
            if (libraryEndpoint) {
              void saveServerCache(libraryEndpoint, pulled).catch(() => undefined);
            }
            live = pulled.vocabularies.filter((v) => !v.deletedAt);
          }
        }
        if (active && live.length >= 4) {
          setWords(live);
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

  return { words, loading };
}
