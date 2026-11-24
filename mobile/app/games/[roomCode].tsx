import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

export default function GameRoomScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();

  return (
    <AppShell>
      <TopHeader mode="subpage" title={`Phòng ${roomCode ?? '—'}`} subtitle="Phòng chờ Multiplayer (1/8)" />
      <View style={styles.card}>
        <Text style={styles.title}>Cấu hình phòng</Text>
        <Text style={styles.desc}>Chế độ: Công thành Momo · Trình độ: N3 · Thời gian mỗi câu: 10 giây</Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    gap: 8,
    ...nihongoTheme.shadow.card,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  desc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
});
