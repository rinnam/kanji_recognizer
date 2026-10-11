import { useContext } from 'react';
import { DbContext } from './context';

/** Lấy kết nối IndexedDB đã mở; ném lỗi nếu dùng ngoài <DbProvider> (chưa sẵn sàng). */
export function useDb(): IDBDatabase {
  const db = useContext(DbContext);
  if (db === null) {
    throw new Error('useDb phải được dùng bên trong <DbProvider>');
  }
  return db;
}
