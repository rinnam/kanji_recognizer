export type { KanjiDetail, KanjiSegment } from './model/types';
export { KANJI_DATABASE, lookupKanji } from './model/kanji-dict';
export {
  isKanji,
  extractKanji,
  segmentJapaneseWord,
  mapSinoForKanjiIndex,
} from './model/kanji-utils';
export { KanjiPopover } from './ui/KanjiPopover';
export { InteractiveKanjiText } from './ui/InteractiveKanjiText';
export type { InteractiveKanjiTextProps } from './ui/InteractiveKanjiText';
