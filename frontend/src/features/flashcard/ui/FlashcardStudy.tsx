import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  previewIntervalLabel,
  type SrsRating,
  type SrsState,
} from '../../../entities/card';
import { getAllFoldersLocal, type LocalFolder } from '../../../entities/folder';
import {
  applyScope,
  putVocabularyLocal,
  selectWordsInScope,
  type LocalVocabulary,
  type ScopeSelection,
} from '../../../entities/vocabulary';
import { useDb } from '../../../shared/db';
import {
  emitDataChanged,
  selectSpeechPrompt,
  speakJapanese,
  subscribeDataChanged,
} from '../../../shared/lib';
import {
  Button,
  EmptyState,
  ErrorState,
  IconArrowLeft,
  IconArrowRight,
  IconReset,
  IconShuffle,
  LoadingState,
  Modal,
  ScopeBar,
  ToggleIconButton,
  type ScopeKind,
} from '../../../shared/ui';
import { EditVocabularyModal } from '../../vocabulary';
import { buildQueue, buildReviewAheadQueue, nextDueAt, summarize } from '../model/queue';
import { selectResetTargets } from '../model/reset';
import type { FlashcardMode } from '../model/types';
import { useFlashcards } from '../model/useFlashcards';
import { useFlashcardKeys } from '../model/useFlashcardKeys';
import { FlashcardCard } from './FlashcardCard';
import './flashcard.css';

