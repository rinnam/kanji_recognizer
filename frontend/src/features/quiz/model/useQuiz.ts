import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAllVocabulariesLocal,
  type LocalVocabulary,
} from '../../../entities/vocabulary';
import { ApiError, createQuizSession } from '../../../shared/api';
import { useDb } from '../../../shared/db';
import { nowIso } from '../../../shared/lib';
import { buildQuestions } from './questions';
import { gradeSession, toCreateSessionInput } from './session';
import type { QuizDirection, QuizQuestion, QuizResult } from './types';

type LoadStatus = 'loading' | 'error' | 'ready';
export type QuizPhase = 'config' | 'active' | 'result';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export interface QuizApi {
  loadStatus: LoadStatus;
  loadError: string | null;
  availableCount: number;
  phase: QuizPhase;
  questions: QuizQuestion[];
  index: number;
  current: QuizQuestion | null;
  result: QuizResult | null;
  saveStatus: SaveStatus;
  saveMessage: string | null;
  reload: () => Promise<void>;
  start: (direction: QuizDirection, limit: number) => void;
  answer: (value: string) => void;
  restart: () => void;
}

const READ_ERROR = 'Không đọc được từ vựng.';

/** Trộn thứ tự (Fisher–Yates) để mỗi phiên quiz khác nhau — chỉ gọi trong event handler. */
function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Điều phối typing quiz local-first: nạp vocab, sinh câu, chấm CỤC BỘ (mirror BE),
 * và lưu phiên lên BE khi online. Kết quả cục bộ luôn hiển thị kể cả khi lưu thất bại.
 */
export function useQuiz(): QuizApi {
  const db = useDb();
  const [all, setAll] = useState<LocalVocabulary[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phase, setPhase] = useState<QuizPhase>('config');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const answersRef = useRef<(string | null)[]>([]);
  const startedAtRef = useRef<string>('');

  const fetchLiving = useCallback(async (): Promise<LocalVocabulary[]> => {
    const rows = await getAllVocabulariesLocal(db);
    return rows.filter((item) => item.deletedAt === null);
  }, [db]);

  const reload = useCallback(async (): Promise<void> => {
    setLoadStatus('loading');
    try {
      setAll(await fetchLiving());
      setLoadError(null);
      setLoadStatus('ready');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : READ_ERROR);
      setLoadStatus('error');
    }
  }, [fetchLiving]);

  useEffect(() => {
    let active = true;
    void (async (): Promise<void> => {
      try {
        const living = await fetchLiving();
        if (!active) return;
        setAll(living);
        setLoadError(null);
        setLoadStatus('ready');
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : READ_ERROR);
        setLoadStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchLiving]);

  // Cả hai hướng đều cần word + meaning → số câu khả dụng như nhau.
  const availableCount = useMemo(() => buildQuestions(all, 'viToJa').length, [all]);

  const saveToServer = useCallback(
    async (finished: QuizResult, startedAt: string): Promise<void> => {
      if (finished.total === 0) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSaveStatus('offline');
        setSaveMessage('Đang offline — phiên chưa lưu lên server. Kết quả cục bộ vẫn hiển thị.');
        return;
      }
      setSaveStatus('saving');
      setSaveMessage(null);
      try {
        await createQuizSession(
          toCreateSessionInput(finished, {
            mode: 'typing',
            startedAt,
            finishedAt: nowIso(),
          }),
        );
        setSaveStatus('saved');
        setSaveMessage('Đã lưu phiên lên server.');
      } catch (err) {
        const base = err instanceof ApiError ? err.message : 'Không lưu được phiên lên server.';
        setSaveStatus('error');
        setSaveMessage(`${base} Kết quả cục bộ vẫn hiển thị (có thể do từ chưa đồng bộ lên server).`);
      }
    },
    [],
  );

  const finishWith = useCallback(
    (finalAnswers: readonly (string | null)[]): void => {
      const finished = gradeSession(questions, finalAnswers);
      setResult(finished);
      setPhase('result');
      void saveToServer(finished, startedAtRef.current);
    },
    [questions, saveToServer],
  );

  const start = useCallback(
    (direction: QuizDirection, limit: number): void => {
      const chosen = buildQuestions(shuffled(all), direction, limit);
      if (chosen.length === 0) return;
      setQuestions(chosen);
      answersRef.current = [];
      startedAtRef.current = nowIso();
      setIndex(0);
      setResult(null);
      setSaveStatus('idle');
      setSaveMessage(null);
      setPhase('active');
    },
    [all],
  );

  const answer = useCallback(
    (value: string): void => {
      const next = answersRef.current.slice();
      next[index] = value.trim() === '' ? null : value;
      answersRef.current = next;
      if (index >= questions.length - 1) {
        finishWith(next);
      } else {
        setIndex(index + 1);
      }
    },
    [index, questions.length, finishWith],
  );

  const restart = useCallback((): void => {
    setPhase('config');
    setQuestions([]);
    answersRef.current = [];
    setIndex(0);
    setResult(null);
    setSaveStatus('idle');
    setSaveMessage(null);
  }, []);

  const current = index < questions.length ? questions[index] : null;

  return {
    loadStatus,
    loadError,
    availableCount,
    phase,
    questions,
    index,
    current,
    result,
    saveStatus,
    saveMessage,
    reload,
    start,
    answer,
    restart,
  };
}
