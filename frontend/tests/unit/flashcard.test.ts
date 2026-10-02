import { describe, expect, it, vi } from 'vitest';
import type { LocalVocabulary } from '../../src/entities/vocabulary';
import { buildQueue, summarize } from '../../src/features/flashcard/model/queue';
import {
  applyReview,
  persistReview,
} from '../../src/features/flashcard/model/review';

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
