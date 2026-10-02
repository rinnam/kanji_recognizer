import { useMemo, useState, type ReactElement } from 'react';
import type { SrsRating } from '../../../entities/card';
import type { LocalVocabulary } from '../../../entities/vocabulary';
import { Button, EmptyState, ErrorState, LoadingState } from '../../../shared/ui';
import { buildQueue, summarize } from '../model/queue';
import type { FlashcardMode } from '../model/types';
import { useFlashcards } from '../model/useFlashcards';
import { useFlashcardKeys } from '../model/useFlashcardKeys';
import { FlashcardCard } from './FlashcardCard';
import './flashcard.css';

type ScopeKind = 'all' | 'first' | 'random';

const SCOPE_N = 20;

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
 * Màn Flashcard làm lại theo bố cục tham khảo (F3): thanh phạm vi + thẻ điều khiển
 * (chế độ + xáo trộn/làm lại) + thanh tiến độ + thẻ lớn (bấm/Space để lật) + điều hướng.
 * Phím tắt: Space lật · ← → chuyển · 1/2/3/4 chấm (Anki). Logic SM-2 giữ nguyên.
 */
export function FlashcardStudy(): ReactElement {
  const api = useFlashcards();
  const [mode, setMode] = useState<FlashcardMode>('normal');
  const [scope, setScope] = useState<ScopeKind>('all');
  const [pickedIds, setPickedIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const living = useMemo(() => api.all.filter((v) => v.deletedAt === null), [api.all]);
  const summary = useMemo(() => summarize(api.all, new Date()), [api.all]);
  const modeQueue = useMemo(() => buildQueue(api.all, mode, new Date()), [api.all, mode]);

  const queue = useMemo(() => {
    if (pickedIds === null) return modeQueue;
    const byId = new Map(modeQueue.map((v) => [v.id, v] as const));
    const out: LocalVocabulary[] = [];
    for (const id of pickedIds) {
      const found = byId.get(id);
      if (found !== undefined) out.push(found);
    }
    return out;
  }, [pickedIds, modeQueue]);

  const total = queue.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = total === 0 ? null : queue[safeIndex];

  const resetPos = (): void => {
    setIndex(0);
    setRevealed(false);
  };
  const changeMode = (next: FlashcardMode): void => {
    setMode(next);
    setScope('all');
    setPickedIds(null);
    resetPos();
  };
  const applyScope = (next: ScopeKind): void => {
    setScope(next);
    if (next === 'all') setPickedIds(null);
    else if (next === 'first') setPickedIds(modeQueue.slice(0, SCOPE_N).map((v) => v.id));
    else setPickedIds(shuffleIds(modeQueue.map((v) => v.id)).slice(0, SCOPE_N));
    resetPos();
  };
  const reshuffle = (): void => {
    setPickedIds(shuffleIds(pickedIds ?? modeQueue.map((v) => v.id)));
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

      <div className="kn-fc__scope">
        <span className="kn-fc__scope-label">
          Phạm vi: {total}/{living.length}
        </span>
        <div className="kn-fc__chips" role="group" aria-label="Phạm vi">
          <Button
            variant={scope === 'all' ? 'primary' : 'secondary'}
            onClick={() => applyScope('all')}
          >
            Tất cả
          </Button>
          <Button
            variant={scope === 'first' ? 'primary' : 'secondary'}
            onClick={() => applyScope('first')}
          >
            {SCOPE_N} từ đầu
          </Button>
          <Button
            variant={scope === 'random' ? 'primary' : 'secondary'}
            onClick={() => applyScope('random')}
          >
            Random {SCOPE_N}
          </Button>
        </div>
      </div>

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
          <Button onClick={reshuffle}>Xáo trộn</Button>
          <Button onClick={resetPos}>Làm lại</Button>
          <span className="kn-fc__summary">
            Tổng {summary.total} · Tới hạn {summary.due} · Mới {summary.fresh}
          </span>
        </div>
      </div>

      {total === 0 || current === null ? (
        <EmptyState
          title={mode === 'anki' ? 'Không còn thẻ tới hạn' : 'Chưa có thẻ nào'}
          description={
            mode === 'anki'
              ? 'Bạn đã ôn hết thẻ tới hạn trong phạm vi này. Đổi phạm vi hoặc quay lại sau.'
              : 'Thêm từ ở trang Thư viện, hoặc đổi phạm vi.'
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
            <div className="kn-fc__controls">
              <Button variant="primary" onClick={flip}>
                Lật thẻ <kbd className="kn-fc__kbd">Space</kbd>
              </Button>
            </div>
          ) : mode === 'anki' ? (
            <div className="kn-fc__controls kn-fc__ratings" aria-label="Đánh giá">
              {RATINGS.map((item) => (
                <Button key={item.id} onClick={() => void rate(item.id)}>
                  {item.label} <kbd className="kn-fc__kbd">{item.num}</kbd>
                </Button>
              ))}
            </div>
          ) : (
            <div className="kn-fc__controls">
              <Button onClick={goPrev} disabled={safeIndex === 0}>
                <kbd className="kn-fc__kbd">←</kbd> Trước
              </Button>
              <Button variant="primary" onClick={goNext} disabled={safeIndex >= total - 1}>
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
