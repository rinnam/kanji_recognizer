import { type ReactElement } from 'react';
import { EmptyState } from '../../shared/ui';

/** Trang Quiz — khung cho typing quiz (F4). */
export function QuizPage(): ReactElement {
  return (
    <section aria-labelledby="quiz-heading">
      <h2 id="quiz-heading">Quiz</h2>
      <EmptyState
        title="Typing Quiz"
        description="Bài kiểm tra gõ đáp án (chấm cục bộ + lưu phiên) sẽ có ở F4."
      />
    </section>
  );
}
