import { type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes';
import { EmptyState } from '../shared/ui';

/** Trang 404 đơn giản + liên kết về Thư viện. */
export function NotFound(): ReactElement {
  return (
    <EmptyState
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại."
      action={<Link to={ROUTES.library}>Về Thư viện</Link>}
    />
  );
}
