import { db } from '../config/database.js';

const DEFAULT_OWNER_ID = '00000000-0000-4000-8000-000000000000';

export interface DictionaryWordEntry {
  id: string;
  word: string;
  reading: string;
  meaningVi: string;
  meaningEn?: string;
  sinoVietnamese?: string | null;
  jlpt: string[];
  partsOfSpeech: string[];
  source: 'library' | 'jisho';
}

export interface DictionaryKanjiEntry {
  kanji: string;
  strokeCount: number | null;
  jlpt: number | null;
  grade: number | null;
  onReadings: string[];
  kunReadings: string[];
  meaningsEn: string[];
  meaningsVi: string;
}

export interface DictionarySearchResult {
  query: string;
  words: DictionaryWordEntry[];
  kanji: DictionaryKanjiEntry[];
}

interface CacheBucket<T> {
  expiresAt: number;
  value: T;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const jishoCache = new Map<string, CacheBucket<DictionaryWordEntry[]>>();
const kanjiCache = new Map<string, CacheBucket<DictionaryKanjiEntry | null>>();

function getCached<T>(map: Map<string, CacheBucket<T>>, key: string): T | undefined {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    map.delete(key);
    return undefined;
  }
  return hit.value;
}

function setCached<T>(map: Map<string, CacheBucket<T>>, key: string, value: T): void {
  if (map.size > 300) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
  map.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

async function translateBatchEnToVi(lines: string[]): Promise<string[]> {
  if (lines.length === 0) return [];
  try {
    const joined = lines.join('\n');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(joined)}`;
    const res = await fetch(url);
    if (!res.ok) return lines;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return lines;
    const full = (data[0] as unknown[])
      .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
      .join('');
    const split = full.split('\n').map((s) => s.trim());
    if (split.length === lines.length) return split;
    return lines;
  } catch {
    return lines;
  }
}

async function searchLocalVocabularies(
  userId: string,
  query: string,
): Promise<DictionaryWordEntry[]> {
  const pattern = `%${query}%`;
  const rows = await db
    .selectFrom('vocabularies')
    .select(['id', 'word', 'reading', 'meaning', 'sino_vietnamese'])
    .where('owner_id', '=', userId)
    .where('deleted_at', 'is', null)
    .where((eb) =>
      eb.or([
        eb('word', 'ilike', pattern),
        eb('reading', 'ilike', pattern),
        eb('meaning', 'ilike', pattern),
        eb('sino_vietnamese', 'ilike', pattern),
      ]),
    )
    .limit(10)
    .execute();

  return rows.map((row) => ({
    id: `lib-${row.id}`,
    word: row.word,
    reading: row.reading ?? '',
    meaningVi: row.meaning,
    sinoVietnamese: row.sino_vietnamese,
    jlpt: [],
    partsOfSpeech: [],
    source: 'library' as const,
  }));
}

interface JishoApiResponse {
  data?: Array<{
    slug?: string;
    jlpt?: string[];
    japanese?: Array<{ word?: string; reading?: string }>;
    senses?: Array<{
      english_definitions?: string[];
      parts_of_speech?: string[];
    }>;
  }>;
}

async function searchJishoWords(query: string): Promise<DictionaryWordEntry[]> {
  const key = query.toLowerCase();
  const cached = getCached(jishoCache, key);
  if (cached) return cached;

  try {
    const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KanjiNest/1.0' },
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as JishoApiResponse;
    const rawItems = (payload.data ?? []).slice(0, 12);

    const englishLines = rawItems.map((item) => {
      const defs = (item.senses ?? [])
        .slice(0, 2)
        .flatMap((s) => (s.english_definitions ?? []).slice(0, 3));
      return defs.slice(0, 4).join('; ');
    });

    const vietnameseLines = await translateBatchEnToVi(englishLines);

    const results: DictionaryWordEntry[] = rawItems.map((item, idx) => {
      const primary = item.japanese?.[0];
      const word = primary?.word || primary?.reading || item.slug || '';
      const reading = primary?.reading || '';
      const jlpt = (item.jlpt ?? []).map((tag) => tag.replace(/^jlpt-/i, '').toUpperCase());
      const partsOfSpeech = (item.senses?.[0]?.parts_of_speech ?? []).slice(0, 2);
      const meaningEn = englishLines[idx] || '';
      const meaningVi = vietnameseLines[idx] || meaningEn;

      return {
        id: `jisho-${item.slug || idx}-${idx}`,
        word,
        reading,
        meaningVi,
        meaningEn,
        jlpt,
        partsOfSpeech,
        source: 'jisho' as const,
      };
    });

    setCached(jishoCache, key, results);
    return results;
  } catch {
    return [];
  }
}

interface KanjiApiResponse {
  kanji?: string;
  stroke_count?: number;
  jlpt?: number | null;
  grade?: number | null;
  on_readings?: string[];
  kun_readings?: string[];
  meanings?: string[];
}

async function fetchSingleKanji(char: string): Promise<DictionaryKanjiEntry | null> {
  const cached = getCached(kanjiCache, char);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(char)}`);
    if (!res.ok) {
      setCached(kanjiCache, char, null);
      return null;
    }
    const data = (await res.json()) as KanjiApiResponse;
    const meaningsEn = (data.meanings ?? []).slice(0, 5);
    const [meaningVi] = await translateBatchEnToVi([meaningsEn.join(', ')]);
    const entry: DictionaryKanjiEntry = {
      kanji: data.kanji || char,
      strokeCount: typeof data.stroke_count === 'number' ? data.stroke_count : null,
      jlpt: typeof data.jlpt === 'number' ? data.jlpt : null,
      grade: typeof data.grade === 'number' ? data.grade : null,
      onReadings: (data.on_readings ?? []).slice(0, 6),
      kunReadings: (data.kun_readings ?? []).slice(0, 6),
      meaningsEn,
      meaningsVi: meaningVi || meaningsEn.join(', '),
    };
    setCached(kanjiCache, char, entry);
    return entry;
  } catch {
    return null;
  }
}

function extractKanjiChars(text: string): string[] {
  const matches = text.match(/[\u4e00-\u9faf]/g) ?? [];
  return [...new Set(matches)].slice(0, 6);
}

export async function searchDictionary(
  rawQuery: string,
  userId?: string,
): Promise<DictionarySearchResult> {
  const query = rawQuery.trim();
  if (!query) {
    return { query: '', words: [], kanji: [] };
  }

  const ownerId = userId || DEFAULT_OWNER_ID;
  const [localWords, jishoWords] = await Promise.all([
    searchLocalVocabularies(ownerId, query),
    searchJishoWords(query),
  ]);

  const seen = new Set(localWords.map((w) => `${w.word}|${w.reading}`));
  const mergedWords = [
    ...localWords,
    ...jishoWords.filter((w) => !seen.has(`${w.word}|${w.reading}`)),
  ];

  let kanjiChars = extractKanjiChars(query);
  if (kanjiChars.length === 0 && mergedWords.length > 0) {
    kanjiChars = extractKanjiChars(
      mergedWords
        .slice(0, 3)
        .map((w) => w.word)
        .join(''),
    );
  }

  const kanjiEntries = (await Promise.all(kanjiChars.map(fetchSingleKanji))).filter(
    (item): item is DictionaryKanjiEntry => item !== null,
  );

  return {
    query,
    words: mergedWords,
    kanji: kanjiEntries,
  };
}
