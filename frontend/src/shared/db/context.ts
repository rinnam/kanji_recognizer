import { createContext } from 'react';

/** Context giữ kết nối IndexedDB đã mở (null = chưa sẵn sàng). Tách file để tránh
 * cảnh báo react-refresh (một file chỉ nên export component). */
export const DbContext = createContext<IDBDatabase | null>(null);
