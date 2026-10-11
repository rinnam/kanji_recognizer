import { useContext } from 'react';
import { SyncContext, type SyncContextValue } from './sync-context';

/** Lấy API đồng bộ; ném lỗi nếu dùng ngoài <SyncProvider>. */
export function useSync(): SyncContextValue {
  const value = useContext(SyncContext);
  if (value === null) {
    throw new Error('useSync phải được dùng bên trong <SyncProvider>');
  }
  return value;
}
