import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

export default function NewDeckScreen() {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Tạo bộ thẻ mới" />

      <View style={styles.card}>
        <Text style={styles.label}>Tên bộ thẻ</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ví dụ: Từ vựng N3 Tuần 1"
          placeholderTextColor={nihongoTheme.colors.textMuted}
          style={styles.input}
        />

        <View style={styles.tabsRow}>
          <Pressable style={[styles.tabPill, mode === 'single' && styles.tabPillActive]} onPress={() => setMode('single')}>
            <Text style={[styles.tabText, mode === 'single' && styles.tabTextActive]}>Từng thẻ</Text>
          </Pressable>
          <Pressable style={[styles.tabPill, mode === 'bulk' && styles.tabPillActive]} onPress={() => setMode('bulk')}>
            <Text style={[styles.tabText, mode === 'bulk' && styles.tabTextActive]}>Nhập hàng loạt</Text>
          </Pressable>
        </View>

        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>
            {mode === 'single'
              ? 'Biểu mẫu nhập từng thẻ (Kanji · Kana · Nghĩa tiếng Việt)'
              : 'Khung dán danh sách từ vựng hàng loạt'}
          </Text>
        </View>

        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Lưu bộ thẻ</Text>
        </Pressable>
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
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  input: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: nihongoTheme.colors.textPrimary,
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
  placeholderBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.md,
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: nihongoTheme.colors.textMuted,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
