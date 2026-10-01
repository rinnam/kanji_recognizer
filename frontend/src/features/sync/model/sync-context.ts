import { createContext } from 'react';
import type { SyncRunSummary } from './runSync';

/** 4 trạng thái đồng bộ hiển thị trên UI (loading/empty/error/success tương ứng). */
export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncContextValue {
  state: SyncState;
  isOnline: boolean;
  lastError: string | null;
  lastSummary: SyncRunSummary | null;
  /** Thời điểm (client, CHỈ để hiển thị) hoàn tất đồng bộ gần nhất — không phải con trỏ sync. */
  lastSyncedAt: string | null;
  /** Đồng bộ ngay (bỏ qua debounce). */
  syncNow: () => void;
  /** Lên lịch đồng bộ sau debounce 3.5s (gộp nhiều thay đổi liên tiếp). */
  scheduleSync: () => void;
}

/** Tách context ra file riêng để file provider chỉ export component (tránh warning react-refresh). */
export const SyncContext = createContext<SyncContextValue | null>(null);
