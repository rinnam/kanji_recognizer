import { describe, expect, it } from 'vitest';
import type { FolderDto } from '../src/dto';
import { createMemoryStoragePort } from '../src/storage/memory';
import { pickIncomingWinners, selectDirty } from '../src/sync/engine';

function folder(id: string, updatedAt: string): FolderDto {
  return {
    id,
    name: id,
    parentId: null,
    order: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    deletedAt: null,
  };
}

describe('storage/port (memory)', () => {
  it('mới tạo thì rỗng; meta chưa có → null', async () => {
    const port = createMemoryStoragePort();
    await expect(port.folders.all()).resolves.toEqual([]);
    await expect(port.vocabs.all()).resolves.toEqual([]);
    await expect(port.meta.get('sync.lastPushedAt')).resolves.toBeNull();
  });

  it('putMany upsert theo id; mảng rỗng no-op', async () => {
    const port = createMemoryStoragePort();
    await port.folders.putMany([folder('a', '2026-01-01T00:00:00.000Z')]);
    await port.folders.putMany([]);
    await port.folders.putMany([folder('a', '2026-02-01T00:00:00.000Z')]);
    const all = await port.folders.all();
    expect(all).toHaveLength(1);
    expect(all[0].updatedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('meta set/get ghi đè', async () => {
    const port = createMemoryStoragePort();
    await port.meta.set('sync.lastPushedAt', '2026-03-01T00:00:00.000Z');
    await expect(port.meta.get('sync.lastPushedAt')).resolves.toBe(
      '2026-03-01T00:00:00.000Z',
    );
  });

  it('seed nạp sẵn dữ liệu', async () => {
    const port = createMemoryStoragePort({
      folders: [folder('a', '2026-01-01T00:00:00.000Z')],
      meta: { 'sync.lastPushedAt': '2026-01-01T00:00:00.000Z' },
    });
    await expect(port.folders.all()).resolves.toHaveLength(1);
    await expect(port.meta.get('sync.lastPushedAt')).resolves.toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('lái được sync engine: all → selectDirty → merge LWW', async () => {
    const port = createMemoryStoragePort({
      folders: [
        folder('old', '2026-01-01T00:00:00.000Z'),
        folder('new', '2026-06-01T00:00:00.000Z'),
      ],
    });
    const local = await port.folders.all();
    expect(selectDirty(local, '2026-03-01T00:00:00.000Z').map((r) => r.id)).toEqual([
      'new',
    ]);
    const incoming = [folder('new', '2026-07-01T00:00:00.000Z')];
    await port.folders.putMany(pickIncomingWinners(local, incoming));
    const merged = await port.folders.all();
    expect(merged.find((r) => r.id === 'new')?.updatedAt).toBe(
      '2026-07-01T00:00:00.000Z',
    );
  });
});
