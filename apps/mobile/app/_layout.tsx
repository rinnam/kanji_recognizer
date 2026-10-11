import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { DbProvider } from '../src/db/DbProvider';

/** Root layout: DB SQLite + Stack 3 màn hình (Trang chính / Tổng quan / Flashcard). */
export default function RootLayout(): ReactElement {
  return (
    <DbProvider>
      <Stack
        screenOptions={{ headerShown: true }}
      />
      <StatusBar style="auto" />
    </DbProvider>
  );
}
