import { type ReactElement } from 'react';
import { InteractiveKanjiText } from '../../../entities/kanji';
import type { LocalVocabulary } from '../../../entities/vocabulary';
import { selectSpeechPrompt } from '../../../shared/lib';
import { IconEdit, IconFlip, SpeakButton } from '../../../shared/ui';
import { selectFaceContent } from '../model/face';
import { CatCardFrame } from './CatCardFrame';

interface FlashcardCardProps {
  vocab: LocalVocabulary;
  revealed: boolean;
  onEdit?: () => void;
}

/**
 * Thẻ lớn theo bố cục tham khảo (B1):
 * - MẶT TRƯỚC: TỪ VỰNG rất to ở giữa + Âm Hán Việt (IN HOA, giãn) ngay dưới (ẩn nếu rỗng) + nút loa phát âm.
 * - MẶT SAU: Cách đọc (trên) + nút loa · Nghĩa (to, đậm) · khung "VÍ DỤ" (câu ví dụ + dịch nghiêng).
 * Góc trên trái luôn có nhãn "BẤM ĐỂ LẬT". Hiển thị thuần — KHÔNG đổi logic SM-2.
 */
export function FlashcardCard({ vocab, revealed, onEdit }: FlashcardCardProps): ReactElement {
  const content = selectFaceContent(vocab, revealed ? 'back' : 'front');
  const speechText = selectSpeechPrompt(vocab.word, vocab.reading);

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
            <div className="kn-fc-card__word-row">
              <p className="kn-fc-card__word">
                <InteractiveKanjiText
                  text={content.word}
                  sinoVietnamese={vocab.sinoVietnamese}
                  meaning={vocab.meaning}
                />
              </p>
              <SpeakButton
                text={speechText}
                size="md"
                label={`Nghe phát âm ${vocab.word}`}
                className="kn-fc-card__speak-btn"
              />
            </div>
            {content.sinoVietnamese !== null ? (
              <p className="kn-fc-card__sino">{content.sinoVietnamese}</p>
            ) : null}
          </div>
        ) : (
          <div className="kn-fc-card__face">
            {content.reading !== null ? (
              <div className="kn-fc-card__reading-row">
                <p className="kn-fc-card__reading">{content.reading}</p>
                <SpeakButton
                  text={speechText}
                  size="sm"
                  label={`Nghe phát âm ${content.reading}`}
                  className="kn-fc-card__speak-btn"
                />
              </div>
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
