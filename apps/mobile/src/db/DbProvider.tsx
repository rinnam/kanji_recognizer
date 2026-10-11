import type { StoragePort } from '@kanji-nest/core';
import { createContext, useContext, useState, type ReactElement, type ReactNode } from 'react';
import { createSqliteStoragePort, openAppDatabase } from '../storage/sqlite-port';

const StorageContext = createContext<StoragePort | null>(null);

/**
 * Mở DB SQLite MỘT lần (sync, lazy) và cung cấp `StoragePort` cho toàn app.
 * Schema được dựng trong `openAppDatabase` nên màn hình chỉ việc dùng port.
 */
export function DbProvider({ children }: { children: ReactNode }): ReactElement {
  const [port] = useState<StoragePort>(() => createSqliteStoragePort(openAppDatabase()));
  return <StorageContext.Provider value={port}>{children}</StorageContext.Provider>;
}

/** Lấy port lưu trữ — ném lỗi nếu dùng ngoài `DbProvider`. */
export function useStoragePort(): StoragePort {
  const port = useContext(StorageContext);
  if (port === null) throw new Error('useStoragePort phải dùng trong <DbProvider>');
  return port;
}
