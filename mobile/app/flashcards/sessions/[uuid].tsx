import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';

const RATINGS = [
  { label: 'Chưa nhớ', interval: '1 phút' },
  { label: 'Mơ hồ', interval: '6 phút' },
  { label: 'Nhớ', interval: '10 phút' },
  { label: 'Rất nhớ', interval: '8 ngày' },
];

export default function FlashcardSessionScreen() {
  const router = useRouter();
  const [flipped, setFlipped] = useState(false);

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Phiên học Flashcard" subtitle="Đến hạn: 0 · Đã ôn: 0 · 0 / 0" />

      <Pressable style={styles.flashcard} onPress={() => setFlipped((v) => !v)}>
        <Text style={styles.kanji}>{flipped ? 'Nghĩa & Cách đọc' : 'Chưa có thẻ'}</Text>
        <Text style={styles.hint}>
          {flipped ? 'Mặt sau: Kana · Nghĩa tiếng Việt · TTS · ☆' : 'Chạm hoặc nhấn Space để lật'}
        </Text>
      </Pressable>

      <View style={styles.ratingRow}>
        {RATINGS.map((r) => (
          <Pressable key={r.label} style={styles.ratingBtn} onPress={() => setFlipped(false)}>
            <Text style={styles.ratingLabel}>{r.label}</Text>
            <Text style={styles.ratingInterval}>{r.interval}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.endBtn} onPress={() => router.back()}>
        <Text style={styles.endBtnText}>Kết thúc phiên học</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  flashcard: {
    minHeight: 260,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    ...nihongoTheme.shadow.card,
  },
  kanji: {
    fontSize: 32,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  hint: {
    fontSize: 13,
    color: nihongoTheme.colors.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  ratingBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  ratingInterval: {
    fontSize: 11,
    color: nihongoTheme.colors.accentHover,
    fontWeight: '600',
  },
  endBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  endBtnText: {
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '700',
  },
});
