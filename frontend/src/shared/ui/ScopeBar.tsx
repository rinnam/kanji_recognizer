import { type ReactElement } from 'react';
import { IconSliders } from './icons';
import './scope-bar.css';

/** 3 kiểu lấy phạm vi: tất cả / N thẻ đầu / N thẻ ngẫu nhiên. */
export type ScopeKind = 'all' | 'first' | 'random';

interface ScopeBarProps {
  /** y — tổng số từ trong thư mục đang chọn (gồm thư mục con). */
  total: number;
  /** x — số từ thực dùng sau khi áp chip. */
  used: number;
  kind: ScopeKind;
  /** N chung cho "N từ đầu" / "Random" (1..total). */
  n: number;
  onKindChange: (kind: ScopeKind) => void;
  onNChange: (n: number) => void;
  /** 'card' (mặc định): thẻ có viền + nền. 'inline': không viền/nền để gắn vào thanh khác. */
  variant?: 'card' | 'inline';
}

/**
 * Thanh phạm vi (presentational, dùng chung Flashcard & Quiz). Chỉ hiển thị + phát sự kiện;
 * logic chọn "N từ đầu" (createdAt tăng dần) / "Random" (bốc lại khi bấm) nằm ở nơi dùng.
 * Dùng MỘT ô N chung (nằm trong chip Random); nhãn "N từ đầu" hiện số N thật.
 */
export function ScopeBar({
  total,
  used,
  kind,
  n,
  onKindChange,
  onNChange,
  variant = 'card',
}: ScopeBarProps): ReactElement {
  const disabled = total === 0;
  const className = variant === 'inline' ? 'kn-scope kn-scope--inline' : 'kn-scope';
  return (
    <div className={className} role="group" aria-label="Phạm vi">
      <span className="kn-scope__filter" aria-hidden="true">
        <IconSliders />
      </span>
      <span className="kn-scope__label">Phạm vi:</span>
      <span className="kn-scope__count">
        <strong>{used}</strong>/{total}
      </span>
      <div className="kn-scope__chips">
        <button
          type="button"
          className={kind === 'all' ? 'kn-scope__chip kn-scope__chip--active' : 'kn-scope__chip'}
          aria-pressed={kind === 'all'}
          disabled={disabled}
          onClick={() => onKindChange('all')}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={
            kind === 'first' ? 'kn-scope__chip kn-scope__chip--active' : 'kn-scope__chip'
          }
          aria-pressed={kind === 'first'}
          disabled={disabled}
          onClick={() => onKindChange('first')}
        >
          {n} từ đầu
        </button>
        <div
          className={
            kind === 'random'
              ? 'kn-scope__chip kn-scope__chip--random kn-scope__chip--active'
              : 'kn-scope__chip kn-scope__chip--random'
          }
        >
          <button
            type="button"
            className="kn-scope__chip-main"
            aria-pressed={kind === 'random'}
            disabled={disabled}
            onClick={() => onKindChange('random')}
          >
            Random
          </button>
          <input
            type="number"
            className="kn-scope__chip-n"
            aria-label="Số thẻ N"
            min={1}
            max={Math.max(1, total)}
            value={n}
            disabled={disabled}
            onChange={(event) => onNChange(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
