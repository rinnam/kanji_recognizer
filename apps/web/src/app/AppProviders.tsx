import { type ReactElement, type ReactNode } from 'react';
import { SyncProvider } from '../features/sync';
import { DbProvider } from '../shared/db';
import { ThemeProvider } from '../shared/ui';

/** Gom provider cấp app: Theme (ngoài cùng) → DbProvider (mở IndexedDB) → SyncProvider. */
export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider>
      <DbProvider>
        <SyncProvider>{children}</SyncProvider>
      </DbProvider>
    </ThemeProvider>
  );
}
