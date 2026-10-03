import { type ReactElement, type ReactNode } from 'react';
import './toggle-icon-button.css';

interface ToggleIconButtonProps {
  /** Trạng thái bật/tắt (controlled: cha giữ state). */
  pressed: boolean;
  /** Gọi khi người dùng bấm; nhận trạng thái kế tiếp (!pressed). */
  onPressedChange: (next: boolean) => void;
  /** Nhãn trợ năng (aria-label); cũng dùng làm tooltip mặc định. */
  label: string;
  /** Icon SVG inline (shared/ui/icons). */
  icon: ReactNode;
  /** Tooltip khi rê chuột (mặc định = label). */
  tooltip?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Nút icon dạng CÔNG TẮC (toggle) dùng chung. Có `aria-pressed` cho trợ năng + test; khi
 * BẬT gắn thêm class `is-on`. CSS tô nền tint accent + viền/icon accent (cả theme sáng/tối).
 * Dùng kiểu controlled: cha truyền `pressed` và cập nhật qua `onPressedChange`.
 */
export function ToggleIconButton({
  pressed,
  onPressedChange,
  label,
  icon,
  tooltip,
  disabled = false,
  className,
}: ToggleIconButtonProps): ReactElement {
  const classes = ['kn-toggle-icon-btn', pressed ? 'is-on' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={classes}
      aria-pressed={pressed}
      aria-label={label}
      title={tooltip ?? label}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
    >
      {icon}
    </button>
  );
}
