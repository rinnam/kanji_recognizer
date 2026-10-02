import { useCallback, useEffect, useState } from 'react';
import type { SrsRating } from '../../../entities/card';
import {
  getAllVocabulariesLocal,
  putVocabularyLocal,
  type LocalVocabulary,
} from '../../../entities/vocabulary';
import { useDb } from '../../../shared/db';
import { emitDataChanged } from '../../../shared/lib';
import { persistReview } from './review';

type Status = 'loading' | 'error' | 'ready';

export interface FlashcardsApi {
  all: LocalVocabulary[];
  status: Status;
  error: string | null;
  reload: () => Promise<void>;
  review: (vocab: LocalVocabulary, rating: SrsRating) => Promise<LocalVocabulary>;
}

const READ_ERROR = 'Không đọc được bộ thẻ.';

/**
 * Quản lý bộ thẻ local-first: nạp thẻ sống từ IndexedDB; `review()` áp SM-2,
 * ghi srs* xuống local và emit change-bus (để sync đẩy tiến độ lên server).
 */
export function useFlashcards(): FlashcardsApi {
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

  // Nạp lần đầu: KHÔNG setState đồng bộ trước await (tránh cascading render — như useVocabulary).
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

  const review = useCallback(
    async (vocab: LocalVocabulary, rating: SrsRating): Promise<LocalVocabulary> => {
      const next = await persistReview(
        { put: (value) => putVocabularyLocal(db, value), emit: emitDataChanged },
        vocab,
        rating,
        new Date(),
      );
      setAll((prev) => prev.map((item) => (item.id === next.id ? next : item)));
      return next;
    },
    [db],
  );

  return { all, status, error, reload, review };
}
