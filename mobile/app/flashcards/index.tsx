import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

const DECK_TABS = ['Có sẵn', 'Của tôi', 'Yêu thích'] as const;

export default function FlashcardsHomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof DECK_TABS)[number]>('Có sẵn');

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Flashcard"
        subtitle="Ôn tập lặp lại ngắt quãng (SRS)"
        rightSlot={
          <Pressable style={styles.primaryPill} onPress={() => router.push('/flashcards/new')}>
            <Text style={styles.primaryPillText}>+ Tạo bộ thẻ</Text>
          </Pressable>
        }
      />

      {/* Hôm nay card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hôm nay</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Đến hạn hôm nay</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Đã ôn hôm nay</Text>
          </View>
        </View>
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/flashcards/sessions/preview')}>
          <Text style={styles.outlineBtnText}>Xem trước giao diện phiên học SRS →</Text>
        </Pressable>
      </View>

      {/* Chọn bộ thẻ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Chọn bộ thẻ</Text>
        <View style={styles.tabsRow}>
          {DECK_TABS.map((t) => {
            const active = tab === t;
            return (
              <Pressable key={t} style={[styles.tabPill, active && styles.tabPillActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.emptyDesc}>Chưa có bộ thẻ nào trong mục "{tab}".</Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  primaryPill: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    marginBottom: 14,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.md,
    padding: 14,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  statLabel: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    marginTop: 2,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 10,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 13,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  tabPillActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  emptyDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    paddingVertical: 14,
    textAlign: 'center',
  },
});
