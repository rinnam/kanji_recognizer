import { type ReactElement, type ReactNode } from 'react';
import { ThemeProvider } from '../shared/ui';

/** Gom các provider cấp app (hiện: theme). Thêm provider khác ở đây khi cần. */
export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  return <ThemeProvider>{children}</ThemeProvider>;
}
