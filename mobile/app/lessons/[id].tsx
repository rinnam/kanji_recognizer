import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [hideMeaning, setHideMeaning] = useState(false);

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title={`Bài học (${id ?? '—'})`}
        subtitle="N3 · 0 từ vựng"
        rightSlot={
          <Pressable style={styles.primaryPill} onPress={() => router.push('/flashcards')}>
            <Text style={styles.primaryPillText}>Flashcard</Text>
          </Pressable>
        }
      />

      <View style={styles.toggleCard}>
        <Text style={styles.toggleLabel}>Ẩn nghĩa để tự ôn</Text>
        <Switch
          value={hideMeaning}
          onValueChange={(val) => {
            recordMeaningfulStudyAction('lesson_toggle');
            setHideMeaning(val);
          }}
          trackColor={{ false: '#E5DDD4', true: nihongoTheme.colors.accent }}
        />
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Chưa có từ vựng trong bài học này</Text>
        <Text style={styles.emptyDesc}>
          Danh sách từ vựng cho bài học này đang được cập nhật.
        </Text>
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
  toggleCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 28,
    alignItems: 'center',
    gap: 8,
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
});
