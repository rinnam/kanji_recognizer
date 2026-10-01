import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { countFolders } from '../entities/folder';
import { countVocabularies } from '../entities/vocabulary';
import { openKanjiDb } from '../shared/lib';
import { EmptyState, ErrorState, LoadingState, ThemeToggle } from '../shared/ui';
import { AppProviders } from './AppProviders';

/** 4 trạng thái khởi động app shell: loading · error · empty · ready. */
type BootStatus =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'empty' }
  | { phase: 'ready'; folders: number; vocabularies: number };

function Shell({ children }: { children: ReactElement }): ReactElement {
  return (
    <div className="kn-shell">
      <header className="kn-header">
        <h1 className="kn-header__title">Kanji Nest</h1>
        <ThemeToggle />
      </header>
      <main className="kn-main">{children}</main>
    </div>
  );
}

function renderContent(status: BootStatus, onRetry: () => void): ReactElement {
  switch (status.phase) {
    case 'loading':
      return <LoadingState label="Đang mở kho dữ liệu cục bộ…" />;
    case 'error':
      return <ErrorState message={status.message} onRetry={onRetry} />;
    case 'empty':
      return (
        <EmptyState
          title="Bắt đầu với Kanji Nest"
          description="Chưa có thư mục hay từ vựng nào. Tính năng thêm từ (Quick Add) sẽ có ở Mục 6."
        />
      );
    case 'ready':
      return (
        <EmptyState
          title="Kho dữ liệu cục bộ đã sẵn sàng"
          description={`${status.folders} thư mục · ${status.vocabularies} từ vựng. Các tính năng sẽ được gắn ở Mục 6.`}
        />
      );
  }
}

export function App(): ReactElement {
  const [status, setStatus] = useState<BootStatus>({ phase: 'loading' });

  const boot = useCallback(async (): Promise<void> => {
    setStatus({ phase: 'loading' });
    try {
      const db = await openKanjiDb();
      const [folders, vocabularies] = await Promise.all([
        countFolders(db),
        countVocabularies(db),
      ]);
      db.close();
      setStatus(
        folders === 0 && vocabularies === 0
          ? { phase: 'empty' }
          : { phase: 'ready', folders, vocabularies },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không khởi tạo được kho dữ liệu cục bộ.';
      setStatus({ phase: 'error', message });
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  return (
    <AppProviders>
      <Shell>{renderContent(status, () => void boot())}</Shell>
    </AppProviders>
  );
}
