import { type ReactElement } from 'react';
import type { LocalVocabulary } from '../../../entities/vocabulary';

interface FlashcardCardProps {
  vocab: LocalVocabulary;
  revealed: boolean;
}

function hasText(value: string | null): value is string {
  return value !== null && value.trim() !== '';
}

/** Mặt thẻ: luôn hiện Từ + Cách đọc; mặt sau (Nghĩa, Hán Việt, Ví dụ) chỉ hiện khi lật. */
export function FlashcardCard({ vocab, revealed }: FlashcardCardProps): ReactElement {
  return (
    <article className="kn-fc-card">
      <div className="kn-fc-card__front">
        <p className="kn-fc-card__word">{vocab.word}</p>
        {hasText(vocab.reading) ? (
          <p className="kn-fc-card__reading">{vocab.reading}</p>
        ) : null}
      </div>

      <div className="kn-fc-card__back" aria-live="polite">
        {revealed ? (
          <>
            <p className="kn-fc-card__meaning">{vocab.meaning}</p>
            {hasText(vocab.sinoVietnamese) ? (
              <p className="kn-fc-card__sino">Hán Việt: {vocab.sinoVietnamese}</p>
            ) : null}
            {hasText(vocab.example) ? (
              <p className="kn-fc-card__example">{vocab.example}</p>
            ) : null}
          </>
        ) : (
          <p className="kn-fc-card__hint">Nhấn “Lật thẻ” để xem nghĩa.</p>
        )}
      </div>
    </article>
  );
}
