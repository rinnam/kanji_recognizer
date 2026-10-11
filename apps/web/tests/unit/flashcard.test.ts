import { describe, expect, it, vi } from 'vitest';
import type { LocalVocabulary } from '../../src/entities/vocabulary';
import {
  buildQueue,
  buildReviewAheadQueue,
  nextDueAt,
  summarize,
} from '../../src/features/flashcard/model/queue';
import {
  applyReview,
  persistReview,
} from '../../src/features/flashcard/model/review';
import {
  resetSrsProgress,
  selectResetTargets,
} from '../../src/features/flashcard/model/reset';

function vocab(partial: Partial<LocalVocabulary> & { id: string }): LocalVocabulary {
  return {
    id: partial.id,
    word: partial.word ?? partial.id,
    meaning: partial.meaning ?? 'nghĩa',
    reading: partial.reading ?? null,
    sinoVietnamese: partial.sinoVietnamese ?? null,
    example: partial.example ?? null,
    exampleMeaning: partial.exampleMeaning ?? null,
    note: partial.note ?? null,
    tags: partial.tags ?? [],
    jlptLevel: partial.jlptLevel ?? null,
    srsInterval: partial.srsInterval ?? null,
    srsRepetition: partial.srsRepetition ?? null,
    srsEaseFactor: partial.srsEaseFactor ?? null,
    srsNextReview: partial.srsNextReview ?? null,
    folderIds: partial.folderIds ?? [],
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-01-01T00:00:00.000Z',
    deletedAt: partial.deletedAt ?? null,
  };
}

const NOW = new Date('2026-03-01T00:00:00.000Z');

describe('flashcard/queue buildQueue', () => {
  const list = [
    vocab({ id: 'new1', createdAt: '2026-01-02T00:00:00.000Z' }), // thẻ mới (null)
    vocab({
      id: 'overdue',
      createdAt: '2026-01-01T00:00:00.000Z',
      srsNextReview: '2026-02-01T00:00:00.000Z', // đã quá hạn
      srsRepetition: 3,
    }),
    vocab({
      id: 'future',
      createdAt: '2026-01-03T00:00:00.000Z',
      srsNextReview: '2026-12-01T00:00:00.000Z', // chưa tới hạn
      srsRepetition: 2,
    }),
    vocab({ id: 'dead', deletedAt: '2026-02-01T00:00:00.000Z' }),
  ];

  it('normal: tất cả thẻ sống, cũ → mới, bỏ tombstone', () => {
    const ids = buildQueue(list, 'normal', NOW).map((v) => v.id);
    expect(ids).toEqual(['overdue', 'new1', 'future']);
  });

  it('anki: chỉ thẻ tới hạn (mới + quá hạn), thẻ mới trước; loại thẻ tương lai', () => {
    const ids = buildQueue(list, 'anki', NOW).map((v) => v.id);
    expect(ids).toEqual(['new1', 'overdue']);
  });

  it('progress: ít tiến độ nhất trước (repetition asc)', () => {
    const ids = buildQueue(list, 'progress', NOW).map((v) => v.id);
    expect(ids).toEqual(['new1', 'future', 'overdue']);
  });
});

describe('flashcard/queue summarize', () => {
  it('đếm tổng/tới hạn/mới/đã học trên thẻ sống', () => {
    const list = [
      vocab({ id: 'a' }), // mới + tới hạn
      vocab({ id: 'b', srsRepetition: 2, srsNextReview: '2026-12-01T00:00:00.000Z' }), // đã học, chưa tới hạn
      vocab({ id: 'c', deletedAt: '2026-02-01T00:00:00.000Z' }), // bỏ
    ];
    expect(summarize(list, NOW)).toEqual({ total: 2, due: 1, fresh: 1, learned: 1 });
  });
});

describe('flashcard/review applyReview', () => {
  it('cập nhật srs* theo SM-2 VÀ updatedAt = now (bất biến quan trọng)', () => {
    const card = vocab({ id: 'x', updatedAt: '2026-01-01T00:00:00.000Z' });
    const next = applyReview(card, 'good', NOW);

    // Lần ôn đầu "good": repetition 1, interval 1 ngày, EF mặc định giữ 2.5.
    expect(next.srsRepetition).toBe(1);
    expect(next.srsInterval).toBe(1);
    expect(next.srsEaseFactor).toBe(2.5);
    expect(next.srsNextReview).toBe('2026-03-02T00:00:00.000Z');
    // updatedAt PHẢI đổi sang now, nếu không sync sẽ không đẩy tiến độ.
    expect(next.updatedAt).toBe(NOW.toISOString());
    expect(next.updatedAt).not.toBe(card.updatedAt);
    // không đụng các field khác
    expect(next.id).toBe('x');
    expect(next.word).toBe(card.word);
  });

  it('again (q<3): repetition reset 0, interval 1', () => {
    const card = vocab({ id: 'y', srsRepetition: 5, srsInterval: 40, srsEaseFactor: 2.5 });
    const next = applyReview(card, 'again', NOW);
    expect(next.srsRepetition).toBe(0);
    expect(next.srsInterval).toBe(1);
    expect(next.updatedAt).toBe(NOW.toISOString());
  });
});

