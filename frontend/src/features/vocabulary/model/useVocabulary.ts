import { useCallback, useEffect, useState } from 'react';
import {
  getAllVocabulariesLocal,
  getVocabularyLocal,
  putVocabularyLocal,
  type LocalVocabulary,
} from '../../../entities/vocabulary';
import { useDb } from '../../../shared/db';
import { emitDataChanged, newVocabId, nowIso } from '../../../shared/lib';
import type { JlptLevel } from '../../../shared/api';
import { findDuplicate } from './dedupe';

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

export interface VocabularyApi {
  all: LocalVocabulary[];
  status: Status;
  error: string | null;
  reload: () => Promise<void>;
  quickAdd: (input: QuickAddInput) => Promise<QuickAddResult>;
  remove: (id: string) => Promise<void>;
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

  return { all, status, error, reload, quickAdd, remove };
}
