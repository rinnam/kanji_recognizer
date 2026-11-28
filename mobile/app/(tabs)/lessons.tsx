import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { LockClosedIcon } from '../../src/components/AppIcons';
import { TopHeader } from '../../src/components/TopHeader';
import {
  fetchPublicLessons,
  type JlptLevel,
  type PublicLessonSummary,
} from '../../src/features/lessons/lessons-api';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { useIsMobilePhone } from '../../src/utils/device';

const LEVELS: readonly JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function LessonsScreen() {
  const router = useRouter();
  const isPhone = useIsMobilePhone();
  const { width } = useWindowDimensions();
  const colMode: 1 | 2 | 3 = isPhone || width < 600 ? 1 : width >= 900 ? 3 : 2;

  const [level, setLevel] = useState<'ALL' | JlptLevel>('ALL');
  const [lessons, setLessons] = useState<PublicLessonSummary[]>([]);
  const [levelCounts, setLevelCounts] = useState<Record<JlptLevel, number>>({
    N5: 0,
    N4: 0,
    N3: 0,
    N2: 0,
    N1: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLessons = useCallback(async (targetLevel: 'ALL' | JlptLevel) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchPublicLessons(targetLevel);
      setLessons(data.lessons);
      setLevelCounts(data.levelCounts);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được danh sách bài học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLessons(level);
    }, [level, loadLessons]),
  );

  const totalLessonsCount = LEVELS.reduce((sum, lv) => sum + (levelCounts[lv] ?? 0), 0);

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Bài học"
        subtitle="Thư viện từ vựng và tài liệu theo cấp độ JLPT"
        rightSlot={
          <View style={styles.headerActions}>
            <Pressable style={styles.softPill} onPress={() => router.push('/practice/flashcard-quiz')}>
              <Text style={styles.softPillText}>Flashcard</Text>
            </Pressable>
            <Pressable style={styles.softPill} onPress={() => router.push('/lookup')}>
              <Text style={styles.softPillText}>Tra cứu</Text>
            </Pressable>
          </View>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.levelScroll}
        contentContainerStyle={styles.levelRow}
      >
        <Pressable
          style={[styles.levelChip, level === 'ALL' && styles.levelChipActive]}
          onPress={() => setLevel('ALL')}
        >
          <Text style={[styles.levelText, level === 'ALL' && styles.levelTextActive]}>
            Tất cả · {totalLessonsCount} bài
          </Text>
        </Pressable>
        {LEVELS.map((lv) => {
          const active = lv === level;
          return (
            <Pressable
              key={lv}
              style={[styles.levelChip, active && styles.levelChipActive]}
              onPress={() => setLevel(lv)}
            >
              <Text style={[styles.levelText, active && styles.levelTextActive]}>
                {lv} · {levelCounts[lv] ?? 0} bài
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {errorMsg ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={nihongoTheme.colors.accent} />
          <Text style={styles.emptyDesc}>Đang tải thư viện bài học...</Text>
        </View>
      ) : lessons.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {level === 'ALL'
              ? 'Chưa có bài học nào được công khai'
              : `Chưa có bài học nào cho cấp độ ${level}`}
          </Text>
          <Text style={styles.emptyDesc}>
            Nội dung bài học{level !== 'ALL' ? ` cấp độ ${level}` : ''} đang được cập nhật.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {lessons.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.lessonCard,
                colMode === 3 && styles.lessonCard3,
                colMode === 2 && styles.lessonCard2,
                colMode === 1 && styles.lessonCard1,
                item.locked && styles.lessonCardLocked,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(`/lessons/${encodeURIComponent(item.id)}`)}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.badgePair}>
                  <View style={styles.jlptBadge}>
                    <Text style={styles.jlptBadgeText}>{item.jlptLevel}</Text>
                  </View>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.tierRow}>
                  {item.locked ? (
                    <LockClosedIcon size={13} color={nihongoTheme.colors.warningText} />
                  ) : null}
                  <Text
                    style={[
                      styles.tierText,
                      item.locked && styles.tierTextLocked,
                    ]}
                  >
                    {item.accessTier === 'free' ? 'Miễn phí' : item.accessTier.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.lessonTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.summary ? (
                <Text style={styles.lessonSummary} numberOfLines={2}>
                  {item.summary}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.metaText}>
                  {item.itemCount} từ vựng · {item.materialCount} tài liệu
                </Text>
                <Text style={styles.openText}>{item.locked ? 'Mở khóa →' : 'Học bài →'}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  softPill: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  softPillText: { color: nihongoTheme.colors.accentHover, fontWeight: '700', fontSize: 12 },
  levelScroll: { flexGrow: 0, marginBottom: 14 },
  levelRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
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
  levelText: { fontSize: 13, fontWeight: '700', color: nihongoTheme.colors.textPrimary },
  levelTextActive: { color: '#FFFFFF' },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
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
  emptyTitle: { fontSize: 16, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  emptyDesc: { fontSize: 13, color: nihongoTheme.colors.textSecondary, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  lessonCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 8,
    justifyContent: 'space-between',
    ...nihongoTheme.shadow.card,
  },
  lessonCard3: { width: '32%' },
  lessonCard2: { width: '48.8%' },
  lessonCard1: { width: '100%' },
  lessonCardLocked: { backgroundColor: '#FAF7F3' },
  cardPressed: { opacity: 0.92 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badgePair: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jlptBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  jlptBadgeText: { fontSize: 11, fontWeight: '800', color: nihongoTheme.colors.accentHover },
  catBadge: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierText: { fontSize: 11, fontWeight: '700', color: '#1B873F' },
  tierTextLocked: { color: nihongoTheme.colors.warningText },
  lessonTitle: { fontSize: 15, fontWeight: '800', color: nihongoTheme.colors.textPrimary, lineHeight: 21 },
  lessonSummary: { fontSize: 12, color: nihongoTheme.colors.textSecondary, lineHeight: 18 },
  cardFooter: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: { fontSize: 12, color: nihongoTheme.colors.textMuted, fontWeight: '600' },
  openText: { fontSize: 12, fontWeight: '800', color: nihongoTheme.colors.accentHover },
});
