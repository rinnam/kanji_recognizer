import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ApiError } from '../../../shared/api';
import { useDb } from '../../../shared/db';
import { subscribeDataChanged } from '../../../shared/lib';
import { resetAndPullFromServer, runSync, type SyncRunSummary } from './runSync';
import { SyncContext, type SyncContextValue, type SyncState } from './sync-context';

/** Debounce đồng bộ sau khi ngừng thay đổi local (yêu cầu Mục 6/F5). */
const SYNC_DEBOUNCE_MS = 3500;

const SYNC_FAILED = 'Đồng bộ thất bại.';

/**
 * Mô tả lỗi đồng bộ cho tooltip SyncStatus: ApiError → kèm MÃ HTTP + message của server
 * (ví dụ "HTTP 500 · ..."), giúp người dùng báo lại chính xác nguyên nhân.
 */
function describeSyncError(error: unknown): string {
  if (error instanceof ApiError) return `HTTP ${error.status} · ${error.message}`;
  if (error instanceof Error) return error.message;
  return SYNC_FAILED;
}

function offlineNow(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Cung cấp vòng đồng bộ hai chiều cho toàn app. Đặt BÊN TRONG <DbProvider> (cần IndexedDB
 * đã mở). Tự đồng bộ: lần đầu khi mount, khi mạng online lại, và sau mỗi thay đổi local
 * (debounce 3.5s qua change-bus). Chống chạy chồng bằng cờ `running`.
 */
export function SyncProvider({ children }: { children: ReactNode }): ReactElement {
  const db = useDb();
  const [state, setState] = useState<SyncState>(() => (offlineNow() ? 'offline' : 'idle'));
  const [isOnline, setIsOnline] = useState<boolean>(() => !offlineNow());
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<SyncRunSummary | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Chống chạy chồng: đang chạy mà có yêu cầu mới → chạy lại đúng một lần sau khi xong.
  const runningRef = useRef<boolean>(false);
  const rerunRef = useRef<boolean>(false);
  const syncNowRef = useRef<() => void>(() => {});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncNow = useCallback((): void => {
    if (offlineNow()) {
      setIsOnline(false);
      setState('offline');
      return;
    }
    if (runningRef.current) {
      rerunRef.current = true;
      return;
    }
    runningRef.current = true;
    setIsOnline(true);
    setState('syncing');
    setLastError(null);
    void (async (): Promise<void> => {
      try {
        const summary = await runSync(db);
        setLastSummary(summary);
        setLastSyncedAt(new Date().toISOString());
        setState('idle');
      } catch (error) {
        // Log đầy đủ (status + body) ra console để người dùng báo lại; tooltip hiện bản gọn.
        console.error('[sync] Đồng bộ thất bại:', error);
        setLastError(describeSyncError(error));
        setState('error');
      } finally {
        runningRef.current = false;
        if (rerunRef.current) {
          rerunRef.current = false;
          syncNowRef.current();
        }
      }
    })();
  }, [db]);

  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  // Debounce thủ công (ổn định, deps []): KHÔNG gọi hàm hay đọc ref trong lúc render;
  // ref chỉ được đọc trong callback của setTimeout (chạy sau, ngoài render).
  const scheduleSync = useCallback((): void => {
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout((): void => {
      debounceTimerRef.current = null;
      syncNowRef.current();
    }, SYNC_DEBOUNCE_MS);
  }, []);

  // Thay đổi dữ liệu local (folder/vocabulary…) → đồng bộ sau debounce.
  useEffect(() => subscribeDataChanged(scheduleSync), [scheduleSync]);

  // Đồng bộ lần đầu khi mount + bám trạng thái mạng.
  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      syncNowRef.current();
    };
    const handleOffline = (): void => {
      setIsOnline(false);
      setState('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Tự động dọn sạch cache IndexedDB cũ để nhận đúng 880 từ mới chuẩn từ server
    const CLEAN_KEY = 'kanji_nest_clean_seed_880_done_v1';
    if (localStorage.getItem(CLEAN_KEY) !== 'true') {
      localStorage.setItem(CLEAN_KEY, 'true');
      void (async (): Promise<void> => {
        try {
          setState('syncing');
          const summary = await resetAndPullFromServer(db);
          setLastSummary(summary);
          setLastSyncedAt(new Date().toISOString());
          setState('idle');
        } catch (error) {
          console.error('[sync] Không thể làm mới từ server:', error);
          if (!offlineNow()) syncNowRef.current();
        }
      })();
    } else if (!offlineNow()) {
      syncNowRef.current();
    }

    return (): void => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    };
  }, [db]);

  const resetAndPull = useCallback((): void => {
    if (offlineNow()) {
      setIsOnline(false);
      setState('offline');
      return;
    }
    if (runningRef.current) return;
    runningRef.current = true;
    setIsOnline(true);
    setState('syncing');
    setLastError(null);
    void (async (): Promise<void> => {
      try {
        const summary = await resetAndPullFromServer(db);
        setLastSummary(summary);
        setLastSyncedAt(new Date().toISOString());
        setState('idle');
      } catch (error) {
        console.error('[sync] Làm mới từ server thất bại:', error);
        setLastError(describeSyncError(error));
        setState('error');
      } finally {
        runningRef.current = false;
      }
    })();
  }, [db]);

  const value = useMemo<SyncContextValue>(
    () => ({ state, isOnline, lastError, lastSummary, lastSyncedAt, syncNow, resetAndPull, scheduleSync }),
    [state, isOnline, lastError, lastSummary, lastSyncedAt, syncNow, resetAndPull, scheduleSync],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
