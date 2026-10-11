import { describe, expect, it } from 'vitest';
import type { LocalFolder } from '../../src/entities/folder';
import {
  compareFolders,
  findDuplicateSiblingIds,
  folderOptions,
  folderPath,
  isFolderNameTaken,
  normalizeFolderName,
} from '../../src/entities/folder/model/path';

function folder(partial: Partial<LocalFolder> & { id: string }): LocalFolder {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    parentId: partial.parentId ?? null,
    order: partial.order ?? null,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-01-01T00:00:00.000Z',
    deletedAt: partial.deletedAt ?? null,
  };
}

describe('folder/path · normalizeFolderName', () => {
  it('bỏ qua hoa/thường và gộp khoảng trắng (trim + nhiều dấu cách)', () => {
    expect(normalizeFolderName('Hán Tự')).toBe(normalizeFolderName('hán tự'));
    expect(normalizeFolderName('  Hán   Tự  ')).toBe('hán tự');
  });

  it('chuẩn hóa dấu Unicode (NFD về NFC) nhưng KHÔNG bóc dấu', () => {
    // 'á' tổ hợp (a + U+0301) === 'á' dựng sẵn (U+00E1)
    expect(normalizeFolderName('a\u0301nh')).toBe(normalizeFolderName('ánh'));
    // vẫn phân biệt có dấu với không dấu
    expect(normalizeFolderName('Hán')).not.toBe(normalizeFolderName('Han'));
  });
});

describe('folder/path · isFolderNameTaken', () => {
  const folders = [
    folder({ id: 'a', name: 'Hán Tự', parentId: null }),
    folder({ id: 'b', name: 'Hán Tự', parentId: 'p1' }),
    folder({ id: 'dead', name: 'Hán Tự', parentId: null, deletedAt: '2026-02-01T00:00:00.000Z' }),
  ];

  it('cùng parentId + tên chuẩn hóa trùng → true (bỏ qua hoa/thường)', () => {
    expect(isFolderNameTaken(folders, null, 'hán tự')).toBe(true);
    expect(isFolderNameTaken(folders, 'p1', 'HÁN TỰ')).toBe(true);
  });

  it('khác parentId → false', () => {
    expect(isFolderNameTaken(folders, 'other', 'Hán Tự')).toBe(false);
  });

  it('excludeId bỏ qua chính nó; thư mục đã xóa KHÔNG tính', () => {
    expect(isFolderNameTaken(folders, null, 'Hán Tự', 'a')).toBe(false);
  });

  it('tên rỗng → false', () => {
    expect(isFolderNameTaken(folders, null, '   ')).toBe(false);
  });
});

describe('folder/path · findDuplicateSiblingIds', () => {
  it('đánh dấu các anh em cùng cấp trùng tên; khác cha thì không', () => {
    const folders = [
      folder({ id: 'x1', name: 'Hán Tự', parentId: 'p' }),
      folder({ id: 'x2', name: 'hán  tự', parentId: 'p' }),
      folder({ id: 'y', name: 'Hán Tự', parentId: null }),
    ];
    const dupes = findDuplicateSiblingIds(folders);
    expect(dupes.has('x1')).toBe(true);
    expect(dupes.has('x2')).toBe(true);
    expect(dupes.has('y')).toBe(false);
  });

  it('bỏ qua thư mục đã xóa', () => {
    const folders = [
      folder({ id: 'live', name: 'A', parentId: 'p' }),
      folder({ id: 'gone', name: 'A', parentId: 'p', deletedAt: '2026-03-01T00:00:00.000Z' }),
    ];
    expect(findDuplicateSiblingIds(folders).size).toBe(0);
  });
});

describe('folder/path · compareFolders', () => {
  it('order tăng dần, null xuống cuối, rồi createdAt, rồi id', () => {
    const a = folder({ id: 'a', order: 1000 });
    const b = folder({ id: 'b', order: 2000 });
    const noOrder = folder({ id: 'z', order: null });
    expect(compareFolders(a, b)).toBeLessThan(0);
    expect(compareFolders(a, noOrder)).toBeLessThan(0);

    const early = folder({ id: 'e', order: 1000, createdAt: '2026-01-01T00:00:00.000Z' });
    const late = folder({ id: 'l', order: 1000, createdAt: '2026-05-01T00:00:00.000Z' });
    expect(compareFolders(early, late)).toBeLessThan(0);

    const i1 = folder({ id: 'id-1', order: 1000, createdAt: '2026-01-01T00:00:00.000Z' });
    const i2 = folder({ id: 'id-2', order: 1000, createdAt: '2026-01-01T00:00:00.000Z' });
    expect(compareFolders(i1, i2)).toBeLessThan(0);
    expect(compareFolders(i1, i1)).toBe(0);
  });
});

describe('folder/path · folderPath', () => {
  const folders = [
    folder({ id: 'r', name: 'Kanji N3' }),
    folder({ id: 'm', name: 'Ôn Thi', parentId: 'r' }),
    folder({ id: 'c', name: '01', parentId: 'm' }),
  ];

  it('ghép đường dẫn đầy đủ từ gốc', () => {
    expect(folderPath(folders, 'c')).toBe('Kanji N3 › Ôn Thi › 01');
  });

  it('id lạ → chuỗi rỗng; hỗ trợ dấu phân cách tùy chỉnh', () => {
    expect(folderPath(folders, 'không-có')).toBe('');
    expect(folderPath(folders, 'm', ' / ')).toBe('Kanji N3 / Ôn Thi');
  });

  it('chống vòng lặp cha–con (dữ liệu hỏng) mà không treo', () => {
    const cyclic = [
      folder({ id: 'x', parentId: 'y' }),
      folder({ id: 'y', parentId: 'x' }),
    ];
    expect(typeof folderPath(cyclic, 'x')).toBe('string');
  });
});

describe('folder/path · folderOptions', () => {
  it('thứ tự DFS (cha ngay trước con), nhãn là đường dẫn đầy đủ, depth đúng', () => {
    const folders = [
      folder({ id: 'r1', name: 'Kanji N3', order: 1000 }),
      folder({ id: 'c1', name: '01', parentId: 'r1', order: 1000 }),
      folder({ id: 'r2', name: 'Ôn Thi', order: 2000 }),
      folder({ id: 'c2', name: 'Hán Tự', parentId: 'r2', order: 1000 }),
    ];
    const options = folderOptions(folders);
    expect(options.map((o) => o.label)).toEqual([
      'Kanji N3',
      'Kanji N3 › 01',
      'Ôn Thi',
      'Ôn Thi › Hán Tự',
    ]);
    expect(options.map((o) => o.depth)).toEqual([0, 1, 0, 1]);
  });

  it('bỏ thư mục đã xóa', () => {
    const folders = [
      folder({ id: 'r', name: 'Sống', order: 1000 }),
      folder({ id: 'gone', name: 'Đã xóa', order: 2000, deletedAt: '2026-04-01T00:00:00.000Z' }),
    ];
    expect(folderOptions(folders).map((o) => o.id)).toEqual(['r']);
  });
});
