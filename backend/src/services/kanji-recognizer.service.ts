import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let isInitialized = false;

function ensureInitialized(): void {
  if (isInitialized) return;

  const candidates = [
    path.resolve(process.cwd(), 'test_module'),
    path.resolve(process.cwd(), '../test_module'),
    path.resolve(process.cwd(), 'mobile/public'),
    path.resolve(process.cwd(), '../mobile/public'),
  ];
  let baseDir = candidates[0] ?? process.cwd();
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'kanji-canvas.js'))) {
      baseDir = c;
      break;
    }
  }

  const globalScope = globalThis as unknown as {
    window: unknown;
    document: unknown;
    KanjiCanvas?: any;
  };

  globalScope.window = globalScope;
  globalScope.document = {
    getElementById: () => ({ getContext: () => ({}) }),
    addEventListener: () => {},
  };

  require(path.join(baseDir, 'kanji-canvas.js'));
  require(path.join(baseDir, 'ref-patterns.js'));
  isInitialized = true;
}

export function recognizeKanjiStrokes(strokes: number[][][]): string[] {
  if (!strokes || strokes.length === 0) return [];
  ensureInitialized();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const KanjiCanvas = (globalThis as any).KanjiCanvas;
  if (!KanjiCanvas) return [];

  const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  KanjiCanvas[`canvas_${id}`] = { dataset: {} };
  KanjiCanvas[`ctx_${id}`] = {
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    closePath: () => {},
    strokeText: () => {},
    fillText: () => {},
  };
  KanjiCanvas[`w_${id}`] = 280;
  KanjiCanvas[`h_${id}`] = 280;
  KanjiCanvas[`recordedPattern_${id}`] = strokes;

  try {
    const raw = KanjiCanvas.recognize(id);
    if (!raw || typeof raw !== 'string') return [];
    return raw.trim().split(/\s+/).filter(Boolean);
  } finally {
    delete KanjiCanvas[`canvas_${id}`];
    delete KanjiCanvas[`ctx_${id}`];
    delete KanjiCanvas[`recordedPattern_${id}`];
  }
}
