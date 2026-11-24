import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';

export default function SpeakingScreen() {
  return (
    <AppShell>
      <TopHeader mode="subpage" title="Luyện nói" subtitle="Hội thoại theo tình huống cùng AI" />

      <Pressable style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>+ Cuộc trò chuyện mới</Text>
        <Text style={styles.ctaDesc}>Chọn tình huống (Đời sống, Ăn uống, Du lịch, Công việc) · Nói có gợi ý hoặc Tự nói</Text>
      </Pressable>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Hội thoại gần đây</Text>
        <Text style={styles.emptyDesc}>Chưa có phiên luyện nói nào được lưu.</Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  ctaCard: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.card,
    padding: 20,
    marginBottom: 14,
    gap: 6,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ctaDesc: {
    fontSize: 13,
    color: '#FFF3E6',
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
});
