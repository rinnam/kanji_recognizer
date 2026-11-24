import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export type PosCategory = 'particle' | 'noun' | 'verb' | 'adjective' | 'adverb' | 'conjunction' | 'symbol' | 'other';

export interface AnalyzedToken {
  surface: string;
  reading: string;
  base: string;
  pos: PosCategory;
  posRaw: string;
}

interface KuromojiToken {
  surface_form: string;
  reading?: string;
  basic_form?: string;
  pos: string;
  pos_detail_1?: string;
  pos_detail_2?: string;
  pos_detail_3?: string;
}

interface KuromojiTokenizer {
  tokenize(text: string): KuromojiToken[];
}

function katakanaToHiragana(value?: string): string {
  if (!value || value === '*') return '';
  return value.replace(/[\u30a1-\u30f6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

function classifyPos(pos: string): PosCategory {
  if (pos.includes('助詞')) return 'particle';
  if (pos.includes('感動詞')) return 'other';
  if (pos.includes('名詞')) return 'noun';
  if (pos.includes('形容詞') || pos.includes('形容動詞')) return 'adjective';
  if (pos.includes('動詞')) return 'verb';
  if (pos.includes('副詞')) return 'adverb';
  if (pos.includes('接続詞')) return 'conjunction';
  if (pos.includes('記号')) return 'symbol';
  return 'other';
}

let tokenizerPromise: Promise<KuromojiTokenizer | null> | null = null;

function resolveKuromojiPaths(): { buildFile: string; dictDir: string } | null {
  const candidates = [
    path.resolve(process.cwd(), 'test_module/kuromoji-local'),
    path.resolve(process.cwd(), '../test_module/kuromoji-local'),
  ];
  for (const base of candidates) {
    const buildFile = path.join(base, 'build/kuromoji.js');
    const dictDir = path.join(base, 'dict');
    if (fs.existsSync(buildFile) && fs.existsSync(dictDir)) {
      return { buildFile, dictDir };
    }
  }
  return null;
}

export function getTokenizer(): Promise<KuromojiTokenizer | null> {
  if (tokenizerPromise) return tokenizerPromise;

  tokenizerPromise = new Promise<KuromojiTokenizer | null>((resolve) => {
    const paths = resolveKuromojiPaths();
    if (!paths) {
      console.warn('[Tokenizer] Cannot locate kuromoji files in test_module/kuromoji-local');
      resolve(null);
      return;
    }

    // Polyfill XMLHttpRequest for browser bundle of kuromoji in Node
    const originalXhr = (globalThis as unknown as { XMLHttpRequest?: unknown }).XMLHttpRequest;
    (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = class {
      url = '';
      status = 0;
      response: ArrayBuffer | null = null;
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;

      open(_method: string, url: string) {
        this.url = url;
      }

      send() {
        try {
          const filePath = path.resolve(this.url);
          const buffer = fs.readFileSync(filePath);
          this.status = 200;
          this.response = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
          if (this.onload) this.onload();
        } catch (error) {
          this.status = 404;
          if (this.onerror) this.onerror(error);
        }
      }
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const kuromoji = require(paths.buildFile);
      const dictTrailing = paths.dictDir.endsWith(path.sep) ? paths.dictDir : paths.dictDir + path.sep;
      kuromoji.builder({ dicPath: dictTrailing }).build((err: unknown, tokenizer: KuromojiTokenizer) => {
        if (originalXhr) {
          (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = originalXhr;
        }
        if (err) {
          console.error('[Tokenizer] Failed to build kuromoji:', err);
          resolve(null);
        } else {
          resolve(tokenizer);
        }
      });
    } catch (err) {
      console.error('[Tokenizer] Failed to load kuromoji script:', err);
      resolve(null);
    }
  });

  return tokenizerPromise;
}

export async function tokenizeText(text: string): Promise<AnalyzedToken[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const tokenizer = await getTokenizer();
  if (!tokenizer) {
    // Fallback: word split
    return [{
      surface: trimmed,
      reading: '',
      base: trimmed,
      pos: 'other',
      posRaw: 'untokenized',
    }];
  }

  const tokens = tokenizer.tokenize(trimmed);
  return tokens.map((token) => {
    const surface = token.surface_form;
    const reading = katakanaToHiragana(token.reading);
    const base = token.basic_form && token.basic_form !== '*' ? token.basic_form : surface;
    const pos = classifyPos(token.pos);
    const posRaw = [token.pos, token.pos_detail_1].filter(Boolean).join(' · ');
    return { surface, reading, base, pos, posRaw };
  });
}
