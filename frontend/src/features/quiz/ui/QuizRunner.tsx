import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { Button, EmptyState, ErrorState, LoadingState } from '../../../shared/ui';
import type { QuizDirection } from '../model/types';
import { useQuiz, type QuizScope } from '../model/useQuiz';
import { QuizResult } from './QuizResult';
import './quiz.css';

const DIRECTIONS: { id: QuizDirection; label: string; title: string; hint: string }[] = [
  {
    id: 'viToJa',
    label: 'Nghĩa → Nhật',
    title: 'NHÌN NGHĨA, DỊCH SANG TIẾNG NHẬT',
    hint: 'Gõ Hiragana hoặc Kanji tương ứng',
  },
  {
    id: 'jaToVi',
    label: 'Nhật → Nghĩa',
    title: 'NHÌN TIẾNG NHẬT, DỊCH NGHĨA',
    hint: 'Gõ nghĩa tiếng Việt',
  },
];

const SCOPES: { id: QuizScope; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'first', label: '20 câu đầu' },
  { id: 'random', label: 'Random 20' },
];

function hasText(value: string | null): value is string {
  return value !== null && value.trim() !== '';
}

/**
 * Typing quiz làm lại theo bố cục tham khảo (F4): thanh phạm vi + thẻ điều khiển
 * (kiểu hỏi + xáo trộn/làm lại + tiến độ) + thẻ câu hỏi + ô nhập + phản hồi từng câu
 * (đếm ngược tự chuyển). Phím: Enter nộp→tiếp, Tab bỏ qua, ô nhập tự focus. Chấm giữ nguyên.
 */
