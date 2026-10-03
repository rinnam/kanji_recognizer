import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAllFoldersLocal, type LocalFolder } from '../../../entities/folder';
import {
  getAllVocabulariesLocal,
  selectWordsInScope,
  type LocalVocabulary,
  type ScopeSelection,
} from '../../../entities/vocabulary';
import { ApiError, createQuizSession } from '../../../shared/api';
import { useDb } from '../../../shared/db';
import { nowIso } from '../../../shared/lib';
import type { ScopeKind } from '../../../shared/ui';
import {
  applyAnswer,
  applyHint,
  initialAttemptState,
  toOutcome,
  type AttemptState,
} from './attempt';
import { gradeAnswer } from './grade';
import { orderQuestions } from './order';
import { selectQuizPool } from './pool';
import { buildQuestions, type QuizMode } from './questions';
import { gradeSession, toCreateSessionInput } from './session';
import type { QuizQuestion, QuizResult } from './types';

type LoadStatus = 'loading' | 'error' | 'ready';
export type QuizPhase = 'active' | 'result';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

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
  attempt: AttemptState;
  result: QuizResult | null;
  saveStatus: SaveStatus;
  saveMessage: string | null;
  reload: () => Promise<void>;
  chooseMode: (mode: QuizMode) => void;
  chooseKind: (kind: ScopeKind) => void;
  changeN: (value: number) => void;
  shuffled: boolean;
  toggleShuffle: () => void;
  submit: (value: string) => void;
  hint: () => void;
  advance: () => void;
  restart: () => void;
}

const DEFAULT_N = 30;
const READ_ERROR = 'Không đọc được từ vựng.';

/** Sinh seed ngẫu nhiên cho một lần xáo (chỉ dùng khi BẬT công tắc Xáo trộn). */
function makeShuffleSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

/**
 * Điều phối typing quiz local-first (B2): nạp vocab + thư mục → phạm vi theo thư mục
 * (gồm con cháu) → chọn pool theo ScopeBar → bốc ngẫu nhiên thứ tự (Fisher–Yates) → dựng
 * câu hỏi theo chế độ (Ngẫu nhiên/Dạng 1/Dạng 2). Chấm CỤC BỘ (mirror BE), lưu phiên khi
 * online. KHÔNG đổi logic chấm.
 */
