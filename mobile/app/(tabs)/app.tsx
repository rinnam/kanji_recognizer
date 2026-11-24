import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { MomoAvatar } from '../../src/components/MomoAvatar';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

const SKILLS = [
  { key: 'listening', title: 'Nghe', desc: 'Hội thoại và phát âm', badge: '🎧', route: '/practice/listening' as const },
  { key: 'speaking', title: 'Nói', desc: 'Luyện nói theo tình huống', badge: '🎙️', route: '/practice/speaking' as const },
  { key: 'reading', title: 'Đọc', desc: 'Đoạn văn theo cấp độ', badge: '📖', route: '/practice/reading' as const },
  { key: 'writing', title: 'Viết', desc: 'Kana, Kanji và viết câu', badge: '✍️', route: '/practice/writing' as const },
];

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(2026);

  const handleSearch = () => {
    router.push({ pathname: '/lookup', params: query.trim() ? { q: query.trim(), kind: 'words' } : undefined });
  };

  return (
    <AppShell>
      <TopHeader mode="home" jlptLevel="N3" dailyMinutes={30} />

      {/* Hero Greeting */}
      <View style={styles.heroRow}>
        <View style={styles.heroTextCol}>
          <Text style={styles.heroTitle}>Chào bạn</Text>
          <Text style={styles.heroSubtitle}>Một chút tiếng Nhật, mỗi ngày.</Text>
        </View>
        <MomoAvatar size={64} />
      </View>

      {/* Quick Search */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Tra cứu từ vựng</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Tra từ Nhật, kana, romaji hoặc tiếng Việt"
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.searchInput}
          />
          <Pressable style={styles.primaryBtn} onPress={handleSearch}>
            <Text style={styles.primaryBtnText}>Tìm từ</Text>
          </Pressable>
        </View>
      </View>

      {/* Daily Goal Card */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Mục tiêu hôm nay</Text>
          <View style={styles.softBadge}>
            <Text style={styles.softBadgeText}>0%</Text>
          </View>
        </View>
        <Text style={styles.goalTimer}>00:00 / 30 phút</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '0%' }]} />
        </View>
      </View>

      {/* Annual Study Heatmap */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>Lịch học</Text>
            <Text style={styles.cardSubtitle}>Hoạt động trong năm</Text>
          </View>
          <View style={styles.yearSwitch}>
            <Pressable style={styles.yearBtn} onPress={() => setYear((y) => y - 1)}>
              <Text style={styles.yearBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.yearLabel}>{year}</Text>
            <Pressable style={styles.yearBtn} onPress={() => setYear((y) => y + 1)}>
              <Text style={styles.yearBtnText}>›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>0</Text>
            <Text style={styles.kpiLabel}>Ngày liên tiếp</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>0</Text>
            <Text style={styles.kpiLabel}>Ngày đã học</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>0</Text>
            <Text style={styles.kpiLabel}>Chuỗi dài nhất</Text>
          </View>
        </View>

        {/* Empty 52-week placeholder heatmap */}
        <View style={styles.heatmapPlaceholder}>
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <View key={rowIdx} style={styles.heatmapRow}>
              {Array.from({ length: 26 }).map((__, colIdx) => (
                <View key={colIdx} style={styles.heatmapCell} />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* 2-Column Action Cards */}
      <View style={styles.twoColRow}>
        <View style={[styles.card, styles.flexCard]}>
          <Text style={styles.cardTitle}>Ôn tập hôm nay</Text>
          <Text style={styles.cardSubtitle}>Chưa có bộ thẻ nào đang học.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/flashcards')}>
            <Text style={styles.primaryBtnText}>Chọn bộ thẻ đầu tiên</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.flexCard]}>
          <Text style={styles.cardTitle}>Thử thách hôm nay</Text>
          <Text style={styles.cardSubtitle}>Mỗi ngày có tối đa 5 câu hỏi. Học ít nhất 4 từ để mở khóa.</Text>
          <Pressable style={[styles.primaryBtn, styles.disabledBtn]} disabled>
            <Text style={styles.primaryBtnText}>Bắt đầu thử thách</Text>
          </Pressable>
        </View>
      </View>

      {/* Quick Vocabulary Bar */}
      <Pressable style={styles.quickVocabBar} onPress={() => router.push('/lessons')}>
        <Text style={styles.quickVocabText}>Bài học từ vựng</Text>
        <Text style={styles.quickVocabArrow}>→</Text>
      </Pressable>

      {/* Skill Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Luyện kỹ năng</Text>
        <Pressable style={styles.outlinePill} onPress={() => router.push('/games')}>
          <Text style={styles.outlinePillText}>Game từ vựng</Text>
        </Pressable>
      </View>

      <View style={styles.skillGrid}>
        {SKILLS.map((skill) => (
          <Pressable key={skill.key} style={styles.skillCard} onPress={() => router.push(skill.route)}>
            <View style={styles.skillBadge}>
              <Text style={styles.skillEmoji}>{skill.badge}</Text>
            </View>
            <Text style={styles.skillTitle}>{skill.title}</Text>
            <Text style={styles.skillDesc}>{skill.desc}</Text>
          </Pressable>
        ))}
      </View>

      {/* Study Plan Banner */}
      <Pressable style={styles.planBanner} onPress={() => router.push('/plan')}>
        <View style={styles.planLeft}>
          <Text style={styles.planEyebrow}>HỌC CÙNG MOMO</Text>
          <Text style={styles.planTitle}>Một lộ trình vừa sức dành cho bạn</Text>
        </View>
        <MomoAvatar size={46} badgeColor="#FFFFFF" />
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroTextCol: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: 15,
    color: nihongoTheme.colors.textSecondary,
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    marginBottom: 14,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: nihongoTheme.colors.textSecondary,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: nihongoTheme.colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: nihongoTheme.colors.accentDisabled,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  softBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  softBadgeText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
    fontSize: 13,
  },
  goalTimer: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: nihongoTheme.colors.accentSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: 5,
  },
  yearSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  yearLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.successText,
  },
  kpiLabel: {
    fontSize: 12,
    color: nihongoTheme.colors.successText,
    marginTop: 2,
  },
  heatmapPlaceholder: {
    gap: 4,
    paddingTop: 4,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: 4,
  },
  heatmapCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 12,
    borderRadius: 3,
    backgroundColor: '#F3EEE8',
  },
  twoColRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  flexCard: {
    flex: 1,
    minWidth: 260,
  },
  quickVocabBar: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...nihongoTheme.shadow.card,
  },
  quickVocabText: {
    fontSize: 15,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  quickVocabArrow: {
    fontSize: 18,
    color: nihongoTheme.colors.accent,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  outlinePill: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  outlinePillText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 13,
  },
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  skillCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 155,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 6,
    ...nihongoTheme.shadow.card,
  },
  skillBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: nihongoTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  skillEmoji: {
    fontSize: 20,
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  skillDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  planBanner: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accentPill,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLeft: {
    gap: 4,
    flexShrink: 1,
  },
  planEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: nihongoTheme.colors.accentHover,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
});
