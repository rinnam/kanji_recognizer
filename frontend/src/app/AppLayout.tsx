import { Suspense, type ReactElement } from 'react';
import { Outlet } from 'react-router-dom';
import { SyncStatus } from '../features/sync';
import { HeaderSearch } from './HeaderSearch';
import { HeaderJlptFilter } from './HeaderJlptFilter';
import { LoadingState, ThemeToggle } from '../shared/ui';

/** Khung chung: header gọn (tên app + trạng thái đồng bộ + đổi theme) và vùng nội dung. */
export function AppLayout(): ReactElement {
  return (
    <div className="kn-shell">
      <header className="kn-header">
        <h1 className="kn-header__title">Kanji Nest</h1>
        <div className="kn-header__center">
          <HeaderSearch />
          <HeaderJlptFilter />
        </div>
        <div className="kn-header__right">
          <SyncStatus />
          <ThemeToggle />
        </div>
      </header>
      <main className="kn-main">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
