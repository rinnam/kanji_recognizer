import { type ReactElement } from 'react';
import type { LocalVocabulary } from '../../../entities/vocabulary';

interface FlashcardCardProps {
  vocab: LocalVocabulary;
  revealed: boolean;
}

function hasText(value: string | null): value is string {
  return value !== null && value.trim() !== '';
}

/**
 * Mặt thẻ theo bố cục tham khảo:
 * - Mặt trước (chưa lật): cách đọc nhỏ phía trên · NGHĨA rất to ở giữa · khung ví dụ (nghĩa VD).
 * - Mặt sau (đã lật): TỪ tiếng Nhật rất to · Hán Việt (hoa, giãn) · khung ví dụ/ghi chú.
 * Hiển thị thuần — không đổi logic SM-2.
 */
export function FlashcardCard({ vocab, revealed }: FlashcardCardProps): ReactElement {
  return (
    <article
      className={revealed ? 'kn-fc-card kn-fc-card--back' : 'kn-fc-card'}
      aria-live="polite"
    >
      <span className="kn-fc-card__flip-hint" aria-hidden="true">
        BẤM ĐỂ LẬT
      </span>

      {!revealed ? (
        <div className="kn-fc-card__face">
          {hasText(vocab.reading) ? (
            <p className="kn-fc-card__reading">{vocab.reading}</p>
          ) : null}
          <p className="kn-fc-card__meaning">{vocab.meaning}</p>
          {hasText(vocab.exampleMeaning) ? (
            <p className="kn-fc-card__box">{vocab.exampleMeaning}</p>
          ) : null}
        </div>
      ) : (
        <div className="kn-fc-card__face">
          <p className="kn-fc-card__word">{vocab.word}</p>
          {hasText(vocab.reading) ? (
            <p className="kn-fc-card__reading">{vocab.reading}</p>
          ) : null}
          {hasText(vocab.sinoVietnamese) ? (
            <p className="kn-fc-card__sino">{vocab.sinoVietnamese}</p>
          ) : null}
          {hasText(vocab.example) || hasText(vocab.note) ? (
            <div className="kn-fc-card__box">
              {hasText(vocab.example) ? <p className="kn-fc-card__ex">{vocab.example}</p> : null}
              {hasText(vocab.note) ? <p className="kn-fc-card__note">{vocab.note}</p> : null}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
