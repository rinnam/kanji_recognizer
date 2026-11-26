import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';

export default function BotGameScreen() {
  const [difficulty, setDifficulty] = useState<'Dễ' | 'Vừa' | 'Khó'>('Vừa');
  const [level, setLevel] = useState('N3');

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Công thành Momo" subtitle="Đấu máy · Kỷ lục: 0" />

      <View style={styles.card}>
        <Text style={styles.label}>Độ khó</Text>
        <View style={styles.row}>
          {(['Dễ', 'Vừa', 'Khó'] as const).map((d) => (
            <Pressable
              key={d}
              style={[styles.chip, difficulty === d && styles.chipActive]}
              onPress={() => {
                recordMeaningfulStudyAction('game_option');
                setDifficulty(d);
              }}
            >
              <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Trình độ</Text>
        <View style={styles.row}>
          {['N5', 'N4', 'N3', 'N2', 'N1'].map((lv) => (
            <Pressable
              key={lv}
              style={[styles.chip, level === lv && styles.chipActive]}
              onPress={() => {
                recordMeaningfulStudyAction('game_option');
                setLevel(lv);
              }}
            >
              <Text style={[styles.chipText, level === lv && styles.chipTextActive]}>{lv}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.rules}>
          100 HP · Tối đa 3 phút / 60 câu · Phím 1–4 trả lời · Q: Mưa tên · E: Khiên 5s · Combo 3/5/10
        </Text>

        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Xuất quân (Chưa có dữ liệu từ vựng)</Text>
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  chipActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  chipText: {
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  rules: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
