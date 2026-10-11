import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { DbProvider } from '../src/db/DbProvider';
import { ScopeProvider } from '../src/scope/ScopeProvider';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

function ThemedStatusBar(): ReactElement {
  const { name } = useTheme();
  return <StatusBar style={name === 'dark' ? 'light' : 'dark'} />;
}

/** Root layout: DB SQLite + theme + phạm vi học + Stack các màn hình. */
export default function RootLayout(): ReactElement {
  return (
    <DbProvider>
      <ThemeProvider>
        <ScopeProvider>
          <Stack screenOptions={{ headerShown: true }} />
          <ThemedStatusBar />
        </ScopeProvider>
      </ThemeProvider>
    </DbProvider>
  );
}
