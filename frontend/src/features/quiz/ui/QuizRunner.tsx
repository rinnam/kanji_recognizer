import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Button,
  EmptyState,
  ErrorState,
  IconClock,
  IconInfo,
  IconReset,
  IconShuffle,
  LoadingState,
  ScopeBar,
} from '../../../shared/ui';
import type { ScopeSelection } from '../../../entities/vocabulary';
import { decideQuizKey } from '../model/keymap';
import type { QuizMode } from '../model/questions';
import type { QuizType } from '../model/types';
import { useQuiz } from '../model/useQuiz';
import { QuizResult } from './QuizResult';
import './quiz.css';

interface QuizRunnerProps {
  folderId: string | null;
  /** Phạm vi do page truyền xuống (3D/3E). Khi CÓ: ẩn ScopeBar nội bộ + chọn bộ bằng applyScope. */
  scope?: ScopeSelection;
}

const MODES: { id: QuizMode; label: string }[] = [
  { id: 'random', label: 'Ngẫu nhiên' },
  { id: 'reading', label: 'Dạng 1' },
  { id: 'meaning', label: 'Dạng 2' },
];

const TYPE_META: Record<QuizType, { title: string; hint: string }> = {
  reading: {
    title: 'DẠNG 1: NHÌN CHỮ, NHẬP CÁCH ĐỌC',
    hint: 'Gõ cách đọc bằng Hiragana',
  },
  meaning: {
    title: 'DẠNG 2: NHÌN NGHĨA, DỊCH SANG TIẾNG NHẬT',
    hint: 'Gõ Hiragana hoặc Kanji tương ứng',
  },
};

function hasText(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.trim() !== '';
}

/**
 * Typing quiz (B2): ScopeBar + QuizControls (Ngẫu nhiên/Dạng 1/Dạng 2 + Xáo trộn/Làm lại +
 * TimerPill) + QuizProgress + thẻ câu hỏi + ô nhập + hành động + phản hồi từng câu (đếm ngược).
 * Phím: Enter nộp→tiếp, Tab bỏ qua; IME đang gõ dở thì KHÔNG nộp/bỏ qua. Chấm giữ nguyên.
 */
