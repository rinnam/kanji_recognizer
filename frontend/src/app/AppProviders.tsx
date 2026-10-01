import { type ReactElement, type ReactNode } from 'react';
import { DbProvider } from '../shared/db';
import { ThemeProvider } from '../shared/ui';

/** Gom provider cấp app: Theme (ngoài cùng) → DbProvider (mở IndexedDB một lần). */
export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider>
      <DbProvider>{children}</DbProvider>
    </ThemeProvider>
  );
}
