import {
  chunk,
  latestIso,
  maxUpdatedAt,
  orderFoldersParentsFirst,
  pickIncomingWinners,
  selectDirty,
  type FolderDto,
  type PullResult,
  type PushResult,
  type StoragePort,
  type SyncCounts,
  type VocabularyDto,
} from '@kanji-nest/core';
import { request } from '../api/http';

export interface SyncRunSummary {
  pushed: { folders: SyncCounts; vocabularies: SyncCounts };
  merged: { folders: number; vocabularies: number };
  serverTime: string;
}

const EMPTY_COUNTS: SyncCounts = { applied: 0, skipped: 0 };

/** Số bản ghi tối đa mỗi lô push (giữ body dưới giới hạn ~1 MiB của Fastify). */
const PUSH_BATCH_SIZE = 200;

const LAST_PULLED_AT = 'sync.lastPulledAt';
const LAST_PUSHED_AT = 'sync.lastPushedAt';

type TaggedDirty =
  | { kind: 'folder'; record: FolderDto }
  | { kind: 'vocabulary'; record: VocabularyDto };

function addCounts(a: SyncCounts, b: SyncCounts): SyncCounts {
  return { applied: a.applied + b.applied, skipped: a.skipped + b.skipped };
}

function pull(since?: string): Promise<PullResult> {
  return request<PullResult>('/sync/pull', { query: { since } });
}

function push(payload: {
  folders?: FolderDto[];
  vocabularies?: VocabularyDto[];
}): Promise<PushResult> {
  return request<PushResult>('/sync/push', { method: 'POST', body: payload });
}

/**
 * Một vòng đồng bộ hai chiều (mirror `apps/web/.../sync/model/runSync.ts`):
 * PUSH bản bẩn (folder-trước-vocab, theo lô) rồi PULL delta + merge LWW.
 * Chạy bằng tay từ màn hình chính (M4); tự động hóa ở M5.
 */
export async function runSync(port: StoragePort): Promise<SyncRunSummary> {
  const [lastPulledAt, lastPushedAt] = await Promise.all([
    port.meta.get(LAST_PULLED_AT),
    port.meta.get(LAST_PUSHED_AT),
  ]);

  const [localFolders, localVocabularies] = await Promise.all([
    port.folders.all(),
    port.vocabs.all(),
  ]);

  // 1) PUSH theo lô, folder trước vocab (tránh FK violation ở BE).
  const dirtyFolders = selectDirty(localFolders, lastPushedAt);
  const dirtyVocabularies = selectDirty(localVocabularies, lastPushedAt);

  let pushed = { folders: EMPTY_COUNTS, vocabularies: EMPTY_COUNTS };
  if (dirtyFolders.length > 0 || dirtyVocabularies.length > 0) {
    const orderedFolders = orderFoldersParentsFirst(dirtyFolders);
    const orderedVocabularies = [...dirtyVocabularies].sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );
    const timeline: TaggedDirty[] = [
      ...orderedFolders.map((record): TaggedDirty => ({ kind: 'folder', record })),
      ...orderedVocabularies.map((record): TaggedDirty => ({ kind: 'vocabulary', record })),
    ];

    let folderCounts: SyncCounts = { applied: 0, skipped: 0 };
    let vocabularyCounts: SyncCounts = { applied: 0, skipped: 0 };

    for (const batch of chunk(timeline, PUSH_BATCH_SIZE)) {
      const folders: FolderDto[] = [];
      const vocabularies: VocabularyDto[] = [];
      for (const item of batch) {
        if (item.kind === 'folder') folders.push(item.record);
        else vocabularies.push(item.record);
      }
      const result = await push({ folders, vocabularies });
      folderCounts = addCounts(folderCounts, result.folders);
      vocabularyCounts = addCounts(vocabularyCounts, result.vocabularies);
    }

    const mark = latestIso([
      lastPushedAt,
      maxUpdatedAt([...dirtyFolders, ...dirtyVocabularies]),
    ]);
    if (mark !== null) await port.meta.set(LAST_PUSHED_AT, mark);

    pushed = { folders: folderCounts, vocabularies: vocabularyCounts };
  }

  // 2) PULL delta + merge LWW.
  const pullResult = await pull(lastPulledAt ?? undefined);
  const folderWinners = pickIncomingWinners(localFolders, pullResult.folders);
  const vocabularyWinners = pickIncomingWinners(localVocabularies, pullResult.vocabularies);
  await port.folders.putMany(folderWinners);
  await port.vocabs.putMany(vocabularyWinners);
  await port.meta.set(LAST_PULLED_AT, pullResult.serverTime);

  return {
    pushed,
    merged: { folders: folderWinners.length, vocabularies: vocabularyWinners.length },
    serverTime: pullResult.serverTime,
  };
}
