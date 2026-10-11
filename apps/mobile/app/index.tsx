import { StyleSheet, Text, View } from 'react-native';
import type { ReactElement } from 'react';

/** Màn hình chờ M0 — UI thật (Tổng quan/Flashcard/Quiz) làm ở M3/M4, dùng chung packages/core. */
export default function Home(): ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>KanjiSmart</Text>
      <Text>Khung Expo + expo-router + expo-sqlite đã sẵn sàng.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});
