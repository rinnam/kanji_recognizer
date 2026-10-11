import { useCallback, useEffect, useState } from 'react';
import {
  getAllVocabulariesLocal,
  getVocabularyLocal,
  putVocabularyLocal,
  putVocabulariesLocal,
  tombstoneVocabularies,
  type LocalVocabulary,
} from '../../../entities/vocabulary';
import { useDb } from '../../../shared/db';
import { emitDataChanged, newVocabId, nowIso } from '../../../shared/lib';
import type { JlptLevel } from '../../../shared/api';
import { findDuplicate } from './dedupe';
import { assembleImportWrites } from './import';
import type { PreviewRow } from './import';
import { planWordRemoval, type WordRemovalCounts } from './word-removal';
import { linkVocabulary } from './branch-dedupe';

type Status = 'loading' | 'error' | 'ready';

export interface QuickAddInput {
  word: string;
  meaning: string;
  reading: string | null;
  sinoVietnamese: string | null;
  example: string | null;
  exampleMeaning: string | null;
  jlptLevel: JlptLevel | null;
  note: string | null;
  folderId: string | null;
}

export type QuickAddResult =
  | { ok: true; vocabulary: LocalVocabulary }
  | { ok: false; reason: 'invalid' | 'duplicate'; message: string };

/** Kết quả nhập hàng loạt: số từ MỚI đã thêm + số từ CÓ SẴN được gắn thêm vào thư mục đích. */
export interface ImportWriteResult {
  added: number;
  linked: number;
}

export interface VocabularyApi {
  all: LocalVocabulary[];
  status: Status;
  error: string | null;
  reload: () => Promise<void>;
  quickAdd: (input: QuickAddInput) => Promise<QuickAddResult>;
  remove: (id: string) => Promise<void>;
  removeMany: (ids: readonly string[]) => Promise<number>;
  removeInScope: (
    ids: readonly string[],
    scopeFolderIds: ReadonlySet<string> | null,
  ) => Promise<WordRemovalCounts>;
  linkExisting: (existingId: string, folderId: string) => Promise<void>;
  importNew: (previews: PreviewRow[], folderId: string | null) => Promise<ImportWriteResult>;
}

const READ_ERROR = 'Không đọc được từ vựng.';

