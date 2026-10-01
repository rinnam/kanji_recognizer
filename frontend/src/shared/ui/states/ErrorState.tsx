import { type ReactElement } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Trạng thái "lỗi" dùng chung (role=alert + nút thử lại tùy chọn). */
export function ErrorState({
  title = 'Đã xảy ra lỗi',
  message,
  onRetry,
}: ErrorStateProps): ReactElement {
  return (
    <div className="kn-state" role="alert">
      <h2>{title}</h2>
      {message !== undefined ? <p>{message}</p> : null}
      {onRetry !== undefined ? (
        <button type="button" className="kn-btn" onClick={onRetry}>
          Thử lại
        </button>
      ) : null}
    </div>
  );
}
