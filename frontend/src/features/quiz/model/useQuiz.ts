import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAllFoldersLocal, type LocalFolder } from '../../../entities/folder';
import {
  getAllVocabulariesLocal,
  selectWordsInScope,
  type LocalVocabulary,
} from '../../../entities/vocabulary';
import { ApiError, createQuizSession } from '../../../shared/api';
import { useDb } from '../../../shared/db';
import { nowIso } from '../../../shared/lib';
import type { ScopeKind } from '../../../shared/ui';
import { gradeAnswer } from './grade';
import { buildQuestions, type QuizMode } from './questions';
import { gradeSession, toCreateSessionInput } from './session';
import type { QuizQuestion, QuizResult } from './types';

type LoadStatus = 'loading' | 'error' | 'ready';
export type QuizPhase = 'active' | 'result';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export interface QuizFeedback {
  answer: string | null;
  correct: boolean;
}

export interface QuizApi {
  loadStatus: LoadStatus;
  loadError: string | null;
  mode: QuizMode;
  kind: ScopeKind;
  n: number;
  scopeTotal: number;
  phase: QuizPhase;
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
  chooseMode: (mode: QuizMode) => void;
  chooseKind: (kind: ScopeKind) => void;
  changeN: (value: number) => void;
  reshuffle: () => void;
  submit: (value: string) => void;
  skip: () => void;
  advance: () => void;
  restart: () => void;
}

const DEFAULT_N = 30;
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

function byCreatedAtAsc(a: LocalVocabulary, b: LocalVocabulary): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Điều phối typing quiz local-first (B2): nạp vocab + thư mục → phạm vi theo thư mục
 * (gồm con cháu) → chọn pool theo ScopeBar → bốc ngẫu nhiên thứ tự (Fisher–Yates) → dựng
 * câu hỏi theo chế độ (Ngẫu nhiên/Dạng 1/Dạng 2). Chấm CỤC BỘ (mirror BE), lưu phiên khi
 * online. KHÔNG đổi logic chấm.
 */
export function useQuiz(folderId: string | null): QuizApi {
  const db = useDb();
  const [all, setAll] = useState<LocalVocabulary[]>([]);
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<QuizMode>('random');
  const [kind, setKind] = useState<ScopeKind>('all');
  const [n, setN] = useState(DEFAULT_N);

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

  const scopeBase = useMemo(
    () => selectWordsInScope(all, folders, folderId),
    [all, folders, folderId],
  );
  const scopeTotal = scopeBase.length;

  const clampN = useCallback(
    (value: number): number =>
      Math.max(1, Math.min(Math.round(value) || 1, Math.max(1, scopeBase.length))),
    [scopeBase.length],
  );

  // Chọn pool theo chip rồi bốc ngẫu nhiên thứ tự, cuối cùng dựng câu hỏi theo chế độ.
  const buildFor = useCallback(
    (m: QuizMode, k: ScopeKind, nn: number, base: readonly LocalVocabulary[]): QuizQuestion[] => {
      let pool: LocalVocabulary[];
      if (k === 'all') pool = [...base];
      else if (k === 'first') pool = [...base].sort(byCreatedAtAsc).slice(0, Math.min(nn, base.length));
      else pool = shuffle(base).slice(0, Math.min(nn, base.length));
      return buildQuestions(shuffle(pool), m);
    },
    [],
  );

  const resetProgress = useCallback((): void => {
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

  const startWith = useCallback(
    (qs: QuizQuestion[]): void => {
      setQuestions(qs);
      resetProgress();
    },
    [resetProgress],
  );

  // Nạp vocab + thư mục rồi dựng phiên mặc định (Ngẫu nhiên / tất cả). folderId cố định theo
  // vòng đời instance (WorkspacePage remount bằng key khi đổi thư mục).
  useEffect(() => {
    let active = true;
    void (async (): Promise<void> => {
      try {
        const [vocabRows, folderRows] = await Promise.all([
          getAllVocabulariesLocal(db),
          getAllFoldersLocal(db),
        ]);
        if (!active) return;
        const livingVocab = vocabRows.filter((item) => item.deletedAt === null);
        const livingFolders = folderRows.filter((item) => item.deletedAt === null);
        setAll(livingVocab);
        setFolders(livingFolders);
        setLoadError(null);
        setLoadStatus('ready');
        const base = selectWordsInScope(livingVocab, livingFolders, folderId);
        startWith(buildFor('random', 'all', DEFAULT_N, base));
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : READ_ERROR);
        setLoadStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [db, folderId, buildFor, startWith]);

  const reload = useCallback(async (): Promise<void> => {
    setLoadStatus('loading');
    try {
      const [vocabRows, folderRows] = await Promise.all([
        getAllVocabulariesLocal(db),
        getAllFoldersLocal(db),
      ]);
      const livingVocab = vocabRows.filter((item) => item.deletedAt === null);
      const livingFolders = folderRows.filter((item) => item.deletedAt === null);
      setAll(livingVocab);
      setFolders(livingFolders);
      setLoadError(null);
      setLoadStatus('ready');
      const base = selectWordsInScope(livingVocab, livingFolders, folderId);
      startWith(buildFor(mode, kind, n, base));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : READ_ERROR);
      setLoadStatus('error');
    }
  }, [db, folderId, mode, kind, n, buildFor, startWith]);

  const allById = useMemo(() => {
    const map = new Map<string, LocalVocabulary>();
    for (const vocab of all) map.set(vocab.id, vocab);
    return map;
  }, [all]);

  const total = questions.length;
  const current = index < total ? questions[index] : null;
  const currentVocab = current !== null ? allById.get(current.vocabularyId) ?? null : null;

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

  const chooseMode = useCallback(
    (next: QuizMode): void => {
      setMode(next);
      startWith(buildFor(next, kind, n, scopeBase));
    },
    [kind, n, scopeBase, buildFor, startWith],
  );
  const chooseKind = useCallback(
    (next: ScopeKind): void => {
      setKind(next);
      startWith(buildFor(mode, next, n, scopeBase));
    },
    [mode, n, scopeBase, buildFor, startWith],
  );
  const changeN = useCallback(
    (value: number): void => {
      const next = clampN(value);
      setN(next);
      startWith(buildFor(mode, kind, next, scopeBase));
    },
    [mode, kind, scopeBase, buildFor, startWith, clampN],
  );
  // Xáo trộn: trộn lại thứ tự bộ câu hiện có (giữ nguyên loại câu), về câu 1.
  const reshuffle = useCallback((): void => {
    startWith(shuffle(questions));
  }, [questions, startWith]);
  // Làm lại: về câu 1, xóa kết quả, GIỮ nguyên bộ câu + thứ tự.
  const restart = useCallback((): void => {
    resetProgress();
  }, [resetProgress]);

  return {
    loadStatus,
    loadError,
    mode,
    kind,
    n,
    scopeTotal,
    phase,
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
    chooseMode,
    chooseKind,
    changeN,
    reshuffle,
    submit,
    skip,
    advance,
    restart,
  };
}
