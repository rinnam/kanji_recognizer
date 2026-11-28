import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VocabularyDto } from '../../../packages/contracts/src/study';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { MomoAvatar } from '../../src/components/MomoAvatar';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CoinKsIcon,
  FlameStreakIcon,
  HeadphonesSkillIcon,
  LockClosedIcon,
  ReadingSkillIcon,
  ShieldCheckIcon,
  SpeakingSkillIcon,
  TrophyArenaIcon,
  WritingSkillIcon,
} from '../../src/components/AppIcons';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import {
  DEFAULT_PROFILE,
  readLearningProfile,
  type LearningProfile,
} from '../../src/features/profile/profile-store';
import {
  formatMmSs,
  getLocalDateKey,
  recordMeaningfulStudyAction,
  setDailyChallengeActive,
  STREAK_MIN_SECONDS,
  useStudyTracker,
} from '../../src/features/study-tracker/use-study-tracker';
import {
  claimDailyChallenge,
  claimDailyGoal,
  claimStreakMilestone,
  useMembership,
} from '../../src/features/membership/membership-store';
import { libraryEndpoint, loadLibrary } from '../../src/library-source';
import { readServerCache, saveServerCache } from '../../src/workspace-storage';
import { hydrateQuizletStates } from '../../src/features/flashcards/quizlet-srs';
import { getUserScopedKey } from '../../src/features/auth/auth-store';
import { useIsMobilePhone } from '../../src/utils/device';

const DAILY_CHALLENGE_KEY = 'kanji_nest_daily_challenge_v2';

const SKILLS = [
  { key: 'listening', title: 'Nghe', desc: 'Hội thoại và phát âm', Icon: HeadphonesSkillIcon, route: '/practice/listening' as const },
  { key: 'speaking', title: 'Nói', desc: 'Luyện nói theo tình huống', Icon: SpeakingSkillIcon, route: '/practice/speaking' as const },
  { key: 'reading', title: 'Đọc', desc: 'Đoạn văn theo cấp độ', Icon: ReadingSkillIcon, route: '/practice/reading' as const },
  { key: 'writing', title: 'Viết', desc: 'Kana, Kanji và viết câu', Icon: WritingSkillIcon, route: '/practice/writing' as const },
];

interface DailyChallengeQuestion {
  word: VocabularyDto;
  choices: string[];
  correctAnswer: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const isPhone = useIsMobilePhone();
  const { width } = useWindowDimensions();
  const isTwoCol = !isPhone && width >= 680;
  const currentYear = new Date().getFullYear();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(currentYear);
  const [profile, setProfile] = useState<LearningProfile>(DEFAULT_PROFILE);
  const [words, setWords] = useState<VocabularyDto[]>([]);
  const [dueReviewCount, setDueReviewCount] = useState(0);
  const [dueNewCount, setDueNewCount] = useState(0);
  const [phoneLockNotice, setPhoneLockNotice] = useState(false);