function cleanOptional(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Quản lý từ vựng local-first (đọc/ghi IndexedDB qua entities/vocabulary). */
export function useVocabulary(): VocabularyApi {
  const db = useDb();
  const [all, setAll] = useState<LocalVocabulary[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const fetchLiving = useCallback(async (): Promise<LocalVocabulary[]> => {
    const rows = await getAllVocabulariesLocal(db);
    return rows.filter((item) => item.deletedAt === null);
  }, [db]);

  const reload = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      setAll(await fetchLiving());
      setError(null);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : READ_ERROR);
      setStatus('error');
    }
  }, [fetchLiving]);

  // Nạp lần đầu: KHÔNG setState đồng bộ trước await (tránh cascading render).
  useEffect(() => {
    let active = true;
    void (async (): Promise<void> => {
      try {
        const living = await fetchLiving();
        if (!active) return;
        setAll(living);
        setError(null);
        setStatus('ready');
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : READ_ERROR);
        setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchLiving]);

  const quickAdd = useCallback(
    async (input: QuickAddInput): Promise<QuickAddResult> => {
      const word = input.word.trim();
      const meaning = input.meaning.trim();
      if (word === '' || meaning === '') {
        return { ok: false, reason: 'invalid', message: 'Cần nhập ít nhất Từ và Nghĩa.' };
      }
      const reading = cleanOptional(input.reading);
      const duplicate = findDuplicate(all, word, reading);
      if (duplicate !== undefined) {
        return {
          ok: false,
          reason: 'duplicate',
          message: `Đã có từ trùng (word + reading): "${duplicate.word}".`,
        };
      }

      const now = nowIso();
      const vocabulary: LocalVocabulary = {
        id: newVocabId(),
        word,
        meaning,
        reading,
        sinoVietnamese: cleanOptional(input.sinoVietnamese),
        example: cleanOptional(input.example),
        exampleMeaning: cleanOptional(input.exampleMeaning),
        note: cleanOptional(input.note),
        tags: [],
        jlptLevel: input.jlptLevel,
        srsInterval: null,
        srsRepetition: null,
        srsEaseFactor: null,
        srsNextReview: null,
        folderIds: input.folderId !== null ? [input.folderId] : [],
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await putVocabularyLocal(db, vocabulary);
      emitDataChanged();
      await reload();
      return { ok: true, vocabulary };
    },
    [all, db, reload],
  );

  // Xóa mềm (tombstone) để đồng bộ lan truyền; KHÔNG hard-delete.
  const remove = useCallback(
    async (id: string): Promise<void> => {
      const existing = await getVocabularyLocal(db, id);
      if (existing === undefined) return;
      const now = nowIso();
      await putVocabularyLocal(db, { ...existing, deletedAt: now, updatedAt: now });
      emitDataChanged();
      await reload();
    },
    [db, reload],
  );

  // Xóa mềm HÀNG LOẠT: một transaction IndexedDB, change-bus emit MỘT lần (trong
  // tombstoneVocabularies), rồi nạp lại. Trả về số từ thực sự được tombstone.
  const removeMany = useCallback(
    async (ids: readonly string[]): Promise<number> => {
      if (ids.length === 0) return 0;
      const updated = await tombstoneVocabularies(db, ids, nowIso());
      await reload();
      return updated.length;
    },
    [db, reload],
  );

  // Gỡ/xóa theo PHẠM VI (Phần 7D): gỡ liên kết thư mục trong phạm vi, chỉ tombstone khi từ hết
  // thư mục; `scopeFolderIds === null` (Tất cả / tìm kiếm toàn cục) → tombstone tất cả. Ghi cả
  // từ GIỮ lẫn từ TOMBSTONE trong MỘT transaction, emit change-bus MỘT lần, rồi nạp lại.
  const removeInScope = useCallback(
    async (
      ids: readonly string[],
      scopeFolderIds: ReadonlySet<string> | null,
    ): Promise<WordRemovalCounts> => {
      if (ids.length === 0) return { detached: 0, deleted: 0 };
      const plan = planWordRemoval(all, ids, scopeFolderIds, nowIso());
      const rows = [...plan.toUpdate, ...plan.toTombstone];
      if (rows.length > 0) {
        await putVocabulariesLocal(db, rows);
        emitDataChanged();
      }
      await reload();
      return plan.counts;
    },
    [all, db, reload],
  );

  // Gắn từ CÓ SẴN vào một thư mục (Phần 7E): hợp folderIds không trùng + updatedAt=now (giữ SRS),
  // ghi một bản ghi + emit change-bus MỘT lần rồi nạp lại. Từ đã tombstone / không tồn tại → bỏ qua.
  const linkExisting = useCallback(
    async (existingId: string, folderId: string): Promise<void> => {
      const existing = await getVocabularyLocal(db, existingId);
      if (existing === undefined || existing.deletedAt !== null) return;
      await putVocabularyLocal(db, linkVocabulary(existing, folderId, nowIso()));
      emitDataChanged();
      await reload();
    },
    [db, reload],
  );

  // Nhập hàng loạt: GHI từ MỚI + CẬP NHẬT từ 'Gắn' (linkVocabulary) trong MỘT transaction
  // IndexedDB, phát đổi dữ liệu MỘT lần rồi nạp lại. Từ 'Gắn' chỉ thêm thư mục đích vào
  // folderIds + updatedAt = now (không đụng SRS). `createdAt` của từ mới tăng dần theo thứ tự.
  const importNew = useCallback(
    async (previews: PreviewRow[], folderId: string | null): Promise<ImportWriteResult> => {
      const plan = assembleImportWrites(previews, all, folderId, nowIso(), newVocabId);
      if (plan.rows.length === 0) return { added: 0, linked: 0 };
      await putVocabulariesLocal(db, plan.rows);
      emitDataChanged();
      await reload();
      return { added: plan.added, linked: plan.linked };
    },
    [all, db, reload],
  );

  return {
    all,
    status,
    error,
    reload,
    quickAdd,
    remove,
    removeMany,
    removeInScope,
    linkExisting,
    importNew,
  };
}
