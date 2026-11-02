import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  formatIntervalLabel,
  isDue,
  nextEaseFactor,
  previewIntervalLabel,
  ratingToQuality,
  review,
  type SrsState,
} from '../../src/services/srs.service.js';

/**
 * Unit test THUẦN cho Anki SM-2.
 * KHÔNG cần DB/mạng, tất định (now cố định).
 */

const NOW = new Date('2026-10-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const fresh: SrsState = { interval: null, repetition: null, easeFactor: null };

describe('ratingToQuality (thang điểm tương thích)', () => {
  it('Again/Hard/Good/Easy → 0/3/4/5', () => {
    expect(ratingToQuality('again')).toBe(0);
    expect(ratingToQuality('hard')).toBe(3);
    expect(ratingToQuality('good')).toBe(4);
    expect(ratingToQuality('easy')).toBe(5);
  });
});

describe('nextEaseFactor — chuẩn Anki (Again -0.2, Hard -0.15, Good 0, Easy +0.15)', () => {
  it('Good giữ nguyên EF', () => {
    expect(nextEaseFactor(2.5, 'good')).toBe(2.5);
    expect(nextEaseFactor(2.5, 4)).toBe(2.5);
  });
  it('Easy tăng EF 0.15', () => {
    expect(nextEaseFactor(2.5, 'easy')).toBe(2.65);
    expect(nextEaseFactor(2.5, 5)).toBe(2.65);
  });
  it('Hard giảm EF 0.15', () => {
    expect(nextEaseFactor(2.5, 'hard')).toBe(2.35);
    expect(nextEaseFactor(2.5, 3)).toBe(2.35);
  });
  it('Again giảm EF 0.20', () => {
    expect(nextEaseFactor(2.5, 'again')).toBe(2.3);
    expect(nextEaseFactor(2.5, 0)).toBe(2.3);
  });
  it('không bao giờ xuống dưới sàn 1.3', () => {
    expect(nextEaseFactor(1.3, 'again')).toBe(MIN_EASE_FACTOR);
    expect(nextEaseFactor(1.4, 'again')).toBe(1.3);
  });
});

describe('review — thẻ mới (lần nhớ 1)', () => {
  it('Good thẻ mới → interval 1 ngày, repetition 1, EF giữ nguyên', () => {
    const r = review(fresh, 'good', NOW);
    expect(r.repetition).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(DEFAULT_EASE_FACTOR);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 1 * DAY);
  });
  it('Hard thẻ mới → interval 1 ngày, repetition 1, EF giảm 0.15', () => {
    const r = review(fresh, 'hard', NOW);
    expect(r.repetition).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(2.35);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 1 * DAY);
  });
  it('Easy thẻ mới → interval 4 ngày (chuẩn Anki), repetition 1, EF tăng 0.15', () => {
    const r = review(fresh, 'easy', NOW);
    expect(r.repetition).toBe(1);
    expect(r.interval).toBe(4);
    expect(r.easeFactor).toBe(2.65);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 4 * DAY);
  });
});

describe('review — thẻ lần 2', () => {
  it('Hard thẻ lần 2 → interval 3 ngày, repetition 2, EF giảm 0.15', () => {
    const r = review({ interval: 1, repetition: 1, easeFactor: 2.5 }, 'hard', NOW);
    expect(r.repetition).toBe(2);
    expect(r.interval).toBe(3);
    expect(r.easeFactor).toBe(2.35);
  });
  it('Good thẻ lần 2 → interval 6 ngày, repetition 2, EF giữ nguyên', () => {
    const r = review({ interval: 1, repetition: 1, easeFactor: 2.5 }, 'good', NOW);
    expect(r.repetition).toBe(2);
    expect(r.interval).toBe(6);
    expect(r.easeFactor).toBe(2.5);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 6 * DAY);
  });
  it('Easy thẻ lần 2 → interval 8 ngày, repetition 2, EF tăng 0.15', () => {
    const r = review({ interval: 1, repetition: 1, easeFactor: 2.5 }, 'easy', NOW);
    expect(r.repetition).toBe(2);
    expect(r.interval).toBe(8);
    expect(r.easeFactor).toBe(2.65);
  });
});

describe('review — thẻ ôn tập (repetition >= 2)', () => {
  it('Hard → interval = max(prev+1, round(prev * 1.2)), EF giảm 0.15', () => {
    const r = review({ interval: 6, repetition: 2, easeFactor: 2.5 }, 'hard', NOW);
    expect(r.repetition).toBe(3);
    expect(r.interval).toBe(7); // round(6 * 1.2) = 7
    expect(r.easeFactor).toBe(2.35);
  });
  it('Good → round(interval_trước × EF), EF giữ nguyên', () => {
    const r = review({ interval: 6, repetition: 2, easeFactor: 2.5 }, 'good', NOW);
    expect(r.repetition).toBe(3);
    expect(r.interval).toBe(15); // round(6 * 2.5) = 15
    expect(r.easeFactor).toBe(2.5);
  });
  it('Easy → round(interval_trước × EF × 1.3), EF tăng 0.15', () => {
    const r = review({ interval: 6, repetition: 2, easeFactor: 2.5 }, 'easy', NOW);
    expect(r.repetition).toBe(3);
    expect(r.interval).toBe(20); // round(6 * 2.5 * 1.3) = round(19.5) = 20
    expect(r.easeFactor).toBe(2.65);
  });
});

describe('review — quên (Again) reset', () => {
  it('Again → repetition 0, interval 1, EF giảm 0.20', () => {
    const r = review({ interval: 15, repetition: 3, easeFactor: 2.5 }, 'again', NOW);
    expect(r.repetition).toBe(0);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(2.3);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 1 * DAY);
  });
});

describe('formatIntervalLabel & previewIntervalLabel', () => {
  it('định dạng nhãn ngày và tháng chính xác', () => {
    expect(formatIntervalLabel(1)).toBe('1 ngày');
    expect(formatIntervalLabel(4)).toBe('4 ngày');
    expect(formatIntervalLabel(60)).toBe('2 tháng');
    expect(formatIntervalLabel(1, true)).toBe('<10p');
  });
  it('dự báo nhãn cho thẻ', () => {
    expect(previewIntervalLabel(fresh, 'again', true)).toBe('<10p');
    expect(previewIntervalLabel(fresh, 'easy')).toBe('4 ngày');
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
