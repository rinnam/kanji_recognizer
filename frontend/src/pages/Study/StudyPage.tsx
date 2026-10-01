import { type ReactElement } from 'react';
import { EmptyState } from '../../shared/ui';

/** Trang Ôn tập — khung cho flashcard 3 chế độ (F3). */
export function StudyPage(): ReactElement {
  return (
    <section aria-labelledby="study-heading">
      <h2 id="study-heading">Ôn tập</h2>
      <EmptyState
        title="Flashcard"
        description="Ba chế độ Normal / Progress / Anki SRS sẽ có ở F3."
      />
    </section>
  );
}
