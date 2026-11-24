import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';

export default function WritingScreen() {
  const [tab, setTab] = useState<'prompts' | 'drafts' | 'submitted'>('prompts');
  const [vertical, setVertical] = useState(false);
  const [text, setText] = useState('');

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Luyện viết"
        subtitle="Giấy ô vuông Genkouyoushi · Tiêu chí chấm 100 điểm"
        rightSlot={
          <Pressable style={styles.softPill} onPress={() => setVertical((v) => !v)}>
            <Text style={styles.softPillText}>{vertical ? 'Chuyển sang viết ngang' : 'Chuyển sang viết dọc'}</Text>
          </Pressable>
        }
      />

      <View style={styles.tabsRow}>
        {(
          [
            ['prompts', 'Bài tập'],
            ['drafts', 'Bản nháp'],
            ['submitted', 'Đã nộp'],
          ] as const
        ).map(([key, label]) => (
          <Pressable key={key} style={[styles.tabPill, tab === key && styles.tabPillActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Giấy làm bài ({vertical ? 'Viết dọc · Tategaki' : 'Viết ngang · Yokogaki'})</Text>
          <Text style={styles.counter}>{text.length} ký tự</Text>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="ここに書いてください。"
          placeholderTextColor={nihongoTheme.colors.textMuted}
          style={styles.editor}
        />

        <View style={styles.footerRow}>
          <Pressable style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>Lưu nháp</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Nộp bài</Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
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
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  tabPillActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  tabText: {
    fontWeight: '700',
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  counter: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  editor: {
    minHeight: 200,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.md,
    padding: 14,
    fontSize: 16,
    textAlignVertical: 'top',
    color: nihongoTheme.colors.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
