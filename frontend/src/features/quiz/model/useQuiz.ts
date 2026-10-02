import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAllVocabulariesLocal,
  type LocalVocabulary,
} from '../../../entities/vocabulary';
import { ApiError, createQuizSession } from '../../../shared/api';
import { useDb } from '../../../shared/db';
import { nowIso } from '../../../shared/lib';
import { gradeAnswer } from './grade';
import { buildQuestions } from './questions';
import { gradeSession, toCreateSessionInput } from './session';
import type { QuizDirection, QuizQuestion, QuizResult } from './types';

type LoadStatus = 'loading' | 'error' | 'ready';
export type QuizPhase = 'active' | 'result';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';
export type QuizScope = 'all' | 'first' | 'random';

export interface QuizFeedback {
  answer: string | null;
  correct: boolean;
}

export interface QuizApi {
  loadStatus: LoadStatus;
  loadError: string | null;
  availableCount: number;
  direction: QuizDirection;
  scope: QuizScope;
  phase: QuizPhase;
  questions: QuizQuestion[];
  index: number;
  total: number;
  current: QuizQuestion | null;
  currentVocab: LocalVocabulary | null;
  submitted: boolean;
  feedback: QuizFeedback | null;
  result: QuizResult | null;
  saveStatus: SaveStatus;
  saveMessage: string | null;
  reload: () => Promise<void>;
  chooseDirection: (direction: QuizDirection) => void;
  chooseScope: (scope: QuizScope) => void;
  reshuffle: () => void;
  submit: (value: string) => void;
  skip: () => void;
  advance: () => void;
  restart: () => void;
}

const SCOPE_N = 20;
const READ_ERROR = 'Không đọc được từ vựng.';

function shuffle<T>(items: readonly T[]): T[] {
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
 * Điều phối typing quiz local-first (F4): nạp vocab, dựng câu hỏi theo kiểu hỏi + phạm vi,
 * chấm CỤC BỘ từng câu (phản hồi ngay), lưu phiên lên BE khi online. Pha: active → result.
 * KHÔNG đổi logic chấm (mirror BE) — chỉ thêm luồng nộp/bỏ qua/tiếp.
 */
export function useQuiz(): QuizApi {
  const db = useDb();
  const [all, setAll] = useState<LocalVocabulary[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [direction, setDirection] = useState<QuizDirection>('viToJa');
  const [scope, setScope] = useState<QuizScope>('all');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [phase, setPhase] = useState<QuizPhase>('active');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const answersRef = useRef<(string | null)[]>([]);
  const startedAtRef = useRef<string>('');

  const fetchLiving = useCallback(async (): Promise<LocalVocabulary[]> => {
    const rows = await getAllVocabulariesLocal(db);
    return rows.filter((item) => item.deletedAt === null);
  }, [db]);

  const buildFor = useCallback(
    (
      dir: QuizDirection,
      scp: QuizScope,
      pool: readonly LocalVocabulary[],
      forceShuffle: boolean,
    ): QuizQuestion[] => {
      const base = scp === 'random' || forceShuffle ? shuffle(pool) : pool;
      const limit = scp === 'all' ? undefined : SCOPE_N;
      return buildQuestions(base, dir, limit);
    },
    [],
  );

  const startWith = useCallback((qs: QuizQuestion[]): void => {
    setQuestions(qs);
    answersRef.current = [];
    startedAtRef.current = nowIso();
    setIndex(0);
    setSubmitted(false);
    setFeedback(null);
    setResult(null);
    setSaveStatus('idle');
    setSaveMessage(null);
    setPhase('active');
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    setLoadStatus('loading');
    try {
      const living = await fetchLiving();
      setAll(living);
      setLoadError(null);
      setLoadStatus('ready');
      startWith(buildFor(direction, scope, living, false));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : READ_ERROR);
      setLoadStatus('error');
    }
  }, [fetchLiving, buildFor, direction, scope, startWith]);

  // Nạp lần đầu: setState chỉ sau await (tránh set-state-in-effect, như useVocabulary).
  useEffect(() => {
    let active = true;
    void (async (): Promise<void> => {
      try {
        const living = await fetchLiving();
        if (!active) return;
        setAll(living);
        setLoadError(null);
        setLoadStatus('ready');
        startWith(buildQuestions(living, 'viToJa', undefined));
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : READ_ERROR);
        setLoadStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchLiving, startWith]);

  const allById = useMemo(() => {
    const map = new Map<string, LocalVocabulary>();
    for (const vocab of all) map.set(vocab.id, vocab);
    return map;
  }, [all]);

  const availableCount = useMemo(() => buildQuestions(all, 'viToJa').length, [all]);

  const total = questions.length;
  const current = index < total ? questions[index] : null;
  const currentVocab =
    current !== null ? allById.get(current.vocabularyId) ?? null : null;

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

  const chooseDirection = useCallback(
    (dir: QuizDirection): void => {
      setDirection(dir);
      startWith(buildFor(dir, scope, all, false));
    },
    [scope, all, buildFor, startWith],
  );

  const chooseScope = useCallback(
    (scp: QuizScope): void => {
      setScope(scp);
      startWith(buildFor(direction, scp, all, false));
    },
    [direction, all, buildFor, startWith],
  );

  const reshuffle = useCallback((): void => {
    startWith(buildFor(direction, scope, all, true));
  }, [direction, scope, all, buildFor, startWith]);

  const restart = useCallback((): void => {
    startWith(buildFor(direction, scope, all, scope === 'random'));
  }, [direction, scope, all, buildFor, startWith]);

  const submit = useCallback(
    (value: string): void => {
      if (submitted) return;
      const cur = index < questions.length ? questions[index] : null;
      if (cur === null) return;
      const clean = value.trim() === '' ? null : value;
      const next = answersRef.current.slice();
      next[index] = clean;
      answersRef.current = next;
      setFeedback({ answer: clean, correct: gradeAnswer(clean, cur.acceptedAnswers) });
      setSubmitted(true);
    },
    [submitted, index, questions],
  );

  const advance = useCallback((): void => {
    if (index >= questions.length - 1) {
      finishWith(answersRef.current);
      return;
    }
    setIndex(index + 1);
    setSubmitted(false);
    setFeedback(null);
  }, [index, questions.length, finishWith]);

  const skip = useCallback((): void => {
    if (submitted) return;
    const next = answersRef.current.slice();
    next[index] = null;
    answersRef.current = next;
    if (index >= questions.length - 1) {
      finishWith(next);
      return;
    }
    setIndex(index + 1);
    setFeedback(null);
  }, [submitted, index, questions.length, finishWith]);

  return {
    loadStatus,
    loadError,
    availableCount,
    direction,
    scope,
    phase,
    questions,
    index,
    total,
    current,
    currentVocab,
    submitted,
    feedback,
    result,
    saveStatus,
    saveMessage,
    reload,
    chooseDirection,
    chooseScope,
    reshuffle,
    submit,
    skip,
    advance,
    restart,
  };
}
