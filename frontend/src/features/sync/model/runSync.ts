import {
  pull, push, type FolderDto, type PullResult, type SyncCounts, type VocabularyDto,
} from '../../../shared/api';
import { STORE } from '../../../shared/config';
import { emitDataChanged } from '../../../shared/lib/change-bus';
import {
  queueRevision, runIdbTransaction, txGet, txGetAll, type PendingRevision, type StudyStore,
} from '../../../shared/lib/idb';
import { SYNC_META_KEY } from './cursor';
import { chunk, orderFoldersParentsFirst } from './engine';

export interface SyncRunSummary {
  pushed: { folders: SyncCounts; vocabularies: SyncCounts };
  merged: { folders: number; vocabularies: number };
  serverTime: string;
}

const SYNC_STORES = [STORE.folders, STORE.vocabularies, STORE.pending, STORE.meta];
const ENROLLED = 'sync.pendingRevisionsEnrolled';
const PUSH_BATCH_SIZE = 200;

async function capturePending(db: IDBDatabase) {
  return runIdbTransaction(db, SYNC_STORES, 'readwrite', async (tx) => {
    const [folders, words, enrolled] = await Promise.all([
      txGetAll<FolderDto>(tx, STORE.folders),
      txGetAll<VocabularyDto>(tx, STORE.vocabularies),
      txGet(tx, STORE.meta, ENROLLED),
    ]);
    if (!enrolled) {
      for (const folder of folders) queueRevision(tx, STORE.folders, folder.id);
      for (const word of words) queueRevision(tx, STORE.vocabularies, word.id);
      tx.objectStore(STORE.meta).put({ key: ENROLLED, value: true });
    }
    const revisions = await txGetAll<PendingRevision>(tx, STORE.pending);
    const dirty = (kind: StudyStore) =>
      new Set(revisions.filter((row) => row.entityKind === kind).map((row) => row.recordId));
    const dirtyFolders = dirty(STORE.folders);
    const dirtyWords = dirty(STORE.vocabularies);
    return {
      revisions,
      folders: orderFoldersParentsFirst(folders.filter((row) => dirtyFolders.has(row.id))),
      words: words.filter((row) => dirtyWords.has(row.id)),
    };
  });
}

function countAcknowledgements(total: SyncCounts, counts: SyncCounts, expected: number): void {
  if (!Number.isInteger(counts.applied) || !Number.isInteger(counts.skipped) ||
      counts.applied < 0 || counts.skipped < 0 || counts.applied + counts.skipped !== expected) {
    throw new Error('Máy chủ chưa xác nhận đầy đủ các thay đổi.');
  }
  total.applied += counts.applied;
  total.skipped += counts.skipped;
}

async function mergeRows<T extends FolderDto | VocabularyDto>(
  tx: IDBTransaction, store: StudyStore, rows: T[], pending: Set<string>,
): Promise<number> {
  const current = new Map((await txGetAll<T>(tx, store)).map((row) => [row.id, row]));
  let count = 0;
  for (const row of rows) {
    if (pending.has(row.id)) continue;
    const local = current.get(row.id);
    if (local && Date.parse(row.updatedAt) < Date.parse(local.updatedAt)) continue;
    if (local && JSON.stringify(local) === JSON.stringify(row)) continue;
    tx.objectStore(store).put(row);
    count++;
  }
  return count;
}

function validatePull(result: PullResult): void {
  if (!Number.isFinite(Date.parse(result.serverTime)) ||
      !Array.isArray(result.folders) || !Array.isArray(result.vocabularies) ||
      [...result.folders, ...result.vocabularies].some((row) =>
        typeof row?.id !== 'string' || !row.id || !Number.isFinite(Date.parse(row.updatedAt)) ||
        (row.deletedAt !== null && !Number.isFinite(Date.parse(row.deletedAt))))) {
    throw new Error('Dữ liệu đồng bộ từ máy chủ không hợp lệ.');
  }
}

export async function runSync(db: IDBDatabase): Promise<SyncRunSummary> {
  const captured = await capturePending(db);
  const pushed = { folders: { applied: 0, skipped: 0 }, vocabularies: { applied: 0, skipped: 0 } };
  for (const folders of chunk(captured.folders, PUSH_BATCH_SIZE)) {
    const result = await push({ folders, vocabularies: [] });
    countAcknowledgements(pushed.folders, result.folders, folders.length);
    countAcknowledgements(pushed.vocabularies, result.vocabularies, 0);
  }
  for (const vocabularies of chunk(captured.words, PUSH_BATCH_SIZE)) {
    const result = await push({ folders: [], vocabularies });
    countAcknowledgements(pushed.folders, result.folders, 0);
    countAcknowledgements(pushed.vocabularies, result.vocabularies, vocabularies.length);
  }

  const incoming = await pull();
  validatePull(incoming);
  const merged = await runIdbTransaction(db, SYNC_STORES, 'readwrite', async (tx) => {
    const sent = new Map(captured.revisions.map((row) =>
      [JSON.stringify([row.entityKind, row.recordId]), row.revision]));
    const folders = new Set<string>();
    const words = new Set<string>();
    for (const row of await txGetAll<PendingRevision>(tx, STORE.pending)) {
      const key = [row.entityKind, row.recordId];
      if (sent.get(JSON.stringify(key)) === row.revision) {
        tx.objectStore(STORE.pending).delete(key);
      } else {
        (row.entityKind === STORE.folders ? folders : words).add(row.recordId);
      }
    }
    const results = {
      folders: await mergeRows(tx, STORE.folders, incoming.folders, folders),
      vocabularies: await mergeRows(tx, STORE.vocabularies, incoming.vocabularies, words),
    };
    tx.objectStore(STORE.meta).put({ key: SYNC_META_KEY.lastPulledAt, value: incoming.serverTime });
    return results;
  });
  if (merged.folders || merged.vocabularies) emitDataChanged();
  return { pushed, merged, serverTime: incoming.serverTime };
}
