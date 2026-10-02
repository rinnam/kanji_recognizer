import { useMemo, useState, type ReactElement } from 'react';
import type { SrsRating } from '../../../entities/card';
import { Button, EmptyState, ErrorState, LoadingState } from '../../../shared/ui';
import { buildQueue, summarize } from '../model/queue';
import type { FlashcardMode } from '../model/types';
import { useFlashcards } from '../model/useFlashcards';
import { FlashcardCard } from './FlashcardCard';
import './flashcard.css';

const MODES: { id: FlashcardMode; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'progress', label: 'Progress' },
  { id: 'anki', label: 'Anki SRS' },
];

const RATINGS: { id: SrsRating; label: string }[] = [
  { id: 'again', label: 'Again' },
  { id: 'hard', label: 'Hard' },
  { id: 'good', label: 'Good' },
  { id: 'easy', label: 'Easy' },
];

/**
 * Màn ôn tập flashcard 3 chế độ (F3). Local-first:
 * - normal/progress: lật thẻ + điều hướng, không ghi SRS.
 * - anki: thẻ tới hạn + 4 nút đánh giá → áp SM-2, ghi srs* local, emit change-bus.
 * Đủ 4 trạng thái: loading / error / empty / ready.
 */
export function FlashcardStudy(): ReactElement {
  const api = useFlashcards();
  const [mode, setMode] = useState<FlashcardMode>('normal');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const summary = useMemo(() => summarize(api.all, new Date()), [api.all]);
  const queue = useMemo(() => buildQueue(api.all, mode, new Date()), [api.all, mode]);

  const changeMode = (next: FlashcardMode): void => {
    setMode(next);
    setIndex(0);
    setRevealed(false);
  };

  if (api.status === 'loading') {
    return <LoadingState label="Đang tải bộ thẻ…" />;
  }
  if (api.status === 'error') {
    return <ErrorState message={api.error ?? undefined} onRetry={() => void api.reload()} />;
  }

  const total = queue.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = total === 0 ? null : queue[safeIndex];

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
    // Thẻ vừa đánh giá rời khỏi danh sách "tới hạn" → hàng đợi tự co lại, giữ nguyên index.
    setRevealed(false);
  };

  return (
    <section className="kn-fc" aria-labelledby="fc-heading">
      <header className="kn-fc__head">
        <h2 id="fc-heading">Flashcard</h2>
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
        <p className="kn-fc__summary">
          Tổng {summary.total} · Tới hạn {summary.due} · Mới {summary.fresh} · Đã học{' '}
          {summary.learned}
        </p>
      </header>

      {current === null ? (
        <EmptyState
          title={mode === 'anki' ? 'Không còn thẻ tới hạn' : 'Chưa có thẻ nào'}
          description={
            mode === 'anki'
              ? 'Bạn đã ôn hết thẻ tới hạn. Quay lại sau hoặc thêm từ mới nhé.'
              : 'Hãy thêm từ vựng ở trang Thư viện trước đã.'
          }
        />
      ) : (
        <div className="kn-fc__stage">
          <p className="kn-fc__pos">
            {mode === 'anki'
              ? `Còn ${total} thẻ tới hạn`
              : `Thẻ ${safeIndex + 1} / ${total}`}
          </p>

          <FlashcardCard vocab={current} revealed={revealed} />

          {!revealed ? (
            <div className="kn-fc__controls">
              <Button variant="primary" onClick={() => setRevealed(true)}>
                Lật thẻ
              </Button>
            </div>
          ) : mode === 'anki' ? (
            <div className="kn-fc__controls kn-fc__ratings" aria-label="Đánh giá">
              {RATINGS.map((item) => (
                <Button key={item.id} onClick={() => void rate(item.id)}>
                  {item.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="kn-fc__controls">
              <Button onClick={goPrev} disabled={safeIndex === 0}>
                Trước
              </Button>
              <Button
                variant="primary"
                onClick={goNext}
                disabled={safeIndex >= total - 1}
              >
                Tiếp
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
