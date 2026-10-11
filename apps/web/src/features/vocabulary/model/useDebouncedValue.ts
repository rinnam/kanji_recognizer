import { useEffect, useState } from 'react';

/** Trả giá trị bị trễ `delayMs` sau lần đổi cuối (debounce ô tìm kiếm). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
