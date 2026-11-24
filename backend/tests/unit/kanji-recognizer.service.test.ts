import { describe, expect, it } from 'vitest';
import { recognizeKanjiStrokes } from '../../src/services/kanji-recognizer.service.js';

describe('kanji-recognizer.service recognizeKanjiStrokes', () => {
  it('trả về mảng rỗng khi nét vẽ rỗng', () => {
    const res = recognizeKanjiStrokes([]);
    expect(res).toEqual([]);
  });

  it('nhận diện chính xác chữ 木 từ các nét vẽ mẫu', () => {
    const kiPattern = [
      [[50, 100], [250, 100]],
      [[150, 30], [150, 270]],
      [[150, 100], [50, 230]],
      [[150, 100], [250, 230]],
    ];

    const candidates = recognizeKanjiStrokes(kiPattern);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]).toBe('木');
  });

  it('nhận diện chữ 一 khi vẽ 1 nét ngang', () => {
    const ichiPattern = [
      [[30, 140], [250, 140]],
    ];

    const candidates = recognizeKanjiStrokes(ichiPattern);
    expect(candidates).toContain('一');
  });
});