interface FlashcardStudyProps {
  /** Thư mục đang chọn ở sidebar (null = tất cả) — phạm vi dữ liệu cho màn học. */
  folderId: string | null;
  /**
   * Phạm vi chọn thẻ do page truyền xuống (3C/3E). Khi CÓ: ẩn ScopeBar nội bộ và chọn
   * bộ thẻ bằng applyScope. Khi KHÔNG: dùng ScopeBar + chip nội bộ (tương thích ngược).
   */
  scope?: ScopeSelection;
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

/** Định dạng mốc tới hạn (ISO) sang ngày giờ ngắn gọn tiếng Việt. */
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Màn Flashcard (B1) theo bố cục tham khảo: ScopeBar + StudyControls (chế độ + Xáo trộn/
 * Làm lại + thống kê) + thanh tiến độ + thẻ lớn (bấm/Space để lật) + CardNav. Phạm vi lấy
 * theo thư mục đang chọn (gồm thư mục con). Phím tắt & logic SM-2 giữ nguyên.
 */
export function FlashcardStudy({ folderId, scope }: FlashcardStudyProps): ReactElement {
  const api = useFlashcards();
  const db = useDb();
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [mode, setMode] = useState<FlashcardMode>('normal');
  const [kind, setKind] = useState<ScopeKind>('all');
  const [n, setN] = useState(DEFAULT_N);
  // Seed cho chip "Random" nội bộ: mỗi lần bấm Random tăng 1 để bốc lại (applyScope có seed).
  const [seed, setSeed] = useState(0);
  const [pickedIds, setPickedIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Công tắc "Xáo trộn": khi bật, giữ MỘT thứ tự Fisher–Yates ổn định (không xáo lại mỗi render).
  const [shuffled, setShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState<string[] | null>(null);
  // Anki: hàng đợi phiên học (session queue) để lặp lại thẻ Again trong ngày đến khi thuộc.
  const [sessionQueueIds, setSessionQueueIds] = useState<string[] | null>(null);
  // Anki: chế độ "Ôn trước hạn" (nạp thẻ chưa tới hạn) khi hàng đợi tới hạn đã rỗng.
  const [reviewAhead, setReviewAhead] = useState(false);
  // "Làm lại" ở Anki = nạp lại hàng đợi: cập nhật mốc thời gian "now" (KHÔNG đụng srs*).
  const [now, setNow] = useState<Date>(() => new Date());
  // Modal "Đặt lại tiến độ SRS".
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Modal chỉnh sửa thẻ trực tiếp khi học
  const [editOpen, setEditOpen] = useState(false);

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
  const summary = useMemo(() => summarize(scopeBase, now), [scopeBase, now]);

  // Hàng đợi Anki tới hạn + hàng đợi "Ôn trước hạn" (THUẦN). "now" là mốc thời gian; bấm
  // "Làm lại" cập nhật "now" để NẠP LẠI danh sách khi thời gian trôi (KHÔNG đụng srs*).
  const ankiDueDeck = useMemo(() => buildQueue(scopeBase, 'anki', now), [scopeBase, now]);
  const reviewAheadDeck = useMemo(
    () => buildReviewAheadQueue(scopeBase, now),
    [scopeBase, now],
  );
  const nextDue = useMemo(() => nextDueAt(scopeBase, now), [scopeBase, now]);
  const resetTargets = useMemo(() => selectResetTargets(scopeBase), [scopeBase]);

  const deck = useMemo(() => {
    if (mode === 'anki') return reviewAhead ? reviewAheadDeck : ankiDueDeck;
    return buildQueue(scopeBase, mode, now);
  }, [mode, reviewAhead, reviewAheadDeck, ankiDueDeck, scopeBase, now]);

  // Bộ thẻ sau khi áp phạm vi. Nguồn sự thật: applyScope. Ưu tiên prop `scope` (từ page);
  // nếu không có prop thì dùng `pickedIds` do chip nội bộ chốt (giữ ổn định khi deck đổi).
  const baseUsed = useMemo(() => {
    if (scope !== undefined) {
      return scope.mode === 'all' ? deck : applyScope(deck, scope);
    }
    if (pickedIds === null) return deck;
    const byId = new Map(deck.map((v) => [v.id, v] as const));
    const out: LocalVocabulary[] = [];
    for (const id of pickedIds) {
      const found = byId.get(id);
      if (found !== undefined) out.push(found);
    }
    return out;
  }, [scope, pickedIds, deck]);

  // Công tắc "Xáo trộn": sắp lại baseUsed theo thứ tự đã CHỐT (ổn định) — lọc id còn tồn
  // tại và nối id mới ở cuối (giữ ổn định khi bộ thẻ đổi do chấm điểm/nạp lại).
  const used = useMemo(() => {
    if (!shuffled || shuffleSeed === null) return baseUsed;
    const byId = new Map(baseUsed.map((v) => [v.id, v] as const));
    const out: LocalVocabulary[] = [];
    const seen = new Set<string>();
    for (const id of shuffleSeed) {
      const found = byId.get(id);
      if (found !== undefined) {
        out.push(found);
        seen.add(id);
      }
    }
    for (const v of baseUsed) if (!seen.has(v.id)) out.push(v);
    return out;
  }, [shuffled, shuffleSeed, baseUsed]);

  // Khi ở chế độ Anki, hàng đợi phiên học được quản lý bởi sessionQueueIds:
  // - Bấm Again: thẻ được chuyển về cuối danh sách phiên học (để ôn lại trong ngày).
  // - Bấm Hard/Good/Easy: thẻ hoàn thành phiên học (rời khỏi phiên).
  const ankiSessionDeck = useMemo(() => {
    if (sessionQueueIds === null) return used;
    const byId = new Map(scopeBase.map((v) => [v.id, v] as const));
    const out: LocalVocabulary[] = [];
    for (const id of sessionQueueIds) {
      const found = byId.get(id);
      if (found !== undefined) out.push(found);
    }
    return out;
  }, [sessionQueueIds, used, scopeBase]);

  const displayedDeck = mode === 'anki' ? ankiSessionDeck : used;
  const total = displayedDeck.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = total === 0 ? null : displayedDeck[safeIndex];

  const clampN = (value: number): number =>
    Math.max(1, Math.min(Math.round(value), Math.max(1, deck.length)));
  const resetPos = (): void => {
    setIndex(0);
    setRevealed(false);
  };
  // Chốt id bộ thẻ theo chip nội bộ, qua applyScope (một nguồn sự thật). 'all' → null (cả deck).
  const pickFor = (selection: ScopeSelection): string[] | null => {
    if (selection.mode === 'all') return null;
    return applyScope(deck, selection).map((v) => v.id);
  };
  const clearShuffle = (): void => {
    setShuffled(false);
    setShuffleSeed(null);
  };
  const changeMode = (next: FlashcardMode): void => {
    setMode(next);
    setKind('all');
    setPickedIds(null);
    setReviewAhead(false);
    setSessionQueueIds(null);
    clearShuffle();
    resetPos();
  };
  const applyKind = (next: ScopeKind): void => {
    // Bấm "Random" (kể cả khi đang ở Random) tăng seed để bốc lại bộ thẻ.
    const nextSeed = next === 'random' ? seed + 1 : seed;
    if (next === 'random') setSeed(nextSeed);
    setKind(next);
    setPickedIds(pickFor({ mode: next, n: clampN(n), seed: nextSeed }));
    setSessionQueueIds(null);
    clearShuffle();
    resetPos();
  };
  const changeN = (value: number): void => {
    const next = clampN(value);
    setN(next);
    if (kind !== 'all') setPickedIds(pickFor({ mode: kind, n: next, seed }));
    setSessionQueueIds(null);
    clearShuffle();
    resetPos();
  };
  // "Xáo trộn" là CÔNG TẮC: bật = chốt MỘT thứ tự xáo (ổn định); tắt = về thứ tự mặc định.
  const toggleShuffle = (): void => {
    const next = !shuffled;
    setShuffled(next);
    setShuffleSeed(next ? shuffleIds(baseUsed.map((v) => v.id)) : null);
    setSessionQueueIds(null);
    resetPos();
  };
  // "Làm lại" là NÚT HÀNH ĐỘNG: về thẻ đầu + mặt trước; ở Anki nạp lại hàng đợi (KHÔNG đụng srs*).
  const redo = (): void => {
    setNow(new Date());
    setSessionQueueIds(null);
    resetPos();
  };
  const startReviewAhead = (): void => {
    setReviewAhead(true);
    setKind('all');
    setPickedIds(null);
    setSessionQueueIds(null);
    clearShuffle();
    resetPos();
  };
  const confirmReset = async (): Promise<void> => {
    setResetting(true);
    try {
      await api.resetSrs(scopeBase);
    } finally {
      setResetting(false);
      setResetOpen(false);
      setReviewAhead(false);
      setSessionQueueIds(null);
      setNow(new Date());
      resetPos();
    }
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

    // Cập nhật hàng đợi phiên học Anki:
    setSessionQueueIds((prev) => {
      const currentList = prev ?? used.map((v) => v.id);
      if (currentList.length === 0) return [];
      const currentId = current.id;
      if (rating === 'again') {
        // Nếu chỉ còn 1 thẻ: giữ nguyên thẻ trong phiên để lặp lại
        if (currentList.length <= 1) return [...currentList];
        // Đẩy thẻ hiện tại về cuối danh sách phiên học
        const remaining = currentList.filter((id) => id !== currentId);
        return [...remaining, currentId];
      }
      // Các mức khác (Hard, Good, Easy): thẻ tốt nghiệp phiên học hôm nay
      return currentList.filter((id) => id !== currentId);
    });

    setRevealed(false);
  };

  const speakCurrent = (): void => {
    if (current === null) return;
    const text = selectSpeechPrompt(current.word, current.reading);
    speakJapanese(text);
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
    onSpeak: speakCurrent,
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

      {scope === undefined ? (
        <ScopeBar
          total={deck.length}
          used={total}
          kind={kind}
          n={n}
          onKindChange={applyKind}
          onNChange={changeN}
        />
      ) : null}

      <div className="kn-fc__control">
        <div className="kn-fc__modes" role="group" aria-label="Chế độ học">
          {MODES.map((item) => (
            <Button
              key={item.id}
              className={`kn-fc__mode-btn${item.id === mode ? ' is-active' : ''}`}
              aria-pressed={item.id === mode}
              variant={item.id === mode ? 'primary' : 'secondary'}
              onClick={() => changeMode(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="kn-fc__tools">
          <ToggleIconButton
            pressed={shuffled}
            onPressedChange={toggleShuffle}
            label="Xáo trộn thẻ"
            tooltip="Xáo trộn: bật/tắt"
            icon={<IconShuffle />}
          />
          <button
            type="button"
            className="kn-fc__icon-btn"
            aria-label="Làm lại từ thẻ đầu"
            title="Làm lại"
            onClick={redo}
          >
            <IconReset />
          </button>
        </div>
      </div>

      <div className="kn-fc__progress">
        <span className="kn-fc__progress-label">Tiến độ học</span>
        <span className="kn-fc__counter">
          {safeIndex + 1}/{total}
        </span>
        <div className="kn-fc__bar">
          <div className="kn-fc__bar-fill" style={{ width: `${String(progressPct)}%` }} />
        </div>
        <span className="kn-fc__summary">
          Tổng {summary.total} · Tới hạn {summary.due} · Mới {summary.fresh}
        </span>
      </div>

      {scopeBase.length === 0 ? (
        <EmptyState
          title="Thư mục này chưa có từ"
          description="Thêm từ ở tab Tổng quan rồi quay lại học."
        />
      ) : mode === 'anki' && !reviewAhead && ankiDueDeck.length === 0 ? (
        <div className="kn-fc__anki-empty">
          <p className="kn-fc__anki-empty-title">Đã hết thẻ tới hạn</p>
          <p className="kn-fc__anki-empty-desc">
            Bạn đã ôn hết các thẻ tới hạn trong phạm vi này — đúng theo lịch SM-2.
          </p>
          {nextDue !== null ? (
            <p className="kn-fc__anki-empty-next">
              Thẻ kế tiếp đến hạn: <strong>{formatDateTime(nextDue)}</strong>
            </p>
          ) : null}
          <div className="kn-fc__anki-empty-actions">
            <Button
              variant="primary"
              onClick={startReviewAhead}
              disabled={reviewAheadDeck.length === 0}
              title={
                reviewAheadDeck.length === 0 ? 'Không có thẻ chưa tới hạn để ôn' : undefined
              }
            >
              Ôn trước hạn
              {reviewAheadDeck.length > 0 ? ` (${String(reviewAheadDeck.length)})` : ''}
            </Button>
            <Button onClick={() => setResetOpen(true)} disabled={resetTargets.length === 0}>
              Đặt lại tiến độ SRS
            </Button>
          </div>
        </div>
      ) : total === 0 || current === null ? (
        <EmptyState
          title={
            reviewAhead
              ? 'Hết thẻ để ôn trước hạn'
              : mode === 'anki'
                ? 'Không còn thẻ tới hạn'
                : 'Chưa có thẻ'
          }
          description={
            reviewAhead
              ? 'Đã ôn hết thẻ chưa tới hạn trong phạm vi này.'
              : mode === 'anki'
                ? 'Đã ôn hết thẻ tới hạn trong phạm vi này. Đổi chế độ hoặc quay lại sau.'
                : 'Giảm phạm vi hoặc thêm từ ở tab Tổng quan.'
          }
        />
      ) : (
        <>
          <div
            className="kn-fc__card-wrap"
            role="button"
            tabIndex={0}
            aria-label="Lật thẻ"
            onClick={flip}
          >
            <FlashcardCard
              vocab={current}
              revealed={revealed}
              onEdit={() => setEditOpen(true)}
            />
          </div>

          {mode === 'anki' ? (
            !revealed ? (
              <div className="kn-fc__nav">
                <Button variant="primary" onClick={flip}>
                  Hiện đáp án <kbd className="kn-fc__kbd">Space</kbd>
                </Button>
              </div>
            ) : (
              <div className="kn-fc__nav kn-fc__ratings" aria-label="Đánh giá">
                {RATINGS.map((item) => {
                  const srsState: SrsState = {
                    interval: current?.srsInterval ?? null,
                    repetition: current?.srsRepetition ?? null,
                    easeFactor: current?.srsEaseFactor ?? null,
                  };
                  const forecast = previewIntervalLabel(srsState, item.id, true);
                  return (
                    <Button
                      key={item.id}
                      className={`kn-fc__rating-btn kn-fc__rating-btn--${item.id}`}
                      onClick={() => void rate(item.id)}
                    >
                      <span className="kn-fc__rating-time">{forecast}</span>
                      <span className="kn-fc__rating-label">{item.label}</span>
                      <kbd className="kn-fc__kbd">{item.num}</kbd>
                    </Button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="kn-fc__nav">
              <Button
                className="kn-fc__nav-prev"
                onClick={goPrev}
                disabled={safeIndex === 0}
              >
                <IconArrowLeft className="kn-fc__nav-icon" />
                Trước
              </Button>
              <Button
                variant="primary"
                onClick={goNext}
                disabled={safeIndex >= total - 1}
              >
                Tiếp theo
                <IconArrowRight className="kn-fc__nav-icon" />
              </Button>
            </div>
          )}

          <p className="kn-fc__hint-keys">
            Space: lật · ← →: chuyển thẻ
            {mode === 'anki' ? ' · 1/2/3/4: chấm điểm' : ''}
          </p>
        </>
      )}

      <Modal
        open={resetOpen}
        title="Đặt lại tiến độ SRS"
        onClose={() => {
          if (!resetting) setResetOpen(false);
        }}
        footer={
          <>
            <Button onClick={() => setResetOpen(false)} disabled={resetting}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => void confirmReset()}
              disabled={resetting || resetTargets.length === 0}
            >
              {resetting ? 'Đang đặt lại…' : `Đặt lại ${String(resetTargets.length)} thẻ`}
            </Button>
          </>
        }
      >
        <p>
          Thao tác này sẽ đặt lại tiến độ SRS (xoá lịch ôn, số lần nhớ liên tiếp và hệ số
          dễ) của <strong>{resetTargets.length}</strong> thẻ trong phạm vi hiện tại (thư mục
          đang chọn, gồm cả thư mục con). Các thẻ sẽ quay về trạng thái “mới”.
        </p>
        <p>Thay đổi sẽ được đồng bộ lên máy chủ và không thể hoàn tác.</p>
      </Modal>

      <EditVocabularyModal
        open={editOpen}
        vocabulary={current}
        onClose={() => setEditOpen(false)}
        onSave={async (updated) => {
          await putVocabularyLocal(db, updated);
          emitDataChanged();
        }}
      />
    </section>
  );
}
