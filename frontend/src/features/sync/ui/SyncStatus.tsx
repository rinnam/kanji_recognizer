import { type ReactElement } from 'react';
import { Button } from '../../../shared/ui';
import { useSync } from '../model/useSync';
import { type SyncState } from '../model/sync-context';
import './sync-status.css';

const STATE_LABEL: Record<SyncState, string> = {
  idle: 'Đã đồng bộ',
  syncing: 'Đang đồng bộ…',
  error: 'Lỗi đồng bộ',
  offline: 'Ngoại tuyến',
};

function formatClock(iso: string | null): string {
  if (iso === null) return 'chưa đồng bộ';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/** Chỉ báo trạng thái đồng bộ + nút "Đồng bộ ngay" trên header (4 trạng thái). */
export function SyncStatus(): ReactElement {
  const { state, isOnline, lastError, lastSummary, lastSyncedAt, syncNow, resetAndPull } = useSync();

  const detail =
    state === 'error' && lastError !== null
      ? lastError
      : lastSummary !== null
        ? `Lần gần nhất ${formatClock(lastSyncedAt)} · đẩy ${
            lastSummary.pushed.folders.applied + lastSummary.pushed.vocabularies.applied
          }, nhận ${lastSummary.merged.folders + lastSummary.merged.vocabularies}`
        : `Đồng bộ gần nhất: ${formatClock(lastSyncedAt)}`;

  return (
    <div className="kn-sync" role="status" aria-live="polite" title={detail}>
      <span className={`kn-sync__dot kn-sync__dot--${state}`} aria-hidden="true" />
      <span className="kn-sync__label">
        {lastSyncedAt === null && state !== 'syncing'
          ? `Chưa đồng bộ lần đầu${state === 'idle' ? '' : ` · ${STATE_LABEL[state]}`}`
          : STATE_LABEL[state]}
      </span>
      <Button
        variant="secondary"
        onClick={syncNow}
        disabled={state === 'syncing' || !isOnline}
        aria-label="Đồng bộ ngay"
      >
        Đồng bộ ngay
      </Button>
      <Button
        variant="secondary"
        onClick={resetAndPull}
        disabled={state === 'syncing' || !isOnline}
        title="Đồng bộ lại với máy chủ và giữ các thay đổi đang chờ"
        aria-label="Làm mới từ server"
      >
        Làm mới từ server
      </Button>
    </div>
  );
}