export function QuizRunner(): ReactElement {
  const api = useQuiz();
  const {
    loadStatus,
    loadError,
    availableCount,
    direction,
    scope,
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
    chooseDirection,
    chooseScope,
    reshuffle,
    submit,
    skip,
    advance,
    restart,
  } = api;

  const [input, setInput] = useState('');
  const [showSino, setShowSino] = useState(false);
  const [countdownSec, setCountdownSec] = useState(5);
  const [remaining, setRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLast = index >= total - 1;

  // Ô nhập tự focus khi sang câu mới (chưa nộp).
  useEffect(() => {
    if (phase === 'active' && !submitted) {
      inputRef.current?.focus();
    }
  }, [phase, submitted, index]);

  // Đếm ngược tự chuyển câu sau khi đã nộp (setState chỉ trong callback → không vi phạm rule).
  useEffect(() => {
    if (phase !== 'active' || !submitted) {
      return;
    }
    const deadline = Date.now() + countdownSec * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        advance();
      }
    }, 250);
    return () => {
      clearInterval(id);
    };
  }, [phase, submitted, index, countdownSec, advance]);

  if (loadStatus === 'loading') {
    return <LoadingState label="Đang tải từ vựng…" />;
  }
  if (loadStatus === 'error') {
    return <ErrorState message={loadError ?? undefined} onRetry={() => void reload()} />;
  }
  if (availableCount === 0) {
    return (
      <EmptyState
        title="Chưa có từ để làm quiz"
        description="Hãy thêm từ vựng (có cả Từ và Nghĩa) ở trang Thư viện trước đã."
      />
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

  const meta = DIRECTIONS.find((item) => item.id === direction) ?? DIRECTIONS[0];
  const progressPct = total === 0 ? 0 : Math.round(((index + 1) / total) * 100);

  const onSubmitForm = (): void => {
    if (submitted) {
      advance();
      setInput('');
    } else {
      submit(input);
      setRemaining(countdownSec);
    }
  };

  const onSkip = (): void => {
    skip();
    setInput('');
  };

  return (
    <section className="kn-quiz" aria-labelledby="quiz-heading">
      <h2 id="quiz-heading" className="kn-quiz__sr-only">
        Typing Quiz
      </h2>

      <div className="kn-quiz__scope">
        <span className="kn-quiz__scope-label">
          Phạm vi: {total}/{availableCount}
        </span>
        <div className="kn-quiz__chips" role="group" aria-label="Phạm vi">
          {SCOPES.map((item) => (
            <Button
              key={item.id}
              variant={scope === item.id ? 'primary' : 'secondary'}
              onClick={() => chooseScope(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="kn-quiz__control">
        <div className="kn-quiz__dirs" role="group" aria-label="Kiểu hỏi">
          {DIRECTIONS.map((item) => (
            <Button
              key={item.id}
              aria-pressed={item.id === direction}
              variant={item.id === direction ? 'primary' : 'secondary'}
              onClick={() => chooseDirection(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="kn-quiz__tools">
          <Button onClick={reshuffle}>Xáo trộn</Button>
          <Button onClick={restart}>Làm lại</Button>
          <label className="kn-quiz__countdown">
            Tự chuyển (giây)
            <input
              className="kn-ui-input kn-quiz__countdown-input"
              type="number"
              min={1}
              max={10}
              value={countdownSec}
              onChange={(event) =>
                setCountdownSec(Math.min(10, Math.max(1, Number(event.target.value) || 1)))
              }
            />
          </label>
        </div>
        <div className="kn-quiz__progress">
          <span className="kn-quiz__progress-label">TIẾN ĐỘ KIỂM TRA</span>
          <span className="kn-quiz__counter">
            {index + 1}/{total}
          </span>
          <div className="kn-quiz__bar">
            <div className="kn-quiz__bar-fill" style={{ width: `${String(progressPct)}%` }} />
          </div>
        </div>
      </div>

      {current === null ? (
        <EmptyState title="Hết câu hỏi" description="Hãy bấm Làm lại để tạo phiên mới." />
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
              <span aria-hidden="true">ⓘ</span> {meta.title}
            </p>
            <p className="kn-quiz__question">{current.prompt}</p>
            <p className="kn-quiz__hint">{meta.hint}</p>

            {hasText(currentVocab?.sinoVietnamese ?? null) ? (
              <div className="kn-quiz__sino">
                <Button onClick={() => setShowSino((value) => !value)}>
                  {showSino ? 'Ẩn' : 'Hiển thị'} gợi ý Âm Hán Việt
                </Button>
                {showSino ? (
                  <span className="kn-quiz__sino-value">{currentVocab?.sinoVietnamese}</span>
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
                  <p className="kn-quiz__example">{currentVocab?.example}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <form
            className="kn-quiz__answer"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmitForm();
            }}
          >
            <input
              ref={inputRef}
              className="kn-ui-input kn-quiz__answer-input"
              value={input}
              readOnly={submitted}
              placeholder="Nhập câu trả lời vào đây..."
              autoComplete="off"
              aria-label="Đáp án của bạn"
              aria-invalid={submitted && feedback?.correct === false ? true : undefined}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Tab' && !submitted) {
                  event.preventDefault();
                  onSkip();
                }
              }}
            />
            <div className="kn-quiz__answer-actions">
              {!submitted ? (
                <>
                  <Button onClick={onSkip}>Bỏ qua <kbd className="kn-quiz__kbd">Tab</kbd></Button>
                  <Button type="submit" variant="primary" disabled={input.trim() === ''}>
                    Kiểm tra <kbd className="kn-quiz__kbd">Enter</kbd>
                  </Button>
                </>
              ) : (
                <Button type="submit" variant="primary">
                  {isLast ? 'Nộp bài' : 'Tiếp'} ({remaining ?? countdownSec}s){' '}
                  <kbd className="kn-quiz__kbd">Enter</kbd>
                </Button>
              )}
            </div>
          </form>

          <p className="kn-quiz__hint-keys">
            Enter: nộp / câu tiếp · Tab: bỏ qua · tự chuyển sau {countdownSec}s
          </p>
        </>
      )}
    </section>
  );
}
