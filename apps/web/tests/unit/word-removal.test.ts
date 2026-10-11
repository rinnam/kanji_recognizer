import { describe, expect, it } from 'vitest';
import type { LocalVocabulary } from '../../src/entities/vocabulary';
import { planWordRemoval } from '../../src/features/vocabulary/model/word-removal';

const OLD = '2026-01-01T00:00:00.000Z';
const NOW = '2026-03-01T00:00:00.000Z';

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
    createdAt: partial.createdAt ?? OLD,
    updatedAt: partial.updatedAt ?? OLD,
    deletedAt: partial.deletedAt ?? null,
  };
}

// Phạm vi đang xem 'Ôn Thi' = { on, on-1 } (thư mục + con cháu). 'n3' nằm NGOÀI phạm vi.
const vocabs: LocalVocabulary[] = [
  vocab({ id: 'only', folderIds: ['on'] }), // chỉ thuộc thư mục đang xem → tombstone
  vocab({ id: 'both', folderIds: ['on', 'n3'] }), // còn N3 → giữ, chỉ gỡ 'on'
  vocab({ id: 'multi', folderIds: ['on', 'on-1'] }), // nhiều thư mục con cháu trong phạm vi → tombstone
  vocab({ id: 'mixed', folderIds: ['on', 'on-1', 'n3'] }), // gỡ hết id trong phạm vi, còn 'n3'
  vocab({ id: 'dead', folderIds: ['on'], deletedAt: OLD }), // đã xóa từ trước → bỏ qua
];
const scope = new Set(['on', 'on-1']);

describe('vocabulary/word-removal planWordRemoval', () => {
  it('phạm vi null (Tất cả / tìm kiếm toàn cục) → TOMBSTONE mọi từ được chọn', () => {
    const plan = planWordRemoval(vocabs, ['only', 'both', 'multi'], null, NOW);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.toTombstone.map((v) => v.id).sort()).toEqual(['both', 'multi', 'only']);
    expect(plan.counts).toEqual({ detached: 0, deleted: 3 });
    expect(plan.toTombstone.every((v) => v.deletedAt === NOW && v.updatedAt === NOW)).toBe(true);
  });

  it('từ chỉ thuộc thư mục đang xem → TOMBSTONE (deletedAt=updatedAt=now)', () => {
    const plan = planWordRemoval(vocabs, ['only'], scope, NOW);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.counts).toEqual({ detached: 0, deleted: 1 });
    const dead = plan.toTombstone.find((v) => v.id === 'only');
    expect(dead?.deletedAt).toBe(NOW);
    expect(dead?.updatedAt).toBe(NOW);
    expect(dead?.folderIds).toEqual([]);
  });

  it('từ thuộc 2 thư mục (một trong phạm vi) → GIỮ, chỉ gỡ liên kết trong phạm vi', () => {
    const plan = planWordRemoval(vocabs, ['both'], scope, NOW);
    expect(plan.toTombstone).toHaveLength(0);
    expect(plan.counts).toEqual({ detached: 1, deleted: 0 });
    const kept = plan.toUpdate.find((v) => v.id === 'both');
    expect(kept?.deletedAt).toBeNull();
    expect(kept?.folderIds).toEqual(['n3']);
    expect(kept?.updatedAt).toBe(NOW);
  });

  it('từ ở nhiều thư mục con cháu CÙNG phạm vi → gỡ hết id trong phạm vi, hết thư mục → tombstone', () => {
    const plan = planWordRemoval(vocabs, ['multi'], scope, NOW);
    expect(plan.toUpdate).toHaveLength(0);
    const dead = plan.toTombstone.find((v) => v.id === 'multi');
    expect(dead?.folderIds).toEqual([]);
    expect(dead?.deletedAt).toBe(NOW);
  });

  it('gỡ hết id trong phạm vi nhưng CÒN thư mục ngoài phạm vi → GIỮ', () => {
    const plan = planWordRemoval(vocabs, ['mixed'], scope, NOW);
    expect(plan.toTombstone).toHaveLength(0);
    expect(plan.toUpdate.find((v) => v.id === 'mixed')?.folderIds).toEqual(['n3']);
  });

  it('counts đúng; từ đã xóa trước / id lạ bị bỏ qua, không đụng tới', () => {
    const plan = planWordRemoval(
      vocabs,
      ['only', 'both', 'multi', 'mixed', 'dead', 'ghost'],
      scope,
      NOW,
    );
    expect(plan.counts).toEqual({ detached: 2, deleted: 2 });
    const touched = new Set([...plan.toUpdate, ...plan.toTombstone].map((v) => v.id));
    expect(touched.has('dead')).toBe(false);
    expect(touched.has('ghost')).toBe(false);
  });

  it('không đột biến bản ghi gốc (trả về bản sao)', () => {
    const plan = planWordRemoval(vocabs, ['both'], scope, NOW);
    const original = vocabs.find((v) => v.id === 'both');
    expect(plan.toUpdate.find((v) => v.id === 'both')).not.toBe(original);
    expect(original?.folderIds).toEqual(['on', 'n3']);
    expect(original?.updatedAt).toBe(OLD);
  });
});
