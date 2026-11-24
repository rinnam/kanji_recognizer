import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';

const TYPES = ['Tất cả', 'Đoản văn', 'Trung văn', 'Trường văn', 'Tìm thông tin', 'Hiểu quan điểm', 'Tổng hợp'];

export default function ReadingScreen() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Tất cả');

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Thư viện bài đọc" subtitle="Luyện đọc hiểu JLPT kèm phân tích cấu trúc câu" />

      <View style={styles.card}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm kiếm bài đọc..."
          placeholderTextColor={nihongoTheme.colors.textMuted}
          style={styles.input}
        />
        <View style={styles.chipsRow}>
          {TYPES.map((t) => (
            <Pressable key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Chưa có bài đọc nào</Text>
        <Text style={styles.emptyDesc}>
          Hỗ trợ bật/tắt Furigana, bấm tra từ, trắc nghiệm A–D và 3 tab (Câu hỏi, Phân tích, Tips đọc hiểu).
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
  input: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: nihongoTheme.colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  chipActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
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
