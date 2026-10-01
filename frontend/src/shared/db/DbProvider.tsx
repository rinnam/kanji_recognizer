import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { openKanjiDb } from '../lib';
import { ErrorState, LoadingState } from '../ui';
import { DbContext } from './context';

type BootPhase =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; db: IDBDatabase };

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Không mở được kho dữ liệu cục bộ.';
}

/**
 * Mở IndexedDB MỘT lần cho toàn vòng đời app (local-first) rồi chia sẻ qua context.
 * KHÔNG đóng kết nối (các feature dùng chung). Hiển thị loading/error khi khởi động.
 */
export function DbProvider({ children }: { children: ReactNode }): ReactElement {
  const [state, setState] = useState<BootPhase>({ phase: 'loading' });

  // Nạp lần đầu: KHÔNG setState đồng bộ trước await (tránh cascading render).
  useEffect(() => {
    let active = true;
    void (async (): Promise<void> => {
      try {
        const db = await openKanjiDb();
        if (active) setState({ phase: 'ready', db });
      } catch (err) {
        if (active) setState({ phase: 'error', message: toMessage(err) });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Thử lại từ nút trong ErrorState (chạy ngoài effect nên được phép setState đồng bộ).
  const retry = useCallback((): void => {
    setState({ phase: 'loading' });
    void (async (): Promise<void> => {
      try {
        const db = await openKanjiDb();
        setState({ phase: 'ready', db });
      } catch (err) {
        setState({ phase: 'error', message: toMessage(err) });
      }
    })();
  }, []);

  if (state.phase === 'loading') {
    return (
      <div className="kn-boot">
        <LoadingState label="Đang mở kho dữ liệu cục bộ…" />
      </div>
    );
  }
  if (state.phase === 'error') {
    return (
      <div className="kn-boot">
        <ErrorState message={state.message} onRetry={retry} />
      </div>
    );
  }
  return <DbContext.Provider value={state.db}>{children}</DbContext.Provider>;
}
