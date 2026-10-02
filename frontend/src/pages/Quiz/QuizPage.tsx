import { type ReactElement } from 'react';
import { QuizRunner } from '../../features/quiz';

/** Trang Quiz — typing quiz: chấm cục bộ (mirror BE) + lưu phiên khi online (F4). */
export function QuizPage(): ReactElement {
  return <QuizRunner />;
}
