import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { SrsRating } from '../../../entities/card';
import { getAllFoldersLocal, type LocalFolder } from '../../../entities/folder';
import { selectWordsInScope, type LocalVocabulary } from '../../../entities/vocabulary';
import { useDb } from '../../../shared/db';
import { subscribeDataChanged } from '../../../shared/lib';
import {
  Button,
  EmptyState,
  ErrorState,
  IconReset,
  IconShuffle,
  LoadingState,
  ScopeBar,
  type ScopeKind,
} from '../../../shared/ui';
import { buildQueue, summarize } from '../model/queue';
import type { FlashcardMode } from '../model/types';
import { useFlashcards } from '../model/useFlashcards';
import { useFlashcardKeys } from '../model/useFlashcardKeys';
import { FlashcardCard } from './FlashcardCard';
import './flashcard.css';

interface FlashcardStudyProps {
  /** Thư mục đang chọn ở sidebar (null = tất cả) — phạm vi dữ liệu cho màn học. */
  folderId: string | null;
}

const DEFAULT_N = 30;

const MODES: { id: FlashcardMode; label: string }[] = [
  { id: 'normal', label: 'Bình thường' },
  { id: 'progress', label: 'Tiến độ' },
  { id: 'anki', label: 'Anki SRS' },
];

const RATINGS: { id: SrsRating; label: string; num: string }[] = [
  { id: 'again', label: 'Again', num: '1' },
  { id: 'hard', label: 'Hard', num: '2' },
  { id: 'good', label: 'Good', num: '3' },
  { id: 'easy', label: 'Easy', num: '4' },
];

