export type PosCategory =
  | 'particle'
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'conjunction'
  | 'symbol'
  | 'other';

export interface AnalyzedToken {
  surface: string;
  reading: string;
  base: string;
  pos: PosCategory;
  posRaw: string;
}

export interface ShadowingLine {
  start: number;
  duration: number;
  text: string;
  tokens: AnalyzedToken[];
}

export interface SampleVideoItem {
  videoId: string;
  title: string;
  channel?: string;
  level?: string;
  duration?: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface ShadowingVideo extends SampleVideoItem {
  lines: ShadowingLine[];
}
