import { type ReactElement } from 'react';

/** Trạng thái "đang tải" dùng chung (có aria-live cho screen reader). */
export function LoadingState({ label = 'Đang tải…' }: { label?: string }): ReactElement {
  return (
    <div className="kn-state" role="status" aria-live="polite">
      <div className="kn-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
