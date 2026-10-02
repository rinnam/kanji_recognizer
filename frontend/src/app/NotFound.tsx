import { type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../shared/ui';

/** Trang 404 đơn giản + liên kết về màn hình làm việc. */
export function NotFound(): ReactElement {
  return (
    <EmptyState
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại."
      action={<Link to="/">Về màn hình chính</Link>}
    />
  );
}
