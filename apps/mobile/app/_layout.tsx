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

/** Root layout: DB SQLite + theme + phạm vi học + Stack (tabs + sub-screens). */
export default function RootLayout(): ReactElement {
  return (
    <DbProvider>
      <ThemeProvider>
        <ScopeProvider>
          <ThemedStack />
          <ThemedStatusBar />
        </ScopeProvider>
      </ThemeProvider>
    </DbProvider>
  );
}

function ThemedStack(): ReactElement {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="overview" options={{ title: 'Từ vựng' }} />
      <Stack.Screen name="flashcard" options={{ title: 'Flashcard' }} />
      <Stack.Screen name="quiz" options={{ title: 'Luyện tập' }} />
      <Stack.Screen name="import" options={{ title: 'Thêm từ mới' }} />
    </Stack>
  );
}
