import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

export default function LessonsScreen() {
  const router = useRouter();
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('N3');

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Bài học"
        subtitle="Thư viện từ vựng theo cấp độ JLPT"
        rightSlot={
          <View style={styles.headerActions}>
            <Pressable style={styles.softPill} onPress={() => router.push('/flashcards')}>
              <Text style={styles.softPillText}>Flashcard</Text>
            </Pressable>
            <Pressable style={styles.softPill} onPress={() => router.push('/lookup')}>
              <Text style={styles.softPillText}>Tra cứu nhanh</Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.levelRow}>
        {LEVELS.map((lv) => {
          const active = lv === level;
          return (
            <Pressable
              key={lv}
              style={[styles.levelChip, active && styles.levelChipActive]}
              onPress={() => setLevel(lv)}
            >
              <Text style={[styles.levelText, active && styles.levelTextActive]}>{lv} · 0 bài</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Chưa có bài học nào cho cấp độ {level}</Text>
        <Text style={styles.emptyDesc}>
          Nội dung bài học cấp độ {level} đang được cập nhật.
        </Text>
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/lessons/demo-lesson')}>
          <Text style={styles.outlineBtnText}>Xem bài học mẫu →</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  softPill: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  softPillText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 12,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  levelChip: {
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  levelChipActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  levelTextActive: {
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  outlineBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  outlineBtnText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 13,
  },
});
