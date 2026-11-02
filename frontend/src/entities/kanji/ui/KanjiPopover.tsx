import { type ReactElement, type MouseEvent } from 'react';
import type { KanjiDetail } from '../model/types';
import './kanji.css';

interface KanjiPopoverProps {
  kanji: KanjiDetail;
  onClose: () => void;
}

/**
 * Thẻ Popover thông tin chi tiết của một chữ Hán (Kanji).
 * Hiển thị Hán tự to, Âm Hán Việt, cấp JLPT, số nét, nghĩa và On'yomi/Kun'yomi.
 */
export function KanjiPopover({ kanji, onClose }: KanjiPopoverProps): ReactElement {
  const handleClick = (e: MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
  };

  const hasReadingsOrRadical =
    kanji.onyomi.length > 0 ||
    kanji.kunyomi.length > 0 ||
    kanji.radical;

  return (
    <div
      className="kn-kanji-popover"
      role="dialog"
      aria-label={`Thông tin chữ Hán ${kanji.character}`}
      onClick={handleClick}
    >
      <div className="kn-kanji-popover__header">
        <div className="kn-kanji-popover__title-group">
          <span className="kn-kanji-popover__char">{kanji.character}</span>
          <span className="kn-kanji-popover__sino">{kanji.sinoVietnamese}</span>
          {kanji.strokeCount ? (
            <span className="kn-kanji-popover__badge kn-kanji-popover__badge--strokes">
              {kanji.strokeCount} nét
            </span>
          ) : null}
          {kanji.jlptLevel ? (
            <span className="kn-kanji-popover__badge">{kanji.jlptLevel}</span>
          ) : null}
        </div>

        <button
          type="button"
          className="kn-kanji-popover__close-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Đóng bảng chữ Hán"
          title="Đóng"
        >
          ×
        </button>
      </div>

      <div className="kn-kanji-popover__divider" />

      <p className="kn-kanji-popover__meaning">{kanji.meaning}</p>

      {hasReadingsOrRadical ? (
        <div className="kn-kanji-popover__extra">
          {kanji.onyomi.length > 0 || kanji.kunyomi.length > 0 ? (
            <div className="kn-kanji-popover__readings">
              {kanji.onyomi.length > 0 ? (
                <div className="kn-kanji-popover__reading-row">
                  <span className="kn-kanji-popover__reading-label">On:</span>
                  <span className="kn-kanji-popover__reading-val">
                    {kanji.onyomi.join(', ')}
                  </span>
                </div>
              ) : null}

              {kanji.kunyomi.length > 0 ? (
                <div className="kn-kanji-popover__reading-row">
                  <span className="kn-kanji-popover__reading-label">Kun:</span>
                  <span className="kn-kanji-popover__reading-val">
                    {kanji.kunyomi.join(', ')}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {kanji.radical ? (
            <div className="kn-kanji-popover__radical">
              Bộ thủ: <strong>{kanji.radical}</strong>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
