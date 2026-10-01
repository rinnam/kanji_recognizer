import { type ReactElement } from 'react';
import { useTheme } from './useTheme';

/** Nút chuyển sáng/tối, có aria-label mô tả hành động. */
export function ThemeToggle(): ReactElement {
  const { theme, toggleTheme } = useTheme();
  const target = theme === 'dark' ? 'sáng' : 'tối';
  return (
    <button
      type="button"
      className="kn-btn"
      onClick={toggleTheme}
      aria-label={`Chuyển sang chế độ ${target}`}
    >
      {theme === 'dark' ? '🌙 Tối' : '☀️ Sáng'}
    </button>
  );
}
