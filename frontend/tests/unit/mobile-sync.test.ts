// @vitest-environment node
import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import { pull, push } from '../../src/shared/api';
import { DB_NAME, STORE } from '../../src/shared/config/db';
import { idbGet, idbPut, openKanjiDb } from '../../src/shared/lib/idb';
import { runSync } from '../../src/features/sync/model/runSync';
import { baselineTime, parentFolder, sampleWord } from '../fixtures/mobile-workspace';

vi.mock('../../src/shared/api', () => ({ pull: vi.fn(), push: vi.fn() }));
vi.mock('../../src/shared/lib/change-bus', () => ({ emitDataChanged: vi.fn() }));

const completion = '2026-11-22T10:00:00.000Z';
const databases: IDBDatabase[] = [];
const noCounts = { applied: 0, skipped: 0 };

async function open() {
  const db = await openKanjiDb();
  databases.push(db);
  return db;
}

afterEach(async () => {
  for (const db of databases.splice(0)) db.close();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  vi.resetAllMocks();
});

it.each([null, baselineTime])('pulls late changes even after a prior sync (deletion: %s)', async (deletedAt) => {
  const db = await open();
  vi.mocked(pull).mockResolvedValueOnce({ serverTime: completion, folders: [], vocabularies: [] });
  await runSync(db);
  vi.mocked(pull).mockResolvedValueOnce({
    serverTime: completion, folders: [], vocabularies: [{ ...sampleWord, deletedAt }],
  });
  await runSync(db);
  expect(pull).toHaveBeenLastCalledWith();
  expect(await idbGet(db, STORE.vocabularies, sampleWord.id)).toEqual({ ...sampleWord, deletedAt });
});

it('keeps a same-clock-tick edit saved while the previous version is in flight', async () => {
  const db = await open();
  await idbPut(db, STORE.vocabularies, sampleWord);
  let serverWord = sampleWord;
  vi.mocked(pull).mockImplementation(async () => ({
    serverTime: completion, folders: [], vocabularies: [serverWord],
  }));
  vi.mocked(push).mockImplementationOnce(async () => {
    await idbPut(db, STORE.vocabularies, { ...sampleWord, meaning: 'new meaning' });
    await idbPut(db, STORE.vocabularies, { ...sampleWord, id: 'vocab_concurrent' });
    return { serverTime: completion, folders: noCounts, vocabularies: { applied: 1, skipped: 0 } };
  });
  await runSync(db);
  db.close();
  const reopened = await open();
  vi.mocked(push).mockImplementationOnce(async (batch) => {
    serverWord = batch.vocabularies?.find((row) => row.id === sampleWord.id) ?? sampleWord;
    expect(batch.vocabularies?.map((row) => row.id)).toContain('vocab_concurrent');
    return { serverTime: completion, folders: noCounts, vocabularies: { applied: 2, skipped: 0 } };
  });
  await runSync(reopened);
  expect(serverWord.meaning).toBe('new meaning');
  expect(serverWord.updatedAt > baselineTime).toBe(true);
});

it.each([null, baselineTime])('converges to the server tie winner (deletion: %s)', async (deletedAt) => {
  const db = await open();
  const winner = { ...sampleWord, meaning: 'server winner', deletedAt, folderIds: [] };
  await idbPut(db, STORE.vocabularies, sampleWord);
  vi.mocked(push).mockResolvedValue({
    serverTime: completion, folders: noCounts, vocabularies: { applied: 0, skipped: 1 },
  });
  vi.mocked(pull).mockResolvedValue({ serverTime: completion, folders: [], vocabularies: [winner] });
  await runSync(db);
  await runSync(db);
  expect(push).toHaveBeenCalledTimes(1);
  expect(await idbGet(db, STORE.vocabularies, sampleWord.id)).toEqual(winner);
});

