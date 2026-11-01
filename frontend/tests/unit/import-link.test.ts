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

describe('import · buildPreview + assembleImportWrites (thẻ độc lập giữa các thư mục)', () => {
  it('xem trước phân loại: từ ở thư mục khác được coi là mới (new), từ cùng thư mục đích bị skip in-branch', () => {
    const { rows, summary } = buildPreview(parsed, { vocabs, folders, targetFolderId: 'Bai1' });
    expect(summary).toEqual({ total: 5, new: 2, link: 0, duplicate: 2, error: 1 });
    const byLine = Object.fromEntries(rows.map((r) => [r.line, r]));
    expect(byLine[2].status).toBe('new');
    expect(byLine[3].status).toBe('duplicate');
    expect(byLine[3].dupReason).toBe('in-branch');
    expect(byLine[4].status).toBe('new');
    expect(byLine[5].status).toBe('error');
    expect(byLine[6].status).toBe('duplicate');
    expect(byLine[6].dupReason).toBe('in-file');
  });

  it('dựng danh sách ghi: tạo 2 thẻ mới độc lập cho thư mục đích, không sửa từ thư mục khác', () => {
    const { rows: previews } = buildPreview(parsed, { vocabs, folders, targetFolderId: 'Bai1' });
    let n = 0;
    const plan = assembleImportWrites(previews, vocabs, 'Bai1', NOW, () => `new-${(n += 1)}`);

    expect(plan.added).toBe(2);
    expect(plan.linked).toBe(0);
    expect(plan.rows).toHaveLength(2);

    const freshTori = plan.rows.find((r) => r.word === '鳥');
    expect(freshTori?.folderIds).toEqual(['Bai1']);
    expect(freshTori?.srsInterval).toBeNull();

    const freshNeko = plan.rows.find((r) => r.word === '猫');
    expect(freshNeko?.id).toBe('new-1');
    expect(freshNeko?.folderIds).toEqual(['Bai1']);
    expect(freshNeko?.srsInterval).toBeNull();

    // Bản gốc v-neko ở Bai3 không bị ảnh hưởng
    expect(vocabs[0].folderIds).toEqual(['Bai3']);
    expect(vocabs[0].updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('assembleImportWrites vẫn hỗ trợ hàng có status link nếu có', () => {
    const customPreviews = [
      {
        line: 2,
        status: 'link' as const,
        warnings: [],
        record: { word: '猫', reading: 'ねこ', meaning: 'mèo', sinoVietnamese: null, example: null, exampleMeaning: null, jlptLevel: null, note: null },
        existingId: 'v-neko',
        existingPath: 'N4 › Bai3',
      },
    ];
    const plan = assembleImportWrites(customPreviews, vocabs, 'Bai1', NOW, () => 'new-1');
    expect(plan.linked).toBe(1);
    expect(plan.added).toBe(0);
    expect(plan.rows[0].folderIds).toEqual(['Bai3', 'Bai1']);
    const dirtyIds = selectDirty(plan.rows, SINCE).map((r) => r.id);
    expect(dirtyIds).toContain('v-neko');
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
