import { describe, expect, it } from 'vitest';
import {
  formatIntervalLabel,
  isDue,
  nextEaseFactor,
  previewIntervalLabel,
  review,
  type SrsState,
} from '../../src/entities/card';

/**
 * Anki SM-2 phía client phải KHỚP backend/src/services/srs.service.ts.
 * (now cố định để tất định.)
 */
const NOW = new Date('2026-10-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const fresh: SrsState = { interval: null, repetition: null, easeFactor: null };

describe('card Anki SM-2 (mirror backend srs.service)', () => {
  it('Good lần đầu → interval 1, repetition 1, EF mặc định 2.5', () => {
    const r = review(fresh, 'good', NOW);
    expect(r.repetition).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(2.5);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + DAY);
  });

  it('Easy lần đầu → interval 4 (chuẩn Anki), repetition 1, EF tăng 2.65', () => {
    const r = review(fresh, 'easy', NOW);
    expect(r.repetition).toBe(1);
    expect(r.interval).toBe(4);
    expect(r.easeFactor).toBe(2.65);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 4 * DAY);
  });

  it('Again → repetition 0, interval 1, EF giảm còn 2.30', () => {
    const r = review({ interval: 15, repetition: 3, easeFactor: 2.5 }, 'again', NOW);
    expect(r.repetition).toBe(0);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(2.3);
  });

  it('nextEaseFactor: sàn 1.3 và Hard giảm còn 2.35', () => {
    expect(nextEaseFactor(1.3, 'again')).toBe(1.3);
    expect(nextEaseFactor(2.5, 'hard')).toBe(2.35);
  });

  it('formatIntervalLabel & previewIntervalLabel', () => {
    expect(formatIntervalLabel(1, true)).toBe('<10p');
    expect(formatIntervalLabel(4)).toBe('4 ngày');
    expect(previewIntervalLabel(fresh, 'easy')).toBe('4 ngày');
  });

  it('isDue: null → true, tương lai → false', () => {
    expect(isDue(null, NOW)).toBe(true);
    expect(isDue(new Date(NOW.getTime() + DAY), NOW)).toBe(false);
  });
});
