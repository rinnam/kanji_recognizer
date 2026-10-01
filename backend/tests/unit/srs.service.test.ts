import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  isDue,
  nextEaseFactor,
  ratingToQuality,
  review,
  type SrsState,
} from '../../src/services/srs.service.js';

/**
 * Unit test THUẦN cho SM-2 (docs/reference/kotobase-feature-audit.md §2).
 * KHÔNG cần DB/mạng, tất định (now cố định).
 */

const NOW = new Date('2026-10-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const fresh: SrsState = { interval: null, repetition: null, easeFactor: null };

describe('ratingToQuality (thang điểm đã chốt)', () => {
  it('Again/Hard/Good/Easy → 0/3/4/5', () => {
    expect(ratingToQuality('again')).toBe(0);
    expect(ratingToQuality('hard')).toBe(3);
    expect(ratingToQuality('good')).toBe(4);
    expect(ratingToQuality('easy')).toBe(5);
  });
});

describe('nextEaseFactor — áp cho mọi rating, sàn 1.3', () => {
  it('Good (q=4) giữ nguyên EF', () => {
    expect(nextEaseFactor(2.5, 4)).toBe(2.5);
  });
  it('Easy (q=5) tăng EF 0.1', () => {
    expect(nextEaseFactor(2.5, 5)).toBe(2.6);
  });
  it('Hard (q=3) giảm EF 0.14', () => {
    expect(nextEaseFactor(2.5, 3)).toBe(2.36);
  });
  it('Again (q=0) giảm EF 0.8', () => {
    expect(nextEaseFactor(2.5, 0)).toBe(1.7);
  });
  it('không bao giờ xuống dưới sàn 1.3', () => {
    expect(nextEaseFactor(1.3, 0)).toBe(MIN_EASE_FACTOR);
    expect(nextEaseFactor(1.4, 0)).toBe(1.3);
  });
});

describe('review — tiến trình interval khi nhớ (q>=3)', () => {
  it('lần nhớ 1 → interval 1 ngày, repetition 1, EF mặc định', () => {
    const r = review(fresh, 'good', NOW);
    expect(r.repetition).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(DEFAULT_EASE_FACTOR);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 1 * DAY);
  });
  it('lần nhớ 2 → interval 6 ngày', () => {
    const r = review({ interval: 1, repetition: 1, easeFactor: 2.5 }, 'good', NOW);
    expect(r.repetition).toBe(2);
    expect(r.interval).toBe(6);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 6 * DAY);
  });
  it('lần nhớ >2 → round(interval_trước × EF\')', () => {
    const r = review({ interval: 6, repetition: 2, easeFactor: 2.5 }, 'good', NOW);
    expect(r.repetition).toBe(3);
    expect(r.interval).toBe(15); // round(6 * 2.5)
  });
  it('Easy ở lần nhớ >2 dùng EF\' mới (2.6) để nhân', () => {
    const r = review({ interval: 6, repetition: 2, easeFactor: 2.5 }, 'easy', NOW);
    expect(r.easeFactor).toBe(2.6);
    expect(r.interval).toBe(16); // round(6 * 2.6) = round(15.6) = 16
  });
});

describe('review — quên (q<3) reset', () => {
  it('Again → repetition 0, interval 1, vẫn áp EF\'', () => {
    const r = review({ interval: 15, repetition: 3, easeFactor: 2.5 }, 'again', NOW);
    expect(r.repetition).toBe(0);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(1.7); // 2.5 - 0.8
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 1 * DAY);
  });
});

describe('isDue (hàng đợi ôn)', () => {
  it('chưa có lịch (null) → tới hạn', () => {
    expect(isDue(null, NOW)).toBe(true);
  });
  it('nextReview quá khứ → tới hạn', () => {
    expect(isDue(new Date(NOW.getTime() - DAY), NOW)).toBe(true);
  });
  it('nextReview tương lai → chưa tới hạn', () => {
    expect(isDue(new Date(NOW.getTime() + DAY), NOW)).toBe(false);
  });
  it('nextReview == now → tới hạn', () => {
    expect(isDue(new Date(NOW), NOW)).toBe(true);
  });
});
