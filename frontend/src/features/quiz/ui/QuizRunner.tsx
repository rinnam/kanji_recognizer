import { useState, type ReactElement } from 'react';
import { Button, EmptyState, ErrorState, Field, Input, LoadingState } from '../../../shared/ui';
import type { QuizDirection } from '../model/types';
import { useQuiz } from '../model/useQuiz';
import { QuizResult } from './QuizResult';
import './quiz.css';

const DIRECTIONS: { id: QuizDirection; label: string }[] = [
  { id: 'viToJa', label: 'Nghĩa → gõ tiếng Nhật' },
  { id: 'jaToVi', label: 'Tiếng Nhật → gõ Nghĩa' },
];

/**
 * Typing quiz (F4): sinh câu từ vocab local, chấm CỤC BỘ (mirror BE), lưu phiên lên BE khi online.
 * Đủ 4 trạng thái (loading/error/empty/ready) + 3 pha (config → active → result).
 */
export function QuizRunner(): ReactElement {
  const api = useQuiz();
  const [direction, setDirection] = useState<QuizDirection>('viToJa');
  const [count, setCount] = useState(10);
  const [input, setInput] = useState('');

  if (api.loadStatus === 'loading') {
    return <LoadingState label="Đang tải từ vựng…" />;
  }
  if (api.loadStatus === 'error') {
    return <ErrorState message={api.loadError ?? undefined} onRetry={() => void api.reload()} />;
  }

  const submitAnswer = (): void => {
    api.answer(input);
    setInput('');
  };

  return (
    <section className="kn-quiz" aria-labelledby="quiz-heading">
      <h2 id="quiz-heading">Typing Quiz</h2>

      {api.phase === 'config' ? (
        api.availableCount === 0 ? (
          <EmptyState
            title="Chưa có từ để làm quiz"
            description="Hãy thêm từ vựng (có cả Từ và Nghĩa) ở trang Thư viện trước đã."
          />
        ) : (
          <form
            className="kn-quiz__config"
            onSubmit={(event) => {
              event.preventDefault();
              api.start(direction, count);
            }}
          >
            <p className="kn-quiz__hint">Có {api.availableCount} từ dùng được.</p>
            <Field id="quiz-direction" label="Kiểu hỏi">
              <select
                id="quiz-direction"
                className="kn-ui-input"
                value={direction}
                onChange={(event) => setDirection(event.target.value as QuizDirection)}
              >
                {DIRECTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="quiz-count" label="Số câu">
              <Input
                id="quiz-count"
                type="number"
                min={1}
                max={api.availableCount}
                value={count}
                onChange={(event) =>
                  setCount(Math.max(1, Number(event.target.value) || 1))
                }
              />
            </Field>
            <Button type="submit" variant="primary">
              Bắt đầu
            </Button>
          </form>
        )
      ) : null}

      {api.phase === 'active' && api.current !== null ? (
        <form
          className="kn-quiz__active"
          onSubmit={(event) => {
            event.preventDefault();
            submitAnswer();
          }}
        >
          <p className="kn-quiz__pos">
            Câu {api.index + 1} / {api.questions.length}
          </p>
          <p className="kn-quiz__question">{api.current.prompt}</p>
          <Field id="quiz-answer" label="Đáp án của bạn">
            <Input
              id="quiz-answer"
              value={input}
              autoFocus
              autoComplete="off"
              onChange={(event) => setInput(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary">
            {api.index >= api.questions.length - 1 ? 'Nộp bài' : 'Câu tiếp'}
          </Button>
        </form>
      ) : null}

      {api.phase === 'result' && api.result !== null ? (
        <QuizResult
          result={api.result}
          saveStatus={api.saveStatus}
          saveMessage={api.saveMessage}
          onRestart={api.restart}
        />
      ) : null}
    </section>
  );
}