  // Daily 5-question challenge state
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeSelected, setChallengeSelected] = useState<string | null>(null);
  const [challengeDoneToday, setChallengeDoneToday] = useState(false);
  const [ksFeedbackMsg, setKsFeedbackMsg] = useState<string | null>(null);
  const [claimingKs, setClaimingKs] = useState(false);

  const study = useStudyTracker(profile.dailyMinutes);
  const { summary: membership, refresh: refreshMem } = useMembership();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void readLearningProfile().then((p) => {
        if (active) setProfile(p);
      });
      void refreshMem();

      const todayKey = getLocalDateKey();
      void getUserScopedKey(DAILY_CHALLENGE_KEY)
        .then((cKey) => AsyncStorage.getItem(cKey))
        .then((raw) => {
          if (!active) return;
          if (!raw) {
            setChallengeDoneToday(false);
            setChallengeScore(0);
            return;
          }
          const saved = JSON.parse(raw) as { date?: string; score?: number };
          if (saved.date === todayKey) {
            setChallengeDoneToday(true);
            setChallengeScore(saved.score ?? 0);
          } else {
            setChallengeDoneToday(false);
            setChallengeScore(0);
          }
        })
        .catch(() => undefined);

      const loadSummary = async () => {
        let liveWords: VocabularyDto[] = [];
        if (libraryEndpoint) {
          const cached = await readServerCache(libraryEndpoint).catch(() => undefined);
          if (cached) liveWords = cached.vocabularies.filter((v) => !v.deletedAt);
        }
        if (liveWords.length === 0) {
          const controller = new AbortController();
          const pulled = await loadLibrary(controller.signal).catch(() => undefined);
          if (pulled) {
            if (libraryEndpoint) {
              void saveServerCache(libraryEndpoint, pulled).catch(() => undefined);
            }
            liveWords = pulled.vocabularies.filter((v) => !v.deletedAt);
          }
        }
        if (!active) return;
        setWords(liveWords);

        let savedLocal = {};
        try {
          const srsKey = await getUserScopedKey('kanji_nest_quizlet_srs_session_v1');
          const raw = await AsyncStorage.getItem(srsKey);
          if (raw) savedLocal = (JSON.parse(raw) as { states?: Record<string, never> }).states ?? {};
        } catch {
          // ignore
        }
        if (!active) return;
        const states = hydrateQuizletStates(liveWords, savedLocal);
        const rev = liveWords.filter(
          (w) => states[w.id]?.stage === 'review' || states[w.id]?.stage === 'learning',
        ).length;
        const nw = liveWords.filter((w) => !states[w.id] || states[w.id].stage === 'new').length;
        setDueReviewCount(rev);
        setDueNewCount(nw);
      };
      void loadSummary();
      return () => {
        active = false;
      };
    }, []),
  );

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
    // 26 weeks (182 days) anchored to today for currentYear, or Dec 31 for past years
    const cells: { key: string; level: number }[] = [];
    const anchor = year === currentYear ? new Date() : new Date(year, 11, 31);
    for (let i = 181; i >= 0; i -= 1) {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() - i);
      const k = getLocalDateKey(d);
      const inSelectedYear = year === currentYear || d.getFullYear() === year;
      const secs = inSelectedYear ? (study.logs[k]?.seconds ?? 0) : 0;
      const level = secs >= 1800 ? 3 : secs >= 600 ? 2 : secs >= STREAK_MIN_SECONDS ? 1 : 0;
      cells.push({ key: k, level });
    }
    return cells;
  }, [study.logs, year, currentYear]);

  const displayedYearDays = useMemo(() => {
    if (year === currentYear) return study.totalDays;
    return Object.values(study.logs).filter(
      (r) => r.seconds >= STREAK_MIN_SECONDS && r.date.startsWith(`${year}-`),
    ).length;
  }, [study.logs, study.totalDays, year, currentYear]);

  const handleSearch = () => {
    router.push({ pathname: '/lookup', params: query.trim() ? { q: query.trim(), kind: 'words' } : undefined });
  };

  const startChallenge = () => {
    setChallengeIdx(0);
    setChallengeScore(0);
    setChallengeSelected(null);
    setChallengeOpen(true);
    setDailyChallengeActive(true);
  };

  const closeChallengeModal = () => {
    setChallengeOpen(false);
    setDailyChallengeActive(false);
  };

  const handlePickChoice = (choice: string) => {
    if (challengeSelected) return;
    recordMeaningfulStudyAction('daily_challenge_answer');
    setChallengeSelected(choice);
    const q = challengeQuestions[challengeIdx];
    if (q && choice === q.correctAnswer) {
      setChallengeScore((s) => s + 1);
    }
  };

  const handleNextChallenge = () => {
    if (challengeIdx + 1 >= challengeQuestions.length) {
      const finalScore = challengeScore;
      setChallengeDoneToday(true);
      closeChallengeModal();
      void getUserScopedKey(DAILY_CHALLENGE_KEY)
        .then((cKey) =>
          AsyncStorage.setItem(
            cKey,
            JSON.stringify({ date: getLocalDateKey(), score: finalScore }),
          ),
        )
        .catch(() => undefined);
      void claimDailyChallenge(finalScore)
        .then((res) => {
          if (res.applied && res.delta > 0) {
            setKsFeedbackMsg(
              `Hoàn thành Thử thách (${finalScore}/${challengeQuestions.length}): Nhận +${res.delta} Xu KS!`,
            );
          }
        })
        .catch(() => undefined);
      return;
    }
    setChallengeSelected(null);
    setChallengeIdx((i) => i + 1);
  };

  const handleClaimDailyGoalKs = async () => {
    if (claimingKs) return;
    setClaimingKs(true);
    try {
      const res = await claimDailyGoal();
      if (res.applied) {
        setKsFeedbackMsg(`Đạt mục tiêu ${profile.dailyMinutes} phút: Đã cộng +${res.delta} Xu KS!`);
      }
    } catch (err) {
      setKsFeedbackMsg(err instanceof Error ? err.message : 'Chưa thể nhận Xu mục tiêu hôm nay.');
    } finally {
      setClaimingKs(false);
    }
  };

  const handleClaimStreakKs = async (days: 3 | 7 | 14 | 30) => {
    if (claimingKs) return;
    setClaimingKs(true);
    try {
      const res = await claimStreakMilestone(days);
      if (res.applied) {
        setKsFeedbackMsg(`Mốc chuỗi ${days} ngày liên tiếp: Đã cộng +${res.delta} Xu KS!`);
      }
    } catch (err) {
      setKsFeedbackMsg(err instanceof Error ? err.message : 'Không nhận được Xu mốc chuỗi.');
    } finally {
      setClaimingKs(false);
    }
  };

  const remainingStreakSecs = Math.max(0, STREAK_MIN_SECONDS - study.todaySeconds);
  const claimableMilestone = membership.streakStatus.milestones.find((m) => m.status === 'claimable');
  const goalReachedLocal = study.todaySeconds >= study.goalSeconds || membership.todayGoalStatus.eligible;
  const canClaimGoalKs = goalReachedLocal && !membership.todayGoalStatus.claimed;

  return (
    <AppShell>
      <TopHeader mode="home" jlptLevel={profile.jlptLevel} dailyMinutes={profile.dailyMinutes} />

      {/* Hero Greeting */}
      <View style={styles.heroRow}>
        <View style={styles.heroTextCol}>
          <Text style={[styles.heroTitle, isPhone && styles.heroTitlePhone]} numberOfLines={1}>
            Chào {profile.displayName}
          </Text>
          <Text style={styles.heroSubtitle}>Một chút tiếng Nhật, mỗi ngày.</Text>
        </View>
        <MomoAvatar size={isPhone ? 52 : 64} />
      </View>

      {/* Quick Search */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Tra cứu từ vựng</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder={isPhone ? 'Tra từ Nhật, kana, nghĩa Việt...' : 'Tra từ Nhật, kana, romaji hoặc tiếng Việt'}
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.searchInput}
          />
          <Pressable style={styles.primaryBtn} onPress={handleSearch}>
            <Text style={styles.primaryBtnText}>Tìm từ</Text>
          </Pressable>
        </View>
      </View>

      {ksFeedbackMsg ? (
        <Pressable style={styles.ksNoticeBox} onPress={() => router.push('/billing?tab=shop')}>
          <CoinKsIcon size={16} color={nihongoTheme.colors.accentHover} />
          <Text style={styles.ksNoticeText}>{ksFeedbackMsg} Xem ví Xu →</Text>
        </Pressable>
      ) : null}

      {/* Live Daily Goal Card */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Mục tiêu hôm nay</Text>
          <View style={styles.goalBadgesRow}>
            <View style={styles.ksRewardBadge}>
              <CoinKsIcon size={12} color={nihongoTheme.colors.accentHover} />
              <Text style={styles.ksRewardBadgeText}>+{membership.todayGoalStatus.rewardKs} KS</Text>
            </View>
            <View style={styles.softBadge}>
              <Text style={styles.softBadgeText}>{study.percent}%</Text>
            </View>
          </View>
        </View>
        <Text style={styles.goalTimer}>
          {formatMmSs(study.todaySeconds)} / {profile.dailyMinutes} phút
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${study.percent}%` }]} />
        </View>
        <View style={styles.streakHintRow}>
          <FlameStreakIcon
            size={15}
            color={study.streakActiveToday ? nihongoTheme.colors.accent : nihongoTheme.colors.textMuted}
          />
          <Text style={styles.streakHintText}>
            {study.streakActiveToday
              ? `Đã kích hoạt chuỗi hôm nay (${study.currentStreak} ngày liên tiếp)`
              : `Học thêm ${remainingStreakSecs} giây nữa để kích hoạt chuỗi hôm nay`}
          </Text>
        </View>
        <View style={styles.antiAfkStrip}>
          <ShieldCheckIcon
            size={14}
            color={study.timerStatus === 'counting' ? nihongoTheme.colors.successText : nihongoTheme.colors.textMuted}
          />
          <Text style={styles.antiAfkText} numberOfLines={1}>
            {study.timerStatus === 'counting'
              ? 'Đang tính giờ học hợp lệ'
              : 'Vào bài học bất kỳ để bắt đầu tính giờ'}
          </Text>
        </View>
        {canClaimGoalKs ? (
          <Pressable
            style={styles.claimKsBtn}
            disabled={claimingKs}
            onPress={() => void handleClaimDailyGoalKs()}
          >
            <Text style={styles.claimKsBtnText}>
              {claimingKs ? 'Đang nhận Xu...' : `Nhận thưởng +${membership.todayGoalStatus.rewardKs} Xu KS`}
            </Text>
          </Pressable>
        ) : membership.todayGoalStatus.claimed ? (
          <Text style={styles.claimedKsLabel}>
            ✓ Đã nhận +{membership.todayGoalStatus.rewardKs} Xu KS mục tiêu hôm nay
          </Text>
        ) : null}
      </View>

      {/* Annual Study Heatmap */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>Lịch học</Text>
            <Text style={styles.cardSubtitle}>
              {year === currentYear ? '26 tuần gần nhất' : `Hoạt động năm ${year}`}
            </Text>
          </View>
          <View style={styles.yearSwitch}>
            <Pressable style={styles.yearBtn} onPress={() => setYear((y) => y - 1)}>
              <ChevronLeftIcon size={15} color={nihongoTheme.colors.textPrimary} />
            </Pressable>
            <Text style={styles.yearLabel}>{year}</Text>
            <Pressable
              style={[styles.yearBtn, year >= currentYear && styles.yearBtnDisabled]}
              disabled={year >= currentYear}
              onPress={() => setYear((y) => Math.min(currentYear, y + 1))}
            >
              <ChevronRightIcon size={15} color={nihongoTheme.colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.kpiRow, isPhone && styles.kpiRowPhone]}>
          <View style={[styles.kpiBox, isPhone && styles.kpiBoxPhone]}>
            <Text style={styles.kpiValue}>{study.currentStreak}</Text>
            <Text style={[styles.kpiLabel, isPhone && styles.kpiLabelPhone]}>Ngày liên tiếp</Text>
          </View>
          <View style={[styles.kpiBox, isPhone && styles.kpiBoxPhone]}>
            <Text style={styles.kpiValue}>{displayedYearDays}</Text>
            <Text style={[styles.kpiLabel, isPhone && styles.kpiLabelPhone]}>
              {year === currentYear ? 'Ngày đã học' : `Ngày học (${year})`}
            </Text>
          </View>
          <View style={[styles.kpiBox, isPhone && styles.kpiBoxPhone]}>
            <Text style={styles.kpiValue}>{study.longestStreak}</Text>
            <Text style={[styles.kpiLabel, isPhone && styles.kpiLabelPhone]}>Chuỗi dài nhất</Text>
          </View>
        </View>

        {claimableMilestone ? (
          <Pressable
            style={styles.milestoneClaimBar}
            disabled={claimingKs}
            onPress={() =>
              void handleClaimStreakKs(claimableMilestone.days as 3 | 7 | 14 | 30)
            }
          >
            <TrophyArenaIcon size={15} color={nihongoTheme.colors.successText} />
            <Text style={styles.milestoneClaimText}>
              Đạt mốc chuỗi {claimableMilestone.days} ngày liên tiếp — Nhận +{claimableMilestone.rewardKs} Xu KS!
            </Text>
          </Pressable>
        ) : null}

        {/* Live 26-week Heatmap */}
        <View style={styles.heatmapPlaceholder}>
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <View key={rowIdx} style={[styles.heatmapRow, isPhone && styles.heatmapRowPhone]}>
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
      <View style={[styles.twoColRow, isTwoCol && styles.twoColRowWide]}>
        <View style={[styles.card, styles.twoColCard, isTwoCol && styles.flexCardWide]}>
          <View style={styles.flexCardBody}>
            <Text style={styles.cardTitle}>Ôn tập hôm nay</Text>
            <Text style={styles.cardSubtitle}>
              {words.length > 0
                ? `Bạn còn ${dueReviewCount} thẻ cần ôn · ${dueNewCount} thẻ mới (${words.length} từ trong thư viện)`
                : 'Chưa có bộ thẻ nào đang học.'}
            </Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/practice/flashcard-quiz')}>
            <Text style={styles.primaryBtnText}>Tiếp tục flashcard</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.twoColCard, isTwoCol && styles.flexCardWide]}>
          <View style={styles.flexCardBody}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Thử thách hôm nay</Text>
              <View style={styles.ksRewardBadge}>
                <CoinKsIcon size={12} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.ksRewardBadgeText}>Tới 30+ KS</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              {challengeDoneToday
                ? `Bạn đã hoàn thành thử thách hôm nay (${challengeScore}/${challengeQuestions.length} câu đúng)${
                    membership.todayChallengeClaimed ? ' · ✓ Đã cộng Xu KS' : ''
                  }!`
                : '+4 KS / câu đúng · +10 KS thưởng hoàn hảo 5/5 câu từ kho từ của bạn.'}
            </Text>
          </View>
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

      {/* Quick Vocabulary & Grammar Bars */}
      <Pressable style={styles.quickVocabBar} onPress={() => router.push('/lessons')}>
        <Text style={styles.quickVocabText}>Bài học từ vựng</Text>
        <Text style={styles.quickVocabArrow}>→</Text>
      </Pressable>
      <Pressable style={styles.quickVocabBar} onPress={() => router.push('/practice/grammar')}>
        <Text style={styles.quickVocabText}>Ngữ pháp JLPT &amp; Game Xếp câu ★</Text>
        <Text style={styles.quickVocabArrow}>→</Text>
      </Pressable>

      {/* Skill Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Luyện kỹ năng</Text>
        <Pressable style={styles.outlinePill} onPress={() => router.push('/games')}>
          <Text style={styles.outlinePillText}>Trung tâm Game</Text>
        </Pressable>
      </View>

      {phoneLockNotice ? (
        <View style={styles.lockNoticeBox}>
          <LockClosedIcon size={16} color={nihongoTheme.colors.warningText} />
          <Text style={styles.lockNoticeText}>
            Tính năng Luyện nói &amp; Phỏng vấn 3D cùng AI hiện chỉ mở trên trình duyệt máy tính (Web PC).
          </Text>
        </View>
      ) : null}

      <View style={styles.skillGrid}>
        {SKILLS.map((skill) => {
          const lockedOnPhone = isPhone && skill.key === 'speaking';
          const SkillIcon = skill.Icon;
          return (
            <Pressable
              key={skill.key}
              style={[
                styles.skillCard,
                isPhone && styles.skillCardPhone,
                lockedOnPhone && styles.skillCardLocked,
              ]}
              onPress={() => {
                if (lockedOnPhone) {
                  setPhoneLockNotice(true);
                  return;
                }
                router.push(skill.route);
              }}
            >
              <View style={styles.rowBetween}>
                <View style={styles.skillBadge}>
                  {lockedOnPhone ? (
                    <LockClosedIcon size={20} color={nihongoTheme.colors.textMuted} />
                  ) : (
                    <SkillIcon size={22} color={nihongoTheme.colors.accentHover} />
                  )}
                </View>
                {lockedOnPhone ? (
                  <View style={styles.webOnlyPill}>
                    <Text style={styles.webOnlyPillText}>Chỉ trên Web</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.skillTitle}>{skill.title}</Text>
              <Text style={styles.skillDesc}>
                {lockedOnPhone ? 'Khóa trên điện thoại (mở trên Web PC)' : skill.desc}
              </Text>
            </Pressable>
          );
        })}
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
      <Modal visible={challengeOpen} transparent animationType="fade" onRequestClose={closeChallengeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>
                Thử thách hôm nay ({challengeIdx + 1}/{challengeQuestions.length})
              </Text>
              <Pressable onPress={closeChallengeModal}>
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
    flexDirection: 'column',
    gap: 14,
    marginBottom: 14,
  },
  twoColRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  twoColCard: {
    marginBottom: 0,
  },
  flexCardWide: {
    flex: 1,
    justifyContent: 'space-between',
  },
  flexCardBody: {
    gap: 10,
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
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 16,
  },
  skillCard: {
    width: '48.4%',
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
  heroTitlePhone: {
    fontSize: 22,
  },
  streakHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
  },
  yearBtnDisabled: {
    opacity: 0.35,
  },
  kpiRowPhone: {
    gap: 6,
  },
  kpiBoxPhone: {
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  kpiLabelPhone: {
    fontSize: 11,
    textAlign: 'center',
  },
  heatmapRowPhone: {
    gap: 2.5,
  },
  skillCardPhone: {
    padding: 14,
  },
  skillCardLocked: {
    opacity: 0.68,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
  },
  webOnlyPill: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  webOnlyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  lockNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: nihongoTheme.colors.warningBg,
    borderRadius: nihongoTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  lockNoticeText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.warningText,
    lineHeight: 18,
  },
  ksNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  ksNoticeText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  goalBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ksRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  ksRewardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  antiAfkStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  antiAfkText: {
    flex: 1,
    fontSize: 11.5,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 16,
  },
  claimKsBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  claimKsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  claimedKsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.successText,
  },
  milestoneClaimBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: nihongoTheme.colors.successBg,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.successText,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  milestoneClaimText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.successText,
    textAlign: 'center',
  },
});
