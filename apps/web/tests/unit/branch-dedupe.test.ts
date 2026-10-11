import { describe, expect, it } from 'vitest';
import type { LocalFolder } from '../../src/entities/folder';
import type { LocalVocabulary } from '../../src/entities/vocabulary';
import { classifyIncoming, linkVocabulary } from '../../src/features/vocabulary/model/branch-dedupe';
import { dedupeKey } from '../../src/features/vocabulary/model/dedupe';

function folder(id: string, parentId: string | null, deleted = false): LocalFolder {
  return {
    id,
    name: id,
    parentId,
    order: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: deleted ? '2026-02-01T00:00:00.000Z' : null,
  };
}

function word(
  id: string,
  text: string,
  folderIds: string[],
  opts: { reading?: string | null; deleted?: boolean } = {},
): LocalVocabulary {
  return {
    id,
    word: text,
    meaning: 'nghĩa',
    reading: opts.reading ?? null,
    sinoVietnamese: null,
    example: null,
    exampleMeaning: null,
    note: null,
    tags: [],
    jlptLevel: null,
    srsInterval: 3,
    srsRepetition: 2,
    srsEaseFactor: 2.5,
    srsNextReview: '2026-03-01T00:00:00.000Z',
    folderIds,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: opts.deleted ? '2026-02-01T00:00:00.000Z' : null,
  };
}

// Cây: N3 > { Bai1 > Bai1a, Bai2, Del(đã xóa) }, N4 > Bai3 (nhánh khác)
const folders: LocalFolder[] = [
  folder('N3', null),
  folder('Bai1', 'N3'),
  folder('Bai1a', 'Bai1'),
  folder('Bai2', 'N3'),
  folder('N4', null),
  folder('Bai3', 'N4'),
  folder('Del', 'N3', true),
];

describe('features/vocabulary/branch-dedupe · classifyIncoming', () => {
  it('không có từ trùng khóa → new', () => {
    const vocabs = [word('v1', '猫', ['Bai1'])];
    expect(classifyIncoming({ incoming: { word: '犬', reading: null }, targetFolderId: 'Bai1', vocabs, folders })).toEqual({
      kind: 'new',
    });
  });

  it('từ đã có ở NHÁNH KHÁC → link (kèm đường dẫn hiện tại)', () => {
    const vocabs = [word('v1', '猫', ['Bai3'])];
    expect(classifyIncoming({ incoming: { word: '猫', reading: null }, targetFolderId: 'Bai1', vocabs, folders })).toEqual({
      kind: 'link',
      existingId: 'v1',
      existingPath: 'N4 › Bai3',
    });
  });

  it('từ đã có nhưng CHƯA gán thư mục → link', () => {
    const vocabs = [word('v1', '猫', [])];
    expect(classifyIncoming({ incoming: { word: '猫', reading: null }, targetFolderId: 'Bai1', vocabs, folders })).toEqual({
      kind: 'link',
      existingId: 'v1',
      existingPath: 'Chưa gán thư mục',
    });
  });

  it('từ trong ĐÚNG thư mục đích → skip in-branch', () => {
    const vocabs = [word('v1', '猫', ['Bai1'])];
    expect(classifyIncoming({ incoming: { word: '猫', reading: null }, targetFolderId: 'Bai1', vocabs, folders })).toEqual({
      kind: 'skip',
      reason: 'in-branch',
      existingPath: 'N3 › Bai1',
    });
  });

  it('từ ở thư mục anh em cùng cha (cùng nhánh) → skip in-branch', () => {
    const vocabs = [word('v1', '猫', ['Bai2'])];
    expect(classifyIncoming({ incoming: { word: '猫', reading: null }, targetFolderId: 'Bai1', vocabs, folders })).toEqual({
      kind: 'skip',
      reason: 'in-branch',
      existingPath: 'N3 › Bai2',
    });
  });

  it('thư mục đích lồng sâu vẫn tìm đúng gốc → skip in-branch', () => {
    const vocabs = [word('v1', '猫', ['Bai2'])];
    expect(classifyIncoming({ incoming: { word: '猫', reading: null }, targetFolderId: 'Bai1a', vocabs, folders })).toEqual({
      kind: 'skip',
      reason: 'in-branch',
      existingPath: 'N3 › Bai2',
    });
  });

  it('chưa chọn thư mục (null) + từ đã có → skip exists', () => {
    const vocabs = [word('v1', '猫', ['Bai3'])];
    expect(classifyIncoming({ incoming: { word: '猫', reading: null }, targetFolderId: null, vocabs, folders })).toEqual({
      kind: 'skip',
      reason: 'exists',
      existingPath: 'N4 › Bai3',
    });
  });

  it('từ đã xóa KHÔNG tính → new', () => {
    const vocabs = [word('v1', '猫', ['Bai1'], { deleted: true })];
    expect(classifyIncoming({ incoming: { word: '猫', reading: null }, targetFolderId: 'Bai2', vocabs, folders })).toEqual({
      kind: 'new',
    });
  });

  it('khác reading → coi là từ mới (reading nằm trong khóa)', () => {
    const vocabs = [word('v1', '生', ['Bai1'], { reading: 'なま' })];
    expect(classifyIncoming({ incoming: { word: '生', reading: 'せい' }, targetFolderId: 'Bai1', vocabs, folders })).toEqual({
      kind: 'new',
    });
  });

  it('trùng với dòng trước đó trong cùng file (seenKeys) → skip in-file', () => {
    const seenKeys = new Set([dedupeKey('猫', null)]);
    expect(
      classifyIncoming({ incoming: { word: '猫', reading: null }, targetFolderId: 'Bai1', vocabs: [], folders, seenKeys }),
    ).toEqual({ kind: 'skip', reason: 'in-file' });
  });
});

describe('features/vocabulary/branch-dedupe · linkVocabulary', () => {
  it('gộp folderIds không trùng + updatedAt = now, giữ nguyên trường khác, không sửa bản cũ', () => {
    const original = word('v1', '猫', ['Bai1'], { reading: 'ねこ' });
    const now = '2026-09-09T00:00:00.000Z';
    const linked = linkVocabulary(original, 'Bai2', now);

    expect(linked.folderIds).toEqual(['Bai1', 'Bai2']);
    expect(linked.updatedAt).toBe(now);
    // Trường khác (gồm SRS) giữ nguyên.
    expect(linked.word).toBe('猫');
    expect(linked.reading).toBe('ねこ');
    expect(linked.srsInterval).toBe(3);
    expect(linked.srsEaseFactor).toBe(2.5);
    expect(linked.srsNextReview).toBe('2026-03-01T00:00:00.000Z');
    // Không sửa đối tượng/ mảng cũ.
    expect(linked).not.toBe(original);
    expect(linked.folderIds).not.toBe(original.folderIds);
    expect(original.folderIds).toEqual(['Bai1']);
    expect(original.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('folderId đã có sẵn → không nhân đôi (vẫn trả bản sao mới)', () => {
    const original = word('v1', '猫', ['Bai1']);
    const linked = linkVocabulary(original, 'Bai1', '2026-09-09T00:00:00.000Z');
    expect(linked.folderIds).toEqual(['Bai1']);
    expect(linked.folderIds).not.toBe(original.folderIds);
    expect(original.folderIds).toEqual(['Bai1']);
  });
});
