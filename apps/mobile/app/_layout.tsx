import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';

/** Root layout (expo-router): M0 chỉ có 1 màn hình chờ, các tab/drawer làm ở M3. */
export default function RootLayout(): ReactElement {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}
