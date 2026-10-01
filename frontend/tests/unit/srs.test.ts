import { describe, expect, it } from 'vitest';
import { isDue, nextEaseFactor, review, type SrsState } from '../../src/entities/card';

/**
 * SM-2 phía client phải KHỚP backend/src/services/srs.service.ts.
 * (now cố định để tất định.)
 */
const NOW = new Date('2026-10-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const fresh: SrsState = { interval: null, repetition: null, easeFactor: null };

describe('card SM-2 (mirror backend srs.service)', () => {
  it('Good lần đầu → interval 1, repetition 1, EF mặc định 2.5', () => {
    const r = review(fresh, 'good', NOW);
    expect(r.repetition).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(2.5);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + DAY);
  });

  it('Again → repetition 0, interval 1, EF giảm còn 1.7', () => {
    const r = review({ interval: 15, repetition: 3, easeFactor: 2.5 }, 'again', NOW);
    expect(r.repetition).toBe(0);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(1.7);
  });

  it('nextEaseFactor: sàn 1.3 và Hard (q=3) giảm còn 2.36', () => {
    expect(nextEaseFactor(1.3, 0)).toBe(1.3);
    expect(nextEaseFactor(2.5, 3)).toBe(2.36);
  });

  it('isDue: null → true, tương lai → false', () => {
    expect(isDue(null, NOW)).toBe(true);
    expect(isDue(new Date(NOW.getTime() + DAY), NOW)).toBe(false);
  });
});
