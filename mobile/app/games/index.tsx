import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

const GAMES = [
  { title: 'Công thành Momo', desc: '1v1 / Đấu máy · Thủ thành bằng từ vựng' },
  { title: 'Giành mic', desc: '2–8 người · Phản xạ giọng nói' },
  { title: 'Đối kháng từ vựng', desc: '2–8 người · Thi tốc độ gõ từ' },
];

export default function GamesHubScreen() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Kho game" subtitle="Vừa chơi vừa ôn từ vựng" />

      <View style={styles.actionsRow}>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/games/bot')}>
          <Text style={styles.primaryBtnText}>Đấu máy với Momo</Text>
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/games/NEW123')}>
          <Text style={styles.outlineBtnText}>Tạo phòng</Text>
        </Pressable>
      </View>

      <View style={styles.joinCard}>
        <TextInput
          value={roomCode}
          onChangeText={setRoomCode}
          placeholder="Nhập mã phòng 6 ký tự..."
          placeholderTextColor={nihongoTheme.colors.textMuted}
          style={styles.input}
        />
        <Pressable
          style={styles.joinBtn}
          onPress={() => router.push(`/games/${roomCode.trim() || 'DEMO01'}`)}
        >
          <Text style={styles.joinBtnText}>Vào phòng</Text>
        </Pressable>
      </View>

      {GAMES.map((g) => (
        <View key={g.title} style={styles.gameCard}>
          <Text style={styles.gameTitle}>{g.title}</Text>
          <Text style={styles.gameDesc}>{g.desc}</Text>
        </View>
      ))}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  outlineBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
  },
  joinCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 12,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: nihongoTheme.colors.textPrimary,
  },
  joinBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  joinBtnText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
  },
  gameCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    marginBottom: 12,
    gap: 4,
    ...nihongoTheme.shadow.card,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  gameDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
});
