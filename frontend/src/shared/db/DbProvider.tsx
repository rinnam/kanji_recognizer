import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { openKanjiDb } from '../lib';
import { ErrorState, LoadingState } from '../ui';

/** Context giữ kết nối IndexedDB đã mở (null = chưa sẵn sàng). */
export const DbContext = createContext<IDBDatabase | null>(null);

type BootPhase =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; db: IDBDatabase };

/**
 * Mở IndexedDB MỘT lần cho toàn vòng đời app (local-first) rồi chia sẻ qua context.
 * KHÔNG đóng kết nối (các feature dùng chung). Hiển thị loading/error khi khởi động.
 */
export function DbProvider({ children }: { children: ReactNode }): ReactElement {
  const [state, setState] = useState<BootPhase>({ phase: 'loading' });

  const open = useCallback(async (): Promise<void> => {
    setState({ phase: 'loading' });
    try {
      const db = await openKanjiDb();
      setState({ phase: 'ready', db });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không mở được kho dữ liệu cục bộ.';
      setState({ phase: 'error', message });
    }
  }, []);

  useEffect(() => {
    void open();
    // Giữ kết nối mở suốt vòng đời app; không đóng ở cleanup.
  }, [open]);

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
        <ErrorState message={state.message} onRetry={() => void open()} />
      </div>
    );
  }
  return <DbContext.Provider value={state.db}>{children}</DbContext.Provider>;
}