export function useQuiz(folderId: string | null, scope?: ScopeSelection): QuizApi {
  const db = useDb();
  const [all, setAll] = useState<LocalVocabulary[]>([]);
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<QuizMode>('random');
  const [kind, setKind] = useState<ScopeKind>('all');
  const [n, setN] = useState(DEFAULT_N);
  // Seed cho chip "Random" nội bộ: mỗi lần bấm Random tăng 1 để bốc lại (applyScope có seed).
  const [seed, setSeed] = useState(0);
  // Công tắc "Xáo trộn" (Phần 5A): BẬT (mặc định) = câu theo thứ tự ngẫu nhiên; TẮT = thứ tự
  // thêm (createdAt tăng dần). Seed xáo giữ ở ref — chỉ dùng lúc dựng, không gây render lại.
  const [shuffled, setShuffled] = useState(true);
  const shuffleSeedRef = useRef<number>(makeShuffleSeed());

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  // Trạng thái "3 lần thử" của câu HIỆN TẠI (6A). 'answering' = chưa chốt; 'correct'/'revealed' = đã chốt.
  const [attempt, setAttempt] = useState<AttemptState>(initialAttemptState());
  const [phase, setPhase] = useState<QuizPhase>('active');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const answersRef = useRef<(string | null)[]>([]);
  // Dữ liệu ghi chú mỗi câu để soát lại (attemptNo + usedHint), canh theo index câu hỏi.
  const outcomesRef = useRef<{ attemptNo: number; usedHint: boolean }[]>([]);
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

  // Chọn BỘ từ qua applyScope (một nguồn sự thật) → dựng câu hỏi GIỮ thứ tự thêm. Việc sắp
  // (ngẫu nhiên hay theo createdAt) tách sang orderQuestions, gọi ở startOrdered.
  const buildFor = useCallback(
    (m: QuizMode, selection: ScopeSelection, base: readonly LocalVocabulary[]): QuizQuestion[] =>
      buildQuestions(selectQuizPool(base, selection), m),
    [],
  );

  const resetProgress = useCallback((): void => {
    answersRef.current = [];
    outcomesRef.current = [];
    startedAtRef.current = nowIso();
    setIndex(0);
    setAttempt(initialAttemptState());
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

  // Sắp thứ tự câu hỏi theo công tắc Xáo trộn rồi bắt đầu phiên. BẬT = xáo tất định theo seed
  // MỚI (mỗi lần dựng một thứ tự khác); TẮT = thứ tự thêm (createdAt tăng dần), tất định.
  const startOrdered = useCallback(
    (qs: QuizQuestion[], shuffle: boolean): void => {
      if (shuffle) shuffleSeedRef.current = makeShuffleSeed();
      startWith(orderQuestions(qs, shuffle, shuffleSeedRef.current));
    },
    [startWith],
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
        // Phiên mặc định: Ngẫu nhiên + BẬT xáo → câu theo thứ tự ngẫu nhiên.
        startOrdered(buildFor('random', scope ?? { mode: 'all', n: DEFAULT_N, seed: 0 }, base), true);
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : READ_ERROR);
        setLoadStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [db, folderId, scope, buildFor, startOrdered]);

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
      startOrdered(buildFor(mode, scope ?? { mode: kind, n, seed }, base), shuffled);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : READ_ERROR);
      setLoadStatus('error');
    }
  }, [db, folderId, mode, kind, n, seed, scope, buildFor, startOrdered, shuffled]);

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
      const graded = gradeSession(questions, finalAnswers);
      // Gắn ghi chú mỗi câu (attemptNo + usedHint) để soát lại; payload BE KHÔNG dùng field này.
      const items = graded.items.map((item, i) => {
        const meta = outcomesRef.current[i];
        return {
          ...item,
          attemptNo: meta?.attemptNo ?? (item.userAnswer === null ? 0 : 1),
          usedHint: meta?.usedHint ?? false,
        };
      });
      const finished: QuizResult = { ...graded, items };
      setResult(finished);
      setPhase('result');
      void saveToServer(finished, startedAtRef.current);
    },
    [questions, saveToServer],
  );

  // Ghi kết quả cuối của câu (6A toOutcome): answersRef = chữ gõ cuối (null nếu chưa gõ),
  // outcomesRef = attemptNo + usedHint. Payload lưu phiên lên BE KHÔNG đổi.
  const commitOutcome = useCallback(
    (state: AttemptState): void => {
      const outcome = toOutcome(state);
      const nextAnswers = answersRef.current.slice();
      nextAnswers[index] = outcome.userAnswer;
      answersRef.current = nextAnswers;
      const nextOutcomes = outcomesRef.current.slice();
      nextOutcomes[index] = { attemptNo: outcome.attemptNo, usedHint: state.usedHint };
      outcomesRef.current = nextOutcomes;
    },
    [index],
  );

  // Nộp MỘT lần thử (6A). Đúng → 'correct'; sai còn lượt → 'answering' (giữ ở câu, chờ gõ lại);
  // sai lần cuối → 'revealed'. Chỉ khi CHỐT (correct/revealed) mới ghi kết quả câu.
  const submit = useCallback(
    (value: string): void => {
      if (attempt.status !== 'answering') return;
      const cur = index < questions.length ? questions[index] : null;
      if (cur === null) return;
      const isCorrect = gradeAnswer(value, cur.acceptedAnswers);
      const next = applyAnswer(attempt, isCorrect, value);
      setAttempt(next);
      if (next.status !== 'answering') commitOutcome(next);
    },
    [attempt, index, questions, commitOutcome],
  );

  // Bấm Gợi ý (6A): lộ đáp án ngay, tính SAI, đánh dấu usedHint rồi chốt câu.
  const hint = useCallback((): void => {
    if (attempt.status !== 'answering') return;
    const next = applyHint(attempt);
    setAttempt(next);
    commitOutcome(next);
  }, [attempt, commitOutcome]);

  const advance = useCallback((): void => {
    if (index >= questions.length - 1) {
      finishWith(answersRef.current);
      return;
    }
    setIndex(index + 1);
    setAttempt(initialAttemptState());
  }, [index, questions.length, finishWith]);

  const chooseMode = useCallback(
    (next: QuizMode): void => {
      setMode(next);
      startOrdered(buildFor(next, scope ?? { mode: kind, n, seed }, scopeBase), shuffled);
    },
    [scope, kind, n, seed, scopeBase, buildFor, startOrdered, shuffled],
  );
  // Chip Random bốc lại (seed + 1) kể cả khi đang ở Random. Chỉ dùng khi KHÔNG có prop scope.
  const chooseKind = useCallback(
    (next: ScopeKind): void => {
      const nextSeed = next === 'random' ? seed + 1 : seed;
      if (next === 'random') setSeed(nextSeed);
      setKind(next);
      startOrdered(buildFor(mode, { mode: next, n, seed: nextSeed }, scopeBase), shuffled);
    },
    [mode, n, seed, scopeBase, buildFor, startOrdered, shuffled],
  );
  const changeN = useCallback(
    (value: number): void => {
      const next = clampN(value);
      setN(next);
      startOrdered(buildFor(mode, { mode: kind, n: next, seed }, scopeBase), shuffled);
    },
    [mode, kind, seed, scopeBase, buildFor, startOrdered, clampN, shuffled],
  );
  // Công tắc Xáo trộn: đổi thứ tự BỘ câu hiện có (giữ nguyên loại câu), về câu 1. BẬT = xáo
  // ngẫu nhiên; TẮT = thứ tự thêm (createdAt tăng dần).
  const toggleShuffle = useCallback((): void => {
    const next = !shuffled;
    setShuffled(next);
    startOrdered(questions, next);
  }, [shuffled, questions, startOrdered]);
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
    attempt,
    result,
    saveStatus,
    saveMessage,
    reload,
    chooseMode,
    chooseKind,
    changeN,
    shuffled,
    toggleShuffle,
    submit,
    hint,
    advance,
    restart,
  };
}