export function QuizRunner({ folderId, scope }: QuizRunnerProps): ReactElement {
  const api = useQuiz(folderId, scope);
  const {
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
  } = api;

  const [input, setInput] = useState('');
  const [showSino, setShowSino] = useState(false);
  const [seconds, setSeconds] = useState(5);
  const [remaining, setRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLast = index >= total - 1;

  // Tự focus ô nhập khi sang câu mới (chưa nộp). CHỈ focus — không setState trong thân effect.
  useEffect(() => {
    if (phase === 'active' && !submitted) {
      inputRef.current?.focus();
    }
  }, [phase, submitted, index]);

  // Đếm ngược tự chuyển sau khi nộp (setState chỉ trong callback setInterval → không vi phạm rule).
  useEffect(() => {
    if (phase !== 'active' || !submitted) return;
    const deadline = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        advance();
        setInput('');
        setRemaining(null);
      }
    }, 250);
    return () => {
      clearInterval(id);
    };
  }, [phase, submitted, index, seconds, advance]);

  if (loadStatus === 'loading') {
    return <LoadingState label="Đang tải từ vựng…" />;
  }
  if (loadStatus === 'error') {
    return <ErrorState message={loadError ?? undefined} onRetry={() => void reload()} />;
  }
  if (scopeTotal === 0) {
    return (
      <section className="kn-quiz" aria-labelledby="quiz-heading">
        <h2 id="quiz-heading" className="kn-quiz__sr-only">
          Quiz
        </h2>
        <EmptyState
          title="Thư mục này chưa có từ"
          description="Thêm từ ở tab Tổng quan rồi quay lại kiểm tra."
        />
      </section>
    );
  }
  if (phase === 'result' && result !== null) {
    return (
      <section className="kn-quiz" aria-labelledby="quiz-heading">
        <h2 id="quiz-heading" className="kn-quiz__sr-only">
          Quiz — Kết quả
        </h2>
        <QuizResult
          result={result}
          saveStatus={saveStatus}
          saveMessage={saveMessage}
          onRestart={restart}
        />
      </section>
    );
  }

  const meta = current !== null ? TYPE_META[current.type] : null;
  const progressPct = total === 0 ? 0 : Math.round(((index + 1) / total) * 100);
  const canSubmit = input.trim() !== '';

  const doSubmit = (): void => {
    submit(input);
    setRemaining(seconds);
  };
  const doSkip = (): void => {
    skip();
    setInput('');
    setRemaining(null);
  };
  const doAdvance = (): void => {
    advance();
    setInput('');
    setRemaining(null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    const composing = event.nativeEvent.isComposing || event.keyCode === 229;
    const action = decideQuizKey({ key: event.key, composing, submitted, canSubmit });
    if (action === 'none') {
      // Chặn Tab rời ô nhập (trừ khi đang gõ IME) — Tab chỉ để bỏ qua.
      if (event.key === 'Tab' && !composing) event.preventDefault();
      return;
    }
    event.preventDefault();
    if (action === 'submit') doSubmit();
    else if (action === 'advance') doAdvance();
    else doSkip();
  };

  return (
    <section className="kn-quiz" aria-labelledby="quiz-heading">
      <h2 id="quiz-heading" className="kn-quiz__sr-only">
        Quiz
      </h2>

      {scope === undefined ? (
        <ScopeBar
          total={scopeTotal}
          used={total}
          kind={kind}
          n={n}
          onKindChange={chooseKind}
          onNChange={changeN}
        />
      ) : null}

      <div className="kn-quiz__control">
        <div className="kn-quiz__dirs" role="group" aria-label="Dạng câu hỏi">
          {MODES.map((item) => (
            <Button
              key={item.id}
              aria-pressed={item.id === mode}
              variant={item.id === mode ? 'primary' : 'secondary'}
              onClick={() => chooseMode(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="kn-quiz__tools">
          <button
            type="button"
            className="kn-quiz__icon-btn"
            aria-label="Xáo trộn câu"
            title="Xáo trộn"
            onClick={reshuffle}
          >
            <IconShuffle />
          </button>
          <button
            type="button"
            className="kn-quiz__icon-btn"
            aria-label="Làm lại từ câu đầu"
            title="Làm lại"
            onClick={restart}
          >
            <IconReset />
          </button>
          <span className="kn-quiz__timer" title="Tự chuyển câu sau khi nộp">
            <IconClock />
            <input
              className="kn-ui-input kn-quiz__timer-input"
              type="number"
              min={1}
              max={10}
              aria-label="Số giây tự chuyển"
              value={seconds}
              onChange={(event) =>
                setSeconds(Math.min(10, Math.max(1, Number(event.target.value) || 1)))
              }
            />
            <span>giây</span>
          </span>
        </div>
        <div className="kn-quiz__progress">
          <span className="kn-quiz__progress-label">TIẾN ĐỘ KIỂM TRA</span>
          <span className="kn-quiz__counter">
            {Math.min(index + 1, total)}/{total}
          </span>
          <div className="kn-quiz__bar">
            <div className="kn-quiz__bar-fill" style={{ width: `${String(progressPct)}%` }} />
          </div>
        </div>
      </div>

      {current === null || meta === null ? (
        <EmptyState
          title={mode === 'reading' ? 'Các từ trong phạm vi chưa có cách đọc' : 'Chưa có câu hỏi'}
          description={
            mode === 'reading'
              ? 'Chọn Dạng 2 / Ngẫu nhiên, hoặc thêm cách đọc cho từ ở tab Tổng quan.'
              : 'Đổi phạm vi hoặc thêm từ ở tab Tổng quan.'
          }
        />
      ) : (
        <>
          <div
            className={
              submitted
                ? feedback?.correct === true
                  ? 'kn-quiz__card kn-quiz__card--ok'
                  : 'kn-quiz__card kn-quiz__card--no'
                : 'kn-quiz__card'
            }
          >
            <p className="kn-quiz__card-title">
              <IconInfo className="kn-quiz__card-icon" /> {meta.title}
            </p>
            <p className="kn-quiz__question">{current.prompt}</p>
            <p className="kn-quiz__hint">{meta.hint}</p>

            {hasText(currentVocab?.sinoVietnamese ?? null) ? (
              <div className="kn-quiz__sino">
                <Button onClick={() => setShowSino((value) => !value)}>
                  {showSino ? 'Ẩn' : 'Hiển thị'} gợi ý Âm Hán Việt
                </Button>
                {showSino ? (
                  <span className="kn-quiz__chip">{currentVocab?.sinoVietnamese}</span>
                ) : null}
              </div>
            ) : null}

            {submitted && feedback !== null ? (
              <div className="kn-quiz__feedback" role="status">
                {feedback.correct ? (
                  <p className="kn-quiz__verdict kn-quiz__verdict--ok">✓ Chính xác!</p>
                ) : (
                  <>
                    <p className="kn-quiz__verdict kn-quiz__verdict--no">
                      ✗ Bạn gõ: {feedback.answer ?? '—'}
                    </p>
                    <p className="kn-quiz__accepted">
                      Đáp án: {current.acceptedAnswers.join(' / ')}
                    </p>
                  </>
                )}
                <div className="kn-quiz__chips-row">
                  {hasText(currentVocab?.reading ?? null) ? (
                    <span className="kn-quiz__chip">Cách đọc: {currentVocab?.reading}</span>
                  ) : null}
                  {hasText(currentVocab?.sinoVietnamese ?? null) ? (
                    <span className="kn-quiz__chip">Hán Việt: {currentVocab?.sinoVietnamese}</span>
                  ) : null}
                </div>
                {hasText(currentVocab?.example ?? null) ? (
                  <p className="kn-quiz__example">
                    {currentVocab?.example}
                    {hasText(currentVocab?.exampleMeaning ?? null)
                      ? ` — ${String(currentVocab?.exampleMeaning)}`
                      : ''}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="kn-quiz__answer">
            <input
              ref={inputRef}
              className="kn-ui-input kn-quiz__answer-input"
              value={input}
              readOnly={submitted}
              placeholder="Nhập câu trả lời vào đây..."
              aria-label="Câu trả lời"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
            />
            {!submitted ? (
              <div className="kn-quiz__answer-actions">
                <Button onClick={doSkip}>
                  Bỏ qua <kbd className="kn-quiz__kbd">Tab</kbd>
                </Button>
                <Button variant="primary" onClick={doSubmit} disabled={!canSubmit}>
                  Kiểm tra
                </Button>
              </div>
            ) : (
              <div className="kn-quiz__answer-actions">
                <Button variant="primary" onClick={doAdvance}>
                  {isLast ? (
                    <>
                      Nộp bài <kbd className="kn-quiz__kbd">Enter</kbd>
                    </>
                  ) : (
                    <>
                      <IconClock className="kn-quiz__btn-icon" /> Tiếp ({remaining ?? seconds}s){' '}
                      <kbd className="kn-quiz__kbd">Enter</kbd>
                    </>
                  )}
                </Button>
              </div>
            )}
            <p className="kn-quiz__hint-keys">Enter: nộp / tiếp · Tab: bỏ qua</p>
          </div>
        </>
      )}
    </section>
  );
}
