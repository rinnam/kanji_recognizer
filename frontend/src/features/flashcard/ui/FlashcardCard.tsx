import { type ReactElement } from 'react';
import type { LocalVocabulary } from '../../../entities/vocabulary';
import { IconEdit, IconFlip } from '../../../shared/ui';
import { selectFaceContent } from '../model/face';
import { CatCardFrame } from './CatCardFrame';

interface FlashcardCardProps {
  vocab: LocalVocabulary;
  revealed: boolean;
  onEdit?: () => void;
}

/**
 * Thẻ lớn theo bố cục tham khảo (B1):
 * - MẶT TRƯỚC: TỪ VỰNG rất to ở giữa + Âm Hán Việt (IN HOA, giãn) ngay dưới (ẩn nếu rỗng).
 * - MẶT SAU: Cách đọc (trên) · Nghĩa (to, đậm) · khung "VÍ DỤ" (câu ví dụ + dịch nghiêng).
 * Góc trên trái luôn có nhãn "BẤM ĐỂ LẬT". Hiển thị thuần — KHÔNG đổi logic SM-2.
 */
export function FlashcardCard({ vocab, revealed, onEdit }: FlashcardCardProps): ReactElement {
  const content = selectFaceContent(vocab, revealed ? 'back' : 'front');
  return (
    <article
      className={revealed ? 'kn-fc-card kn-fc-card--back' : 'kn-fc-card'}
      aria-live="polite"
    >
      <CatCardFrame />

      <span className="kn-fc-card__flip-hint" aria-hidden="true">
        <IconFlip className="kn-fc-card__flip-icon" />
        BẤM ĐỂ LẬT
      </span>

      {onEdit !== undefined ? (
        <button
          type="button"
          className="kn-fc-card__edit-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Sửa từ vựng này"
          aria-label="Sửa từ vựng"
        >
          <IconEdit className="kn-fc-card__edit-icon" />
          <span>Sửa thẻ</span>
        </button>
      ) : null}

      <div className="kn-fc-card__inner" key={content.face}>
        {content.face === 'front' ? (
          <div className="kn-fc-card__face">
            <p className="kn-fc-card__word">{content.word}</p>
            {content.sinoVietnamese !== null ? (
              <p className="kn-fc-card__sino">{content.sinoVietnamese}</p>
            ) : null}
          </div>
        ) : (
          <div className="kn-fc-card__face">
            {content.reading !== null ? (
              <p className="kn-fc-card__reading">{content.reading}</p>
            ) : null}
            <p className="kn-fc-card__meaning">{content.meaning}</p>
            {content.example !== null ? (
              <div className="kn-fc-card__box">
                <span className="kn-fc-card__box-label">VÍ DỤ</span>
                <p className="kn-fc-card__ex">{content.example}</p>
                {content.exampleMeaning !== null ? (
                  <p className="kn-fc-card__ex-mean">{content.exampleMeaning}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
