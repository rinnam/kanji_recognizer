import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { libraryEndpoint } from '../../library-source';

export type JlptLevelFilter = 'ALL' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type GrammarCategory =
  | 'time_sequence'
  | 'cause_result'
  | 'purpose_habit'
  | 'condition_scope'
  | 'contrast'
  | 'compound_particle'
  | 'inference_quote'
  | 'state_attitude';

export const GRAMMAR_CATEGORIES: ReadonlyArray<{ key: GrammarCategory; label: string }> = [
  { key: 'time_sequence', label: 'Thời gian & Trình tự' },
  { key: 'cause_result', label: 'Nguyên nhân & Kết quả' },
  { key: 'purpose_habit', label: 'Mục đích & Thói quen' },
  { key: 'condition_scope', label: 'Điều kiện & Phạm vi' },
  { key: 'contrast', label: 'Tương phản & Nhượng bộ' },
  { key: 'compound_particle', label: 'Trợ từ kép & Quan hệ' },
  { key: 'inference_quote', label: 'Phán đoán & Truyền đạt' },
  { key: 'state_attitude', label: 'Trạng thái & Thái độ' },
];

export interface GrammarPoint {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  category: GrammarCategory;
  pattern: string;
  structure: string;
  meaningVi: string;
  nuanceVi: string;
  examples: Array<{ ja: string; reading: string; vi: string }>;
}

export interface StarSentenceQuestion {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  meaningVi: string;
  prefixJa: string;
  suffixJa: string;
  parts: [string, string, string, string];
  starIndex: 0 | 1 | 2 | 3;
  explanationVi: string;
}

export interface GrammarBlitzQuestion {
  id: string;
  kind: 'particle' | 'conjugation';
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  promptMain: string;
  promptSub: string;
  meaningVi: string;
  correct: string;
  choices: [string, string, string, string];
  tipVi: string;
}

export interface PublicGrammarCatalogResponse {
  points: GrammarPoint[];
  starSentences: StarSentenceQuestion[];
  particleBlitz: GrammarBlitzQuestion[];
  conjugationBlitz: GrammarBlitzQuestion[];
  levelCounts: Record<JlptLevelFilter, number>;
}

export interface PublicGrammarSummaryResponse {
  totalPoints: number;
  levelCounts: Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1', number>;
}

const CATALOG_CACHE_KEY = 'kanji_smart_grammar_catalog_cache_v1';
const SUMMARY_CACHE_KEY = 'kanji_smart_grammar_summary_cache_v1';

function resolveApiBase(): string {
  return (
    libraryEndpoint ||
    (Platform.OS === 'web' ? 'http://localhost:3000/api' : 'http://localhost:3000/api')
  ).replace(/\/+$/, '');
}

export async function fetchPublicGrammarCatalog(
  level: JlptLevelFilter = 'ALL',
): Promise<PublicGrammarCatalogResponse> {
  try {
    const resp = await fetch(`${resolveApiBase()}/grammar?level=${encodeURIComponent(level)}`);
    if (!resp.ok) {
      const err = (await resp.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message || `Không tải được dữ liệu ngữ pháp (HTTP ${resp.status}).`);
    }
    const data = (await resp.json()) as PublicGrammarCatalogResponse;
    if (level === 'ALL') {
      void AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data)).catch(() => undefined);
    }
    return data;
  } catch (err) {
    if (level === 'ALL') {
      const cachedRaw = await AsyncStorage.getItem(CATALOG_CACHE_KEY).catch(() => null);
      if (cachedRaw) {
        return JSON.parse(cachedRaw) as PublicGrammarCatalogResponse;
      }
    }
    throw err instanceof Error ? err : new Error('Không thể kết nối máy chủ ngữ pháp.');
  }
}

export async function fetchPublicGrammarSummary(): Promise<PublicGrammarSummaryResponse> {
  try {
    const resp = await fetch(`${resolveApiBase()}/grammar/summary`);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = (await resp.json()) as PublicGrammarSummaryResponse;
    void AsyncStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(data)).catch(() => undefined);
    return data;
  } catch {
    const cachedRaw = await AsyncStorage.getItem(SUMMARY_CACHE_KEY).catch(() => null);
    if (cachedRaw) {
      try {
        return JSON.parse(cachedRaw) as PublicGrammarSummaryResponse;
      } catch {
        // ignore corrupt cache
      }
    }
    return {
      totalPoints: 0,
      levelCounts: { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 },
    };
  }
}