it('preserves pending work and remains uninitialized after an interrupted first pull', async () => {
  const db = await open();
  await idbPut(db, STORE.vocabularies, sampleWord);
  vi.mocked(push).mockResolvedValue({
    serverTime: completion, folders: noCounts, vocabularies: { applied: 1, skipped: 0 },
  });
  vi.mocked(pull).mockRejectedValueOnce(new Error('offline'));
  await expect(runSync(db)).rejects.toThrow('offline');
  expect(await idbGet(db, STORE.meta, 'sync.lastPulledAt')).toBeUndefined();
  expect(await idbGet(db, STORE.pending, [STORE.vocabularies, sampleWord.id])).toBeDefined();
  vi.mocked(pull).mockResolvedValue({ serverTime: completion, folders: [], vocabularies: [] });
  await runSync(db);
  expect(push).toHaveBeenCalledTimes(2);
  expect(await idbGet(db, STORE.meta, 'sync.lastPulledAt')).toBeDefined();
  expect(await idbGet(db, STORE.vocabularies, sampleWord.id)).toEqual(sampleWord);
});

it('does not apply a stale pull over a write saved while the request is open', async () => {
  const db = await open();
  vi.mocked(pull).mockImplementationOnce(async () => {
    await idbPut(db, STORE.vocabularies, sampleWord);
    return { serverTime: completion, folders: [], vocabularies: [
      { ...sampleWord, meaning: 'older in-flight response', deletedAt: baselineTime },
    ] };
  });
  await runSync(db);
  expect(await idbGet(db, STORE.vocabularies, sampleWord.id)).toEqual(sampleWord);
  expect(await idbGet(db, STORE.pending, [STORE.vocabularies, sampleWord.id])).toBeDefined();
});

it('replays an acknowledged folder batch after a later word batch fails', async () => {
  const db = await open();
  await idbPut(db, STORE.folders, parentFolder);
  await idbPut(db, STORE.vocabularies, { ...sampleWord, folderIds: [parentFolder.id] });
  const applied = { applied: 1, skipped: 0 };
  vi.mocked(push)
    .mockResolvedValueOnce({ serverTime: completion, folders: applied, vocabularies: noCounts })
    .mockRejectedValueOnce(new Error('interrupted'))
    .mockResolvedValueOnce({ serverTime: completion, folders: { applied: 0, skipped: 1 }, vocabularies: noCounts })
    .mockResolvedValueOnce({ serverTime: completion, folders: noCounts, vocabularies: applied });
  await expect(runSync(db)).rejects.toThrow('interrupted');
  expect(pull).not.toHaveBeenCalled();
  expect(await idbGet(db, STORE.pending, [STORE.folders, parentFolder.id])).toBeDefined();
  vi.mocked(pull).mockResolvedValue({ serverTime: completion, folders: [], vocabularies: [] });
  await runSync(db);
  expect(push).toHaveBeenCalledTimes(4);
  expect(await idbGet(db, STORE.pending, [STORE.folders, parentFolder.id])).toBeUndefined();
});

it('rolls back incoming rows and pending acknowledgement if the pull commit fails', async () => {
  const db = await open();
  await idbPut(db, STORE.vocabularies, sampleWord);
  vi.mocked(push).mockResolvedValue({
    serverTime: completion, folders: noCounts, vocabularies: { applied: 1, skipped: 0 },
  });
  const incoming = { ...sampleWord, meaning: 'server update', updatedAt: completion };
  vi.mocked(pull).mockResolvedValue({ serverTime: completion, folders: [], vocabularies: [incoming] });
  const put = IDBObjectStore.prototype.put;
  const failCompletion = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore, value: unknown, key?: IDBValidKey,
  ) {
    if (this.name === STORE.meta && (value as { key?: string }).key === 'sync.lastPulledAt') {
      throw new Error('storage failure');
    }
    return put.call(this, value, key);
  });
  try {
    await expect(runSync(db)).rejects.toThrow('storage failure');
  } finally {
    failCompletion.mockRestore();
  }
  expect(await idbGet(db, STORE.vocabularies, sampleWord.id)).toEqual(sampleWord);
  expect(await idbGet(db, STORE.pending, [STORE.vocabularies, sampleWord.id])).toBeDefined();
  await runSync(db);
  expect(await idbGet(db, STORE.vocabularies, sampleWord.id)).toEqual(incoming);
});
