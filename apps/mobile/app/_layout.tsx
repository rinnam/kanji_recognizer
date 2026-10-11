import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { DbProvider } from '../src/db/DbProvider';
import { ScopeProvider } from '../src/scope/ScopeProvider';

/** Root layout: DB SQLite + phạm vi học + Stack các màn hình. */
export default function RootLayout(): ReactElement {
  return (
    <DbProvider>
      <ScopeProvider>
        <Stack screenOptions={{ headerShown: true }} />
        <StatusBar style="auto" />
      </ScopeProvider>
    </DbProvider>
  );
}
