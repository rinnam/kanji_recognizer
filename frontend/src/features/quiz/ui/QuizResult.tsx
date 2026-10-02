import { type ReactElement } from 'react';
import { Button } from '../../../shared/ui';
import type { QuizResult as QuizResultData } from '../model/types';
import type { SaveStatus } from '../model/useQuiz';

interface QuizResultProps {
  result: QuizResultData;
  saveStatus: SaveStatus;
  saveMessage: string | null;
  onRestart: () => void;
}

/** Màn kết quả: điểm cục bộ + trạng thái lưu BE + soát lại từng câu. */
export function QuizResult({
  result,
  saveStatus,
  saveMessage,
  onRestart,
}: QuizResultProps): ReactElement {
  return (
    <div className="kn-quiz__result">
      <p className="kn-quiz__score">
        Điểm: <strong>{result.score}</strong> / {result.total}
      </p>

      {saveMessage !== null ? (
        <p
          className={
            saveStatus === 'error'
              ? 'kn-quiz__save kn-quiz__save--error'
              : 'kn-quiz__save'
          }
          role={saveStatus === 'error' ? 'alert' : 'status'}
        >
          {saveMessage}
        </p>
      ) : null}

      <ol className="kn-quiz__review">
        {result.items.map((item, i) => (
          <li
            key={`${item.vocabularyId}-${String(i)}`}
            className={
              item.isCorrect
                ? 'kn-quiz__item kn-quiz__item--ok'
                : 'kn-quiz__item kn-quiz__item--no'
            }
          >
            <span className="kn-quiz__prompt">{item.prompt}</span>
            <span className="kn-quiz__answer">
              Bạn gõ: {item.userAnswer ?? '—'} {item.isCorrect ? '✓' : '✗'}
            </span>
            {!item.isCorrect ? (
              <span className="kn-quiz__accepted">
                Đáp án: {item.acceptedAnswers.join(' / ')}
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <Button variant="primary" onClick={onRestart}>
        Làm lại
      </Button>
    </div>
  );
}
