import { type ReactElement, type ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
}

/** Trạng thái "rỗng" dùng chung (first-run / không có dữ liệu). */
export function EmptyState({
  title = 'Chưa có dữ liệu',
  description,
  action,
}: EmptyStateProps): ReactElement {
  return (
    <div className="kn-state">
      <h2>{title}</h2>
      {description !== undefined ? <p>{description}</p> : null}
      {action !== undefined ? <div className="kn-state__action">{action}</div> : null}
    </div>
  );
}
