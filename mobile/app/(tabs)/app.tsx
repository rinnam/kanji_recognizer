import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VocabularyDto } from '../../../packages/contracts/src/study';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { MomoAvatar } from '../../src/components/MomoAvatar';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import {
  DEFAULT_PROFILE,
  readLearningProfile,
  type LearningProfile,
} from '../../src/features/profile/profile-store';
import {
  formatMmSs,
  getLocalDateKey,
  useStudyTracker,
} from '../../src/features/study-tracker/use-study-tracker';
import { libraryEndpoint, loadLibrary } from '../../src/library-source';
import { readServerCache } from '../../src/workspace-storage';
import { hydrateQuizletStates } from '../../src/features/flashcards/quizlet-srs';

const SKILLS = [
  { key: 'listening', title: 'Nghe', desc: 'Hội thoại và phát âm', badge: '🎧', route: '/practice/listening' as const },
  { key: 'speaking', title: 'Nói', desc: 'Luyện nói theo tình huống', badge: '🎙️', route: '/practice/speaking' as const },
  { key: 'reading', title: 'Đọc', desc: 'Đoạn văn theo cấp độ', badge: '📖', route: '/practice/reading' as const },
  { key: 'writing', title: 'Viết', desc: 'Kana, Kanji và viết câu', badge: '✍️', route: '/practice/writing' as const },
];

interface DailyChallengeQuestion {
  word: VocabularyDto;
  choices: string[];
  correctAnswer: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [profile, setProfile] = useState<LearningProfile>(DEFAULT_PROFILE);
  const [words, setWords] = useState<VocabularyDto[]>([]);
  const [dueReviewCount, setDueReviewCount] = useState(0);
  const [dueNewCount, setDueNewCount] = useState(0);

