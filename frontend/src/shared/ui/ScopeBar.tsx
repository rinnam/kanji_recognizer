import { type ReactElement } from 'react';
import './scope-bar.css';

/** 3 kiểu lấy phạm vi: tất cả / N thẻ đầu / N thẻ ngẫu nhiên. */
export type ScopeKind = 'all' | 'first' | 'random';

interface ScopeBarProps {
  /** y — tổng số từ trong thư mục đang chọn (gồm thư mục con). */
  total: number;
  /** x — số từ thực dùng sau khi áp chip. */
  used: number;
  kind: ScopeKind;
  /** N của "N từ đầu" / "Random N" (1..total). */
  n: number;
  onKindChange: (kind: ScopeKind) => void;
  onNChange: (n: number) => void;
}

const CHIPS: { id: ScopeKind; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'first', label: 'N từ đầu' },
  { id: 'random', label: 'Random N' },
];

/**
 * Thanh phạm vi (presentational, dùng chung Flashcard & Quiz). Chỉ hiển thị + phát sự kiện;
 * logic chọn "N từ đầu" (createdAt tăng dần) / "Random N" (bốc lại khi bấm) nằm ở nơi dùng.
 */
export function ScopeBar({
  total,
  used,
  kind,
  n,
  onKindChange,
  onNChange,
}: ScopeBarProps): ReactElement {
  const disabled = total === 0;
  return (
    <div className="kn-scope" role="group" aria-label="Phạm vi">
      <span className="kn-scope__count">
        Phạm vi: <strong>{used}</strong>/{total}
      </span>
      <div className="kn-scope__chips">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={
              kind === chip.id ? 'kn-scope__chip kn-scope__chip--active' : 'kn-scope__chip'
            }
            aria-pressed={kind === chip.id}
            disabled={disabled}
            onClick={() => onKindChange(chip.id)}
          >
            {chip.label}
          </button>
        ))}
        <label className="kn-scope__n">
          <span className="kn-scope__n-label">N</span>
          <input
            type="number"
            className="kn-scope__n-input"
            min={1}
            max={Math.max(1, total)}
            value={n}
            disabled={disabled}
            onChange={(event) => onNChange(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
