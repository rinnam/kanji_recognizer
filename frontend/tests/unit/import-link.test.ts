import { describe, expect, it } from 'vitest';
import type { LocalFolder } from '../../src/entities/folder';
import type { LocalVocabulary } from '../../src/entities/vocabulary';
import {
  assembleImportWrites,
  buildPreview,
  type ParsedRow,
} from '../../src/features/vocabulary/model/import';
import { selectDirty } from '../../src/features/sync/model/engine';

const SINCE = '2026-05-01T00:00:00.000Z';
const NOW = '2026-09-09T00:00:00.000Z';

function folder(id: string, parentId: string | null): LocalFolder {
  return {
    id,
    name: id,
    parentId,
    order: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

function vocab(id: string, word: string, reading: string | null, folderIds: string[]): LocalVocabulary {
  return {
    id,
    word,
    meaning: 'nghĩa',
    reading,
    sinoVietnamese: null,
    example: null,
    exampleMeaning: null,
    note: null,
    tags: [],
    jlptLevel: null,
    srsInterval: 4,
    srsRepetition: 2,
    srsEaseFactor: 2.5,
    srsNextReview: '2026-06-01T00:00:00.000Z',
    folderIds,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

function parsedRow(line: number, word: string, reading: string, meaning = 'nghĩa'): ParsedRow {
  return {
    line,
    word,
    reading,
    sinoVietnamese: '',
    meaning,
    example: '',
    exampleMeaning: '',
    jlpt: '',
    note: '',
  };
}

// Cây: N3 > Bai1 (đích); N4 > Bai3 (nhánh khác).
const folders: LocalFolder[] = [
  folder('N3', null),
  folder('Bai1', 'N3'),
  folder('N4', null),
  folder('Bai3', 'N4'),
];
// 猫 ở nhánh khác (N4) → gắn; 犬 trong đúng nhánh đích (N3) → bỏ qua.
const vocabs: LocalVocabulary[] = [
  vocab('v-neko', '猫', 'ねこ', ['Bai3']),
  vocab('v-inu', '犬', 'いぬ', ['Bai1']),
];

// Dòng nhập: gắn / in-branch / mới / lỗi / trùng-trong-file.
const parsed: ParsedRow[] = [
  parsedRow(2, '猫', 'ねこ'),
  parsedRow(3, '犬', 'いぬ'),
  parsedRow(4, '鳥', 'とり'),
  parsedRow(5, '', 'x'),
  parsedRow(6, '猫', 'ねこ'),
];

describe('import 7C · buildPreview + assembleImportWrites (có thư mục đích)', () => {
  it('xem trước phân loại đúng new/link/skip theo nhánh của thư mục đích', () => {
    const { rows, summary } = buildPreview(parsed, { vocabs, folders, targetFolderId: 'Bai1' });
    expect(summary).toEqual({ total: 5, new: 1, link: 1, duplicate: 2, error: 1 });
    const byLine = Object.fromEntries(rows.map((r) => [r.line, r]));
    expect(byLine[2].status).toBe('link');
    expect(byLine[2].existingId).toBe('v-neko');
    expect(byLine[2].existingPath).toBe('N4 › Bai3');
    expect(byLine[3].status).toBe('duplicate');
    expect(byLine[3].dupReason).toBe('in-branch');
    expect(byLine[4].status).toBe('new');
    expect(byLine[5].status).toBe('error');
    expect(byLine[6].status).toBe('duplicate');
    expect(byLine[6].dupReason).toBe('in-file');
  });

  it('dựng danh sách ghi hỗn hợp: 1 mới + 1 gắn; folderIds hợp không trùng; không đụng SRS', () => {
    const { rows: previews } = buildPreview(parsed, { vocabs, folders, targetFolderId: 'Bai1' });
    let n = 0;
    const plan = assembleImportWrites(previews, vocabs, 'Bai1', NOW, () => `new-${(n += 1)}`);

    expect(plan.added).toBe(1);
    expect(plan.linked).toBe(1);
    expect(plan.rows).toHaveLength(2);

    const fresh = plan.rows.find((r) => r.word === '鳥');
    expect(fresh?.folderIds).toEqual(['Bai1']);
    expect(fresh?.srsInterval).toBeNull();

    const linked = plan.rows.find((r) => r.id === 'v-neko');
    expect(linked?.folderIds).toEqual(['Bai3', 'Bai1']); // hợp, KHÔNG trùng
    expect(linked?.updatedAt).toBe(NOW);
    // Giữ nguyên SRS + không sửa đối tượng gốc trong `vocabs`.
    expect(linked?.srsInterval).toBe(4);
    expect(linked?.srsNextReview).toBe('2026-06-01T00:00:00.000Z');
    expect(vocabs[0].folderIds).toEqual(['Bai3']);
    expect(vocabs[0].updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('selectDirty chọn được từ gắn (updatedAt = now > con trỏ đẩy)', () => {
    const { rows: previews } = buildPreview(parsed, { vocabs, folders, targetFolderId: 'Bai1' });
    const plan = assembleImportWrites(previews, vocabs, 'Bai1', NOW, () => 'new-1');
    const dirtyIds = selectDirty(plan.rows, SINCE).map((r) => r.id);
    expect(dirtyIds).toContain('v-neko');
    expect(dirtyIds).toHaveLength(2); // cả từ mới lẫn từ gắn đều "bẩn"
  });
});

describe('import 7C · chưa chọn thư mục đích (null)', () => {
  it("từ đã có → 'Trùng (exists)', không có 'Gắn'; chỉ ghi từ mới", () => {
    const { rows: previews, summary } = buildPreview(parsed, {
      vocabs,
      folders,
      targetFolderId: null,
    });
    expect(summary.link).toBe(0);
    expect(summary.new).toBe(1);
    const byLine = Object.fromEntries(previews.map((r) => [r.line, r]));
    expect(byLine[2].status).toBe('duplicate');
    expect(byLine[2].dupReason).toBe('exists');

    const plan = assembleImportWrites(previews, vocabs, null, NOW, () => 'new-1');
    expect(plan.linked).toBe(0);
    expect(plan.added).toBe(1);
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].folderIds).toEqual([]);
  });
});
