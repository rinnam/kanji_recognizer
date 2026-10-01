import { LibraryScreen } from './features/library/LibraryScreen';
import './App.css';
import './ProductShell.css';
import './features/library/LibraryScreen.css';

export function App() {
  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="wordmark" href="#library" aria-label="Trang chủ Thư viện Ink Desk">
          <span lang="ja" aria-hidden="true">墨</span>
          <strong>Ink Desk</strong>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="#library" aria-current="page">Thư viện</a>
          <span aria-disabled="true" title="Tính năng nhận diện chưa khả dụng">Nhận diện <small>Sắp ra mắt</small></span>
        </nav>
      </header>
      <main id="main-content">
        <LibraryScreen />
      </main>
    </div>
  );
}
