import { type ReactElement } from 'react';
import { Button } from '../../../shared/ui';
import type { GradedQuizItem, QuizResult as QuizResultData } from '../model/types';
import type { SaveStatus } from '../model/useQuiz';

interface QuizResultProps {
  result: QuizResultData;
  saveStatus: SaveStatus;
  saveMessage: string | null;
  onRestart: () => void;
}

/** Ghi chú soát lại một câu: ✓ / ✓ lần n / ✗ xem đáp án (gợi ý) / ✗ sai 3 lần. */
function reviewNote(item: GradedQuizItem): string {
  if (item.isCorrect) {
    return (item.attemptNo ?? 1) > 1 ? `✓ lần ${String(item.attemptNo)}` : '✓';
  }
  return item.usedHint === true ? '✗ xem đáp án' : '✗ sai 3 lần';
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
              Bạn gõ: {item.userAnswer ?? '—'}{' '}
              <span className="kn-quiz__note">{reviewNote(item)}</span>
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