describe('flashcard/review persistReview', () => {
  it('ghi local TRƯỚC rồi emit change-bus (đẩy tiến độ lên sync)', async () => {
    const calls: string[] = [];
    const put = vi.fn(async (value: LocalVocabulary): Promise<void> => {
      calls.push(`put:${value.updatedAt}`);
    });
    const emit = vi.fn((): void => {
      calls.push('emit');
    });

    const card = vocab({ id: 'z' });
    const next = await persistReview({ put, emit }, card, 'good', NOW);

    expect(put).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    // bản ghi được ghi phải là bản đã cập nhật updatedAt = now
    expect(put).toHaveBeenCalledWith(next);
    expect(next.updatedAt).toBe(NOW.toISOString());
    // thứ tự: put xong mới emit
    expect(calls).toEqual([`put:${NOW.toISOString()}`, 'emit']);
  });
});

describe('flashcard/queue anki hết thẻ (tái hiện "Anki không chạy")', () => {
  it('2 thẻ đã chấm (Again + Good) có lịch tương lai → buildQueue(anki) rỗng, tới hạn = 0', () => {
    const list = [
      // Again: repetition reset 0 nhưng ĐÃ có lịch (mai) → chưa tới hạn hôm nay.
      vocab({
        id: 'again',
        srsRepetition: 0,
        srsInterval: 1,
        srsEaseFactor: 2.5,
        srsNextReview: '2026-03-02T00:00:00.000Z',
      }),
      // Good: có lịch xa hơn.
      vocab({
        id: 'good',
        srsRepetition: 1,
        srsInterval: 1,
        srsEaseFactor: 2.5,
        srsNextReview: '2026-04-01T00:00:00.000Z',
      }),
    ];
    expect(buildQueue(list, 'anki', NOW)).toEqual([]);
    expect(summarize(list, NOW).due).toBe(0);
  });
});

describe('flashcard/queue summarize — "Mới" chỉ tính srsNextReview null', () => {
  it('thẻ Again (repetition 0 nhưng có lịch) KHÔNG phải Mới; giữ bất biến', () => {
    const list = [
      vocab({ id: 'new', createdAt: '2026-01-01T00:00:00.000Z' }), // mới (null) + tới hạn
      vocab({ id: 'again', srsRepetition: 0, srsNextReview: '2026-02-01T00:00:00.000Z' }), // đã có lịch (quá hạn)
    ];
    const s = summarize(list, NOW);
    expect(s).toEqual({ total: 2, due: 2, fresh: 1, learned: 1 });
    // Bất biến: Tới hạn >= Mới; Tổng = chưa học + đã có lịch.
    expect(s.due).toBeGreaterThanOrEqual(s.fresh);
    expect(s.total).toBe(s.fresh + s.learned);
  });
});

describe('flashcard/queue buildReviewAheadQueue', () => {
  it('chỉ thẻ CHƯA tới hạn, sắp theo srsNextReview tăng dần; loại mới/quá hạn/tombstone', () => {
    const list = [
      vocab({ id: 'new' }), // mới (null) → không thuộc "trước hạn"
      vocab({ id: 'overdue', srsNextReview: '2026-02-01T00:00:00.000Z' }), // quá hạn → thuộc anki
      vocab({ id: 'soon', srsNextReview: '2026-03-05T00:00:00.000Z' }),
      vocab({ id: 'later', srsNextReview: '2026-06-01T00:00:00.000Z' }),
      vocab({
        id: 'dead',
        srsNextReview: '2026-03-04T00:00:00.000Z',
        deletedAt: '2026-02-01T00:00:00.000Z',
      }),
    ];
    expect(buildReviewAheadQueue(list, NOW).map((v) => v.id)).toEqual(['soon', 'later']);
  });
});

describe('flashcard/queue nextDueAt', () => {
  it('trả mốc tới hạn SỚM NHẤT trong các thẻ chưa tới hạn', () => {
    const list = [
      vocab({ id: 'new' }),
      vocab({ id: 'overdue', srsNextReview: '2026-02-01T00:00:00.000Z' }),
      vocab({ id: 'soon', srsNextReview: '2026-03-05T00:00:00.000Z' }),
      vocab({ id: 'later', srsNextReview: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(nextDueAt(list, NOW)).toBe('2026-03-05T00:00:00.000Z');
  });

  it('không có thẻ nào chờ tới hạn → null', () => {
    expect(nextDueAt([vocab({ id: 'new' })], NOW)).toBeNull();
  });
});

describe('flashcard/reset resetSrsProgress + selectResetTargets', () => {
  it('resetSrsProgress: null hoá srs* + updatedAt = now, giữ nguyên field khác', () => {
    const card = vocab({
      id: 'r',
      word: 'kanji',
      srsInterval: 10,
      srsRepetition: 3,
      srsEaseFactor: 2.6,
      srsNextReview: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const next = resetSrsProgress(card, NOW);
    expect(next.srsInterval).toBeNull();
    expect(next.srsRepetition).toBeNull();
    expect(next.srsEaseFactor).toBeNull();
    expect(next.srsNextReview).toBeNull();
    expect(next.updatedAt).toBe(NOW.toISOString());
    expect(next.updatedAt).not.toBe(card.updatedAt);
    expect(next.word).toBe('kanji');
    expect(next.id).toBe('r');
  });

  it('selectResetTargets: chỉ thẻ còn sống & đang có tiến độ (bỏ thẻ mới & tombstone)', () => {
    const list = [
      vocab({ id: 'new' }), // chưa học → bỏ
      vocab({ id: 'sched', srsNextReview: '2026-02-01T00:00:00.000Z' }), // có lịch → chọn
      vocab({
        id: 'dead',
        srsRepetition: 2,
        srsNextReview: '2026-02-01T00:00:00.000Z',
        deletedAt: '2026-02-02T00:00:00.000Z',
      }), // tombstone → bỏ
    ];
    expect(selectResetTargets(list).map((v) => v.id)).toEqual(['sched']);
  });
});
