import { describe, expect, it } from 'vitest';
import { assembleImportVocabularies } from '../../src/features/vocabulary/model/import/assemble';
import type { NormalizedImport } from '../../src/features/vocabulary/model/import';
import { newVocabId } from '../../src/shared/lib';

function rec(word: string, meaning: string): NormalizedImport {
  return {
    word,
    meaning,
    reading: null,
    sinoVietnamese: null,
    example: null,
    exampleMeaning: null,
    jlptLevel: null,
    note: null,
  };
}

const BASE = '2026-02-01T00:00:00.000Z';

describe('import/assemble assembleImportVocabularies', () => {
  it('id DUY NHẤT cho 5000 bản (dùng newVocabId thật)', () => {
    const records = Array.from({ length: 5000 }, (_, i) => rec(`từ${i}`, `nghĩa${i}`));
    const rows = assembleImportVocabularies(records, null, BASE, newVocabId);
    expect(rows).toHaveLength(5000);
    expect(new Set(rows.map((r) => r.id)).size).toBe(5000);
  });

  it('createdAt TĂNG DẦN theo thứ tự dòng; updatedAt = createdAt', () => {
    const rows = assembleImportVocabularies(
      [rec('a', 'A'), rec('b', 'B'), rec('c', 'C')],
      null,
      BASE,
      () => 'x',
    );
    const times = rows.map((r) => Date.parse(r.createdAt));
    expect(times[0]).toBeLessThan(times[1]);
    expect(times[1]).toBeLessThan(times[2]);
    expect(rows.every((r) => r.updatedAt === r.createdAt)).toBe(true);
  });

  it('folderId != null → gán 1 thư mục; null → không gán; srs* = null', () => {
    let n = 0;
    const makeId = (): string => `id-${(n += 1)}`;
    const inFolder = assembleImportVocabularies([rec('a', 'A')], 'f1', BASE, makeId);
    expect(inFolder[0].folderIds).toEqual(['f1']);

    const noFolder = assembleImportVocabularies([rec('a', 'A')], null, BASE, makeId);
    expect(noFolder[0].folderIds).toEqual([]);
    expect(noFolder[0].srsInterval).toBeNull();
    expect(noFolder[0].srsRepetition).toBeNull();
    expect(noFolder[0].srsEaseFactor).toBeNull();
    expect(noFolder[0].srsNextReview).toBeNull();
    expect(noFolder[0].deletedAt).toBeNull();
    expect(noFolder[0].tags).toEqual([]);
  });

  it('mảng folderIds RIÊNG cho từng bản (không dùng chung tham chiếu)', () => {
    const rows = assembleImportVocabularies(
      [rec('a', 'A'), rec('b', 'B')],
      'f1',
      BASE,
      () => Math.random().toString(),
    );
    expect(rows[0].folderIds).not.toBe(rows[1].folderIds);
  });
});