  // Daily 5-question challenge state
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeSelected, setChallengeSelected] = useState<string | null>(null);
  const [challengeDoneToday, setChallengeDoneToday] = useState(false);

  const study = useStudyTracker(profile.dailyMinutes);

  useEffect(() => {
    void readLearningProfile().then(setProfile);
    const loadSummary = async () => {
      let liveWords: VocabularyDto[] = [];
      if (libraryEndpoint) {
        const cached = await readServerCache(libraryEndpoint).catch(() => undefined);
        if (cached) liveWords = cached.vocabularies.filter((v) => !v.deletedAt);
      }
      if (liveWords.length === 0) {
        const controller = new AbortController();
        const pulled = await loadLibrary(controller.signal).catch(() => undefined);
        if (pulled) liveWords = pulled.vocabularies.filter((v) => !v.deletedAt);
      }
      setWords(liveWords);

      let savedLocal = {};
      try {
        const raw = await AsyncStorage.getItem('kanji_nest_quizlet_srs_session_v1');
        if (raw) savedLocal = (JSON.parse(raw) as { states?: Record<string, never> }).states ?? {};
      } catch {
        // ignore
      }
      const states = hydrateQuizletStates(liveWords, savedLocal);
      const rev = liveWords.filter((w) => states[w.id]?.stage === 'review' || states[w.id]?.stage === 'learning').length;
      const nw = liveWords.filter((w) => !states[w.id] || states[w.id].stage === 'new').length;
      setDueReviewCount(rev);
      setDueNewCount(nw);
    };
    void loadSummary();
  }, []);

  const challengeQuestions = useMemo<DailyChallengeQuestion[]>(() => {
    if (words.length < 4) return [];
    const pool = [...words].slice(0, 40);
    const chosen = pool.slice(0, 5);
    return chosen.map((w, idx) => {
      const distractors = pool
        .filter((other) => other.id !== w.id && other.meaning !== w.meaning)
        .slice(idx, idx + 3)
        .map((d) => d.meaning);
      const all = [w.meaning, ...distractors].sort((a, b) => a.localeCompare(b));
      return { word: w, choices: all, correctAnswer: w.meaning };
    });
  }, [words]);

  const heatmapCells = useMemo(() => {
    // Last 26 weeks (182 days) ending today
    const cells: { key: string; level: number }[] = [];
    const today = new Date();
    for (let i = 181; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = getLocalDateKey(d);
      const secs = study.logs[k]?.seconds ?? 0;
      const level = secs >= 1800 ? 3 : secs >= 600 ? 2 : secs >= 60 ? 1 : 0;
      cells.push({ key: k, level });
    }
    return cells;
  }, [study.logs]);

  const handleSearch = () => {
    router.push({ pathname: '/lookup', params: query.trim() ? { q: query.trim(), kind: 'words' } : undefined });
  };

  const startChallenge = () => {
    setChallengeIdx(0);
    setChallengeScore(0);
    setChallengeSelected(null);
    setChallengeOpen(true);
  };

  const handlePickChoice = (choice: string) => {
    if (challengeSelected) return;
    setChallengeSelected(choice);
    const q = challengeQuestions[challengeIdx];
    if (q && choice === q.correctAnswer) {
      setChallengeScore((s) => s + 1);
    }
  };

  const handleNextChallenge = () => {
    if (challengeIdx + 1 >= challengeQuestions.length) {
      setChallengeDoneToday(true);
      setChallengeOpen(false);
      return;
    }
    setChallengeSelected(null);
    setChallengeIdx((i) => i + 1);
  };

  return (
    <AppShell>
      <TopHeader mode="home" jlptLevel={profile.jlptLevel} dailyMinutes={profile.dailyMinutes} />

      {/* Hero Greeting */}
      <View style={styles.heroRow}>
        <View style={styles.heroTextCol}>
          <Text style={styles.heroTitle}>Chào {profile.displayName}</Text>
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

      {/* Live Daily Goal Card */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Mục tiêu hôm nay</Text>
          <View style={styles.softBadge}>
            <Text style={styles.softBadgeText}>{study.percent}%</Text>
          </View>
        </View>
        <Text style={styles.goalTimer}>
          {formatMmSs(study.todaySeconds)} / {profile.dailyMinutes} phút
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${study.percent}%` }]} />
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
            <Text style={styles.kpiValue}>{study.currentStreak}</Text>
            <Text style={styles.kpiLabel}>Ngày liên tiếp</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{study.totalDays}</Text>
            <Text style={styles.kpiLabel}>Ngày đã học</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{study.longestStreak}</Text>
            <Text style={styles.kpiLabel}>Chuỗi dài nhất</Text>
          </View>
        </View>

        {/* Live 26-week Heatmap */}
        <View style={styles.heatmapPlaceholder}>
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <View key={rowIdx} style={styles.heatmapRow}>
              {Array.from({ length: 26 }).map((__, colIdx) => {
                const cell = heatmapCells[colIdx * 7 + rowIdx];
                const bg =
                  cell?.level === 3
                    ? '#1B873F'
                    : cell?.level === 2
                      ? '#4CAF50'
                      : cell?.level === 1
                        ? '#A5D6A7'
                        : '#F3EEE8';
                return <View key={colIdx} style={[styles.heatmapCell, { backgroundColor: bg }]} />;
              })}
            </View>
          ))}
        </View>
      </View>

      {/* 2-Column Action Cards */}
      <View style={styles.twoColRow}>
        <View style={[styles.card, styles.flexCard]}>
          <Text style={styles.cardTitle}>Ôn tập hôm nay</Text>
          <Text style={styles.cardSubtitle}>
            {words.length > 0
              ? `Bạn còn ${dueReviewCount} thẻ cần ôn · ${dueNewCount} thẻ mới (${words.length} từ trong thư viện)`
              : 'Chưa có bộ thẻ nào đang học.'}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/practice/flashcard-quiz')}>
            <Text style={styles.primaryBtnText}>Tiếp tục flashcard</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.flexCard]}>
          <Text style={styles.cardTitle}>Thử thách hôm nay</Text>
          <Text style={styles.cardSubtitle}>
            {challengeDoneToday
              ? `Bạn đã hoàn thành thử thách hôm nay (${challengeScore}/${challengeQuestions.length} câu đúng)!`
              : 'Mỗi ngày có tối đa 5 câu hỏi trắc nghiệm nhanh từ kho từ của bạn.'}
          </Text>
          <Pressable
            style={[styles.primaryBtn, challengeQuestions.length === 0 && styles.disabledBtn]}
            disabled={challengeQuestions.length === 0}
            onPress={startChallenge}
          >
            <Text style={styles.primaryBtnText}>
              {challengeDoneToday ? 'Làm lại thử thách' : 'Bắt đầu thử thách'}
            </Text>
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

      {/* Daily 5-Question Challenge Modal */}
      <Modal visible={challengeOpen} transparent animationType="fade" onRequestClose={() => setChallengeOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>
                Thử thách hôm nay ({challengeIdx + 1}/{challengeQuestions.length})
              </Text>
              <Pressable onPress={() => setChallengeOpen(false)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            {challengeQuestions[challengeIdx] ? (
              <>
                <Text style={styles.challengeWord}>{challengeQuestions[challengeIdx].word.word}</Text>
                <Text style={styles.challengeReading}>{challengeQuestions[challengeIdx].word.reading}</Text>

                <View style={styles.choicesCol}>
                  {challengeQuestions[challengeIdx].choices.map((c) => {
                    const isPicked = challengeSelected === c;
                    const isCorrect = c === challengeQuestions[challengeIdx].correctAnswer;
                    const bg = !challengeSelected
                      ? nihongoTheme.colors.surfaceSubtle
                      : isCorrect
                        ? nihongoTheme.colors.successBg
                        : isPicked
                          ? nihongoTheme.colors.warningBg
                          : nihongoTheme.colors.surfaceSubtle;
                    return (
                      <Pressable
                        key={c}
                        style={[styles.choiceBtn, { backgroundColor: bg }]}
                        onPress={() => handlePickChoice(c)}
                      >
                        <Text style={styles.choiceText}>{c}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {challengeSelected ? (
                  <Pressable style={styles.primaryBtn} onPress={handleNextChallenge}>
                    <Text style={styles.primaryBtnText}>
                      {challengeIdx + 1 >= challengeQuestions.length ? 'Hoàn thành ✓' : 'Câu tiếp theo →'}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 12, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 22,
    gap: 14,
    ...nihongoTheme.shadow.dock,
  },
  closeText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 13,
  },
  challengeWord: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    color: nihongoTheme.colors.textPrimary,
  },
  challengeReading: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    color: nihongoTheme.colors.accentHover,
    marginTop: -8,
  },
  choicesCol: {
    gap: 8,
  },
  choiceBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
});
