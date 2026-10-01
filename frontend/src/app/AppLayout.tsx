import { Suspense, type ReactElement } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { SyncStatus } from '../features/sync';
import { NAV_ITEMS } from '../routes';
import { LoadingState, ThemeToggle } from '../shared/ui';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'kn-nav__link kn-nav__link--active' : 'kn-nav__link';
}

/** Khung chung: header (tiêu đề + điều hướng + đổi theme) và vùng nội dung nạp lười. */
export function AppLayout(): ReactElement {
  return (
    <div className="kn-shell">
      <header className="kn-header">
        <h1 className="kn-header__title">Kanji Nest</h1>
        <nav className="kn-nav" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <SyncStatus />
        <ThemeToggle />
      </header>
      <main className="kn-main">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
