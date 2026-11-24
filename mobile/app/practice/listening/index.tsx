import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';

export default function ListeningScreen() {
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [url, setUrl] = useState('');

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Luyện nghe & Shadowing" subtitle="Xem video YouTube có phụ đề Furigana" />

      <View style={styles.card}>
        <View style={styles.tabsRow}>
          <Pressable style={[styles.pill, tab === 'all' && styles.pillActive]} onPress={() => setTab('all')}>
            <Text style={[styles.pillText, tab === 'all' && styles.pillTextActive]}>Tất cả video</Text>
          </Pressable>
          <Pressable style={[styles.pill, tab === 'mine' && styles.pillActive]} onPress={() => setTab('mine')}>
            <Text style={[styles.pillText, tab === 'mine' && styles.pillTextActive]}>Video của tôi</Text>
          </Pressable>
        </View>

        <View style={styles.importRow}>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="Dán link YouTube (tối đa 20 phút)..."
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.input}
          />
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Thêm video</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Chưa có video luyện nghe</Text>
        <Text style={styles.emptyDesc}>
          Hỗ trợ 2 chế độ Shadowing & Nghe chép chính tả, phụ đề tách từ bấm tra từ điển trực tiếp.
        </Text>
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
    padding: 16,
    gap: 12,
    marginBottom: 14,
    ...nihongoTheme.shadow.card,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  pillActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  pillText: {
    fontWeight: '700',
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  importRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: nihongoTheme.colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 28,
    alignItems: 'center',
    gap: 8,
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
});
