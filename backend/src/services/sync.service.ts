import { db } from '../config/database.js';
import { env } from '../config/env.js';
import * as folderRepo from '../repositories/folder.repo.js';
import * as vocabRepo from '../repositories/vocabulary.repo.js';
import * as vocabFoldersRepo from '../repositories/vocabulary-folders.repo.js';
import type { Executor } from '../repositories/types.js';
import type { NewFolderRow, NewVocabularyRow } from '../types/database.js';
import {
  folderRowToDto,
  vocabularyRowToDto,
  type FolderDto,
  type VocabularyDto,
} from '../utils/row-mappers.js';
import type { FolderPushItem, PushBody, VocabularyPushItem } from '../validators/sync.js';

const ownerId = (): string => env.LOCAL_OWNER_ID;

export interface PullResult {
  serverTime: string;
  folders: FolderDto[];
  vocabularies: VocabularyDto[];
}

export interface PushCounts {
  applied: number;
  skipped: number;
}

export interface PushResult {
  serverTime: string;
  folders: PushCounts;
  vocabularies: PushCounts;
}

/**
 * Quyết định LWW thuần: bản client (incoming) chỉ thắng khi updated_at của nó
 * MỚI HƠN THỰC SỰ (>) bản server. Bằng hoặc cũ hơn → bỏ qua (push lặp cùng
 * (id, updated_at) là no-op → idempotent). Tách riêng để unit test không cần DB.
 */
export function isIncomingNewer(
  incomingUpdatedAt: string | Date,
  existingUpdatedAt: Date | string,
): boolean {
  const incoming = new Date(incomingUpdatedAt).getTime();
  const existing = new Date(existingUpdatedAt).getTime();
  return incoming > existing;
}

/** Pull theo delta: trả folders + vocabularies đổi kể từ `since` (kèm tombstone). */
export async function pull(since?: string): Promise<PullResult> {
  const sinceDate = since === undefined ? undefined : new Date(since);
  const serverTime = new Date().toISOString();

  const folderRows = await folderRepo.listChangedSince(ownerId(), sinceDate);
  const vocabRows = await vocabRepo.listChangedSince(ownerId(), sinceDate);

  const folders = folderRows.map(folderRowToDto);

  const vocabularies: VocabularyDto[] = [];
  for (const row of vocabRows) {
    // Tombstone có thể không còn liên kết; listFolderIds trả [] là hợp lệ.
    const folderIds = await vocabFoldersRepo.listFolderIds(row.id);
    vocabularies.push(vocabularyRowToDto(row, folderIds));
  }

  return { serverTime, folders, vocabularies };
}

/** Map FolderPushItem (camelCase) → row DB (snake_case). */
function toFolderRow(item: FolderPushItem): NewFolderRow {
  return {
    id: item.id,
    owner_id: ownerId(),
    name: item.name,
    parent_id: item.parentId,
    sort_order: item.order,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
  };
}

/** Map VocabularyPushItem (camelCase) → row DB (snake_case). */
function toVocabRow(item: VocabularyPushItem): NewVocabularyRow {
  return {
    id: item.id,
    owner_id: ownerId(),
    word: item.word,
    meaning: item.meaning,
    reading: item.reading ?? null,
    sino_vietnamese: item.sinoVietnamese ?? null,
    example: item.example ?? null,
    example_meaning: item.exampleMeaning ?? null,
    note: item.note ?? null,
    tags: item.tags ?? [],
    jlpt_level: item.jlptLevel ?? null,
    srs_interval: item.srsInterval ?? null,
    srs_repetition: item.srsRepetition ?? null,
    srs_ease_factor: item.srsEaseFactor ?? null,
    srs_next_review: item.srsNextReview ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
  };
}

/**
 * Push: áp LWW theo từng id trong MỘT transaction.
 * Thứ tự: folders (2 pha vì parent_id tự tham chiếu) → vocabularies → links.
 */
export async function push(payload: PushBody): Promise<PushResult> {
  const folderItems = payload.folders ?? [];
  const vocabItems = payload.vocabularies ?? [];

  const result = await db.transaction().execute(async (trx) => {
    const folders: PushCounts = { applied: 0, skipped: 0 };
    const vocabularies: PushCounts = { applied: 0, skipped: 0 };

    // --- Folders ---
    // Pha A: upsert scalar với parent_id tạm = null (tránh FK tự tham chiếu).
    // Lưu lại parentId đích cho các folder được áp để set ở pha B.
    const appliedFolderParents = new Map<string, string | null>();

    for (const item of folderItems) {
      const existing = await folderRepo.findForMerge(ownerId(), item.id, trx);
      if (existing && !isIncomingNewer(item.updatedAt, existing.updated_at)) {
        folders.skipped += 1;
        continue;
      }
      const row = toFolderRow(item);
      await folderRepo.upsertFromClient({ ...row, parent_id: null }, trx);
      appliedFolderParents.set(item.id, item.parentId);
      folders.applied += 1;
    }

    // Pha B: gán parent_id cho các folder vừa áp (giờ mọi folder đã tồn tại).
    for (const [id, parentId] of appliedFolderParents) {
      await folderRepo.setParentId(ownerId(), id, parentId, trx);
    }

    // --- Vocabularies + links ---
    for (const item of vocabItems) {
      const existing = await vocabRepo.findForMerge(ownerId(), item.id, trx);
      if (existing && !isIncomingNewer(item.updatedAt, existing.updated_at)) {
        vocabularies.skipped += 1;
        continue;
      }
      const row = toVocabRow(item);
      await vocabRepo.upsertFromClient(row, trx);

      // Thay thế liên kết folder, chỉ giữ folderIds thực sự tồn tại (chống FK).
      const requested = item.folderIds ?? [];
      const valid = await filterExistingFolderIds(requested, trx);
      await vocabFoldersRepo.replaceLinks(item.id, valid, trx);

      vocabularies.applied += 1;
    }

    return { folders, vocabularies };
  });

  return {
    serverTime: new Date().toISOString(),
    folders: result.folders,
    vocabularies: result.vocabularies,
  };
}

/** Chỉ giữ folderIds còn tồn tại cho owner (bỏ qua rỗng để khỏi query thừa). */
async function filterExistingFolderIds(
  folderIds: string[],
  trx: Executor,
): Promise<string[]> {
  if (folderIds.length === 0) return [];
  return vocabFoldersRepo.listExistingFolderIds(ownerId(), folderIds, trx);
}