/** So sánh createdAt tăng dần (tie-break id) — cho chip "N từ đầu". */
function byCreatedAtAsc(a: LocalVocabulary, b: LocalVocabulary): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Trộn thứ tự id (Fisher–Yates) — chỉ gọi trong event handler, không trong render. */
function shuffleIds(ids: readonly string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Màn Flashcard (B1) theo bố cục tham khảo: ScopeBar + StudyControls (chế độ + Xáo trộn/
 * Làm lại + thống kê) + thanh tiến độ + thẻ lớn (bấm/Space để lật) + CardNav. Phạm vi lấy
 * theo thư mục đang chọn (gồm thư mục con). Phím tắt & logic SM-2 giữ nguyên.
 */
export function FlashcardStudy({ folderId }: FlashcardStudyProps): ReactElement {
  const api = useFlashcards();
  const db = useDb();
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [mode, setMode] = useState<FlashcardMode>('normal');
  const [kind, setKind] = useState<ScopeKind>('all');
  const [n, setN] = useState(DEFAULT_N);
  const [pickedIds, setPickedIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Nạp thư mục còn sống để tính phạm vi (gồm thư mục con) — nghe thay đổi dữ liệu.
  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const rows = await getAllFoldersLocal(db);
      if (active) setFolders(rows.filter((item) => item.deletedAt === null));
    };
    void load();
    const unsubscribe = subscribeDataChanged(() => void load());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [db]);

  const scopeBase = useMemo(
    () => selectWordsInScope(api.all, folders, folderId),
    [api.all, folders, folderId],
  );
  const summary = useMemo(() => summarize(scopeBase, new Date()), [scopeBase]);
  const deck = useMemo(() => buildQueue(scopeBase, mode, new Date()), [scopeBase, mode]);

  const used = useMemo(() => {
    if (pickedIds === null) return deck;
    const byId = new Map(deck.map((v) => [v.id, v] as const));
    const out: LocalVocabulary[] = [];
    for (const id of pickedIds) {
      const found = byId.get(id);
      if (found !== undefined) out.push(found);
    }
    return out;
  }, [pickedIds, deck]);

  const total = used.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = total === 0 ? null : used[safeIndex];

  const clampN = (value: number): number =>
    Math.max(1, Math.min(Math.round(value), Math.max(1, deck.length)));
  const resetPos = (): void => {
    setIndex(0);
    setRevealed(false);
  };
  const pickFor = (next: ScopeKind, count: number): string[] | null => {
    if (next === 'all') return null;
    if (next === 'first') {
      return [...deck].sort(byCreatedAtAsc).slice(0, count).map((v) => v.id);
    }
    return shuffleIds(deck.map((v) => v.id)).slice(0, count);
  };
  const changeMode = (next: FlashcardMode): void => {
    setMode(next);
    setKind('all');
    setPickedIds(null);
    resetPos();
  };
  const applyKind = (next: ScopeKind): void => {
    setKind(next);
    setPickedIds(pickFor(next, clampN(n)));
    resetPos();
  };
  const changeN = (value: number): void => {
    const next = clampN(value);
    setN(next);
    if (kind !== 'all') setPickedIds(pickFor(kind, next));
    resetPos();
  };
  const reshuffle = (): void => {
    const ids = pickedIds ?? deck.map((v) => v.id);
    setPickedIds(shuffleIds(ids));
    resetPos();
  };
  const flip = (): void => setRevealed((value) => !value);
  const goNext = (): void => {
    setIndex(() => Math.min(safeIndex + 1, total - 1));
    setRevealed(false);
  };
  const goPrev = (): void => {
    setIndex(() => Math.max(safeIndex - 1, 0));
    setRevealed(false);
  };
  const rate = async (rating: SrsRating): Promise<void> => {
    if (current === null) return;
    await api.review(current, rating);
    // Thẻ vừa chấm rời hàng đợi tới hạn → giữ nguyên index để thẻ kế trám vào chỗ đó.
    setRevealed(false);
  };

  useFlashcardKeys({
    mode,
    revealed,
    index: safeIndex,
    total,
    onFlip: flip,
    onNext: goNext,
    onPrev: goPrev,
    onGrade: (rating) => void rate(rating),
  });

  if (api.status === 'loading') {
    return <LoadingState label="Đang tải bộ thẻ…" />;
  }
  if (api.status === 'error') {
    return <ErrorState message={api.error ?? undefined} onRetry={() => void api.reload()} />;
  }

  const progressPct = total === 0 ? 0 : Math.round(((safeIndex + 1) / total) * 100);

  return (
    <section className="kn-fc" aria-labelledby="fc-heading">
      <h2 id="fc-heading" className="kn-fc__sr-only">
        Flashcard
      </h2>

      <ScopeBar
        total={deck.length}
        used={total}
        kind={kind}
        n={n}
        onKindChange={applyKind}
        onNChange={changeN}
      />

      <div className="kn-fc__control">
        <div className="kn-fc__modes" role="group" aria-label="Chế độ học">
          {MODES.map((item) => (
            <Button
              key={item.id}
              aria-pressed={item.id === mode}
              variant={item.id === mode ? 'primary' : 'secondary'}
              onClick={() => changeMode(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="kn-fc__tools">
          <button
            type="button"
            className="kn-fc__icon-btn"
            aria-label="Xáo trộn thẻ"
            title="Xáo trộn"
            onClick={reshuffle}
          >
            <IconShuffle />
          </button>
          <button
            type="button"
            className="kn-fc__icon-btn"
            aria-label="Làm lại từ thẻ đầu"
            title="Làm lại"
            onClick={resetPos}
          >
            <IconReset />
          </button>
          <span className="kn-fc__summary">
            Tổng {summary.total} · Tới hạn {summary.due} · Mới {summary.fresh}
          </span>
        </div>
      </div>

      {scopeBase.length === 0 ? (
        <EmptyState
          title="Thư mục này chưa có từ"
          description="Thêm từ ở tab Tổng quan rồi quay lại học."
        />
      ) : total === 0 || current === null ? (
        <EmptyState
          title={mode === 'anki' ? 'Không còn thẻ tới hạn' : 'Chưa có thẻ'}
          description={
            mode === 'anki'
              ? 'Đã ôn hết thẻ tới hạn trong phạm vi này. Đổi chế độ hoặc quay lại sau.'
              : 'Giảm phạm vi hoặc thêm từ ở tab Tổng quan.'
          }
        />
      ) : (
        <>
          <div className="kn-fc__progress">
            <span className="kn-fc__counter">
              {safeIndex + 1}/{total}
            </span>
            <div className="kn-fc__bar">
              <div className="kn-fc__bar-fill" style={{ width: `${String(progressPct)}%` }} />
            </div>
          </div>

          <div
            className="kn-fc__card-wrap"
            role="button"
            tabIndex={0}
            aria-label="Lật thẻ"
            onClick={flip}
          >
            <FlashcardCard vocab={current} revealed={revealed} />
          </div>

          {!revealed ? (
            <div className="kn-fc__nav">
              <Button variant="primary" onClick={flip}>
                Lật thẻ <kbd className="kn-fc__kbd">Space</kbd>
              </Button>
            </div>
          ) : mode === 'anki' ? (
            <div className="kn-fc__nav kn-fc__ratings" aria-label="Đánh giá">
              {RATINGS.map((item) => (
                <Button key={item.id} onClick={() => void rate(item.id)}>
                  {item.label} <kbd className="kn-fc__kbd">{item.num}</kbd>
                </Button>
              ))}
            </div>
          ) : (
            <div className="kn-fc__nav">
              <Button onClick={goPrev} disabled={safeIndex === 0}>
                <kbd className="kn-fc__kbd">←</kbd> Trước
              </Button>
              <Button
                variant="primary"
                onClick={goNext}
                disabled={safeIndex >= total - 1}
              >
                Tiếp theo <kbd className="kn-fc__kbd">→</kbd>
              </Button>
            </div>
          )}

          <p className="kn-fc__hint-keys">
            Space: lật thẻ · ← →: chuyển thẻ
            {mode === 'anki' ? ' · 1/2/3/4: chấm điểm' : ''}
          </p>
        </>
      )}
    </section>
  );
}
