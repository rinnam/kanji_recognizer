import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import {
  ChevronRightIcon,
  CoinKsIcon,
  GrammarSkillIcon,
  HeadphonesSkillIcon,
  LessonsNavIcon,
  LockClosedIcon,
  PracticeNavIcon,
  ReadingSkillIcon,
  SpeakingSkillIcon,
  TrophyArenaIcon,
  WritingSkillIcon,
} from '../../src/components/AppIcons';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { useIsMobilePhone } from '../../src/utils/device';

const VOCAB_SHORTCUTS = [
  {
    key: 'lessons',
    title: 'Bài học từ vựng',
    desc: 'Theo cấp độ JLPT',
    Icon: LessonsNavIcon,
    route: '/lessons' as const,
  },
  {
    key: 'flashcard-quiz',
    title: 'Flashcard & Quiz',
    desc: 'Ôn tập SRS mỗi ngày',
    Icon: PracticeNavIcon,
    route: '/practice/flashcard-quiz' as const,
  },
];

const GAME_HUB = {
  title: 'Trung tâm Game',
  desc: 'Sushi · Boss · Xếp câu ★ · Blitz',
  route: '/games' as const,
};

const CORE_SKILLS = [
  { key: 'listening', title: 'Nghe', desc: 'Luyện nghe & Shadowing', Icon: HeadphonesSkillIcon, route: '/practice/listening' as const },
  { key: 'speaking', title: 'Nói', desc: 'Hội thoại & Phỏng vấn AI', Icon: SpeakingSkillIcon, route: '/practice/speaking' as const },
  { key: 'reading', title: 'Đọc', desc: 'Thư viện bài đọc JLPT', Icon: ReadingSkillIcon, route: '/practice/reading' as const },
  { key: 'writing', title: 'Viết', desc: 'Luyện viết & sửa kính ngữ AI', Icon: WritingSkillIcon, route: '/practice/writing' as const },
];

const GRAMMAR_SKILL = {
  key: 'grammar',
  title: 'Ngữ pháp',
  desc: 'JLPT N5–N1 & Game ★',
  desktopDesc: 'Thư viện mẫu câu JLPT N5–N1 & Game Xếp câu ★',
  Icon: GrammarSkillIcon,
  route: '/practice/grammar' as const,
};

const MOBILE_ACTIVE_SKILLS = [
  CORE_SKILLS[0],
  CORE_SKILLS[2],
  CORE_SKILLS[3],
  GRAMMAR_SKILL,
];

export default function PracticeScreen() {
  const router = useRouter();
  const isPhone = useIsMobilePhone();
  const [phoneLockNotice, setPhoneLockNotice] = useState(false);

  const renderSkillTile = (skill: (typeof MOBILE_ACTIVE_SKILLS)[number]) => {
    const SkillIcon = skill.Icon;
    return (
      <Pressable
        key={skill.key}
        style={({ pressed }) => [
          styles.skillCard,
          isPhone ? styles.skillCardPhone : styles.skillCardDesktop,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push(skill.route)}
      >
        <View style={styles.iconCircle}>
          <SkillIcon size={22} color={nihongoTheme.colors.accentHover} />
        </View>
        <Text style={styles.skillTitle}>{skill.title}</Text>
        <Text style={styles.skillDesc}>{skill.desc}</Text>
      </Pressable>
    );
  };

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Luyện tập" subtitle="Chọn kỹ năng hoặc chế độ ôn từ vựng" />

      <Text style={styles.sectionTitle}>Từ vựng</Text>
      {isPhone ? (
        <View style={styles.vocabStack}>
          <View style={styles.vocabPairRow}>
            {VOCAB_SHORTCUTS.map((item) => {
              const IconComp = item.Icon;
              return (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [styles.vocabShortcutCard, pressed && styles.cardPressed]}
                  onPress={() => router.push(item.route)}
                >
                  <View style={styles.smallIconCircle}>
                    <IconComp size={18} color={nihongoTheme.colors.accentHover} />
                  </View>
                  <Text style={styles.vocabShortcutTitle}>{item.title}</Text>
                  <Text style={styles.vocabShortcutDesc}>{item.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [styles.gameBanner, pressed && styles.cardPressed]}
            onPress={() => router.push(GAME_HUB.route)}
          >
            <View style={styles.gameIconCircle}>
              <TrophyArenaIcon size={20} color={nihongoTheme.colors.accentHover} />
            </View>
            <View style={styles.bannerMeta}>
              <Text style={styles.vocabShortcutTitle}>{GAME_HUB.title}</Text>
              <Text style={styles.vocabShortcutDesc}>{GAME_HUB.desc}</Text>
            </View>
            <View style={styles.bannerRightGroup}>
              <View style={styles.ksPill}>
                <CoinKsIcon size={12} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.ksPillText}>+Xu KS</Text>
              </View>
              <ChevronRightIcon size={16} color={nihongoTheme.colors.accentHover} />
            </View>
          </Pressable>
        </View>
      ) : (
        <View style={styles.vocabDesktopRow}>
          {VOCAB_SHORTCUTS.map((item) => {
            const IconComp = item.Icon;
            return (
              <Pressable
                key={item.key}
                style={({ pressed }) => [styles.vocabDesktopCard, pressed && styles.cardPressed]}
                onPress={() => router.push(item.route)}
              >
                <View style={styles.smallIconCircle}>
                  <IconComp size={18} color={nihongoTheme.colors.accentHover} />
                </View>
                <Text style={styles.vocabShortcutTitle}>{item.title}</Text>
                <Text style={styles.vocabShortcutDesc}>{item.desc}</Text>
              </Pressable>
            );
          })}

          <Pressable
            style={({ pressed }) => [styles.vocabDesktopCard, styles.vocabGameCard, pressed && styles.cardPressed]}
            onPress={() => router.push(GAME_HUB.route)}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.smallIconCircle}>
                <TrophyArenaIcon size={18} color={nihongoTheme.colors.accentHover} />
              </View>
              <View style={styles.ksPill}>
                <CoinKsIcon size={12} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.ksPillText}>+Xu KS</Text>
              </View>
            </View>
            <Text style={styles.vocabShortcutTitle}>{GAME_HUB.title}</Text>
            <Text style={styles.vocabShortcutDesc}>{GAME_HUB.desc}</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Kỹ năng</Text>
      {phoneLockNotice ? (
        <View style={styles.lockNoticeBox}>
          <LockClosedIcon size={16} color={nihongoTheme.colors.warningText} />
          <Text style={styles.lockNoticeText}>
            Luyện nói &amp; Phỏng vấn 3D cùng AI hiện chỉ hỗ trợ trên trình duyệt máy tính (Web PC).
          </Text>
        </View>
      ) : null}

      {isPhone ? (
        <>
          <View style={styles.grid}>
            {MOBILE_ACTIVE_SKILLS.map(renderSkillTile)}
          </View>

          <Pressable
            style={({ pressed }) => [styles.lockedSkillBanner, pressed && styles.cardPressed]}
            onPress={() => setPhoneLockNotice(true)}
          >
            <View style={[styles.iconCircle, styles.lockedIconCircle]}>
              <LockClosedIcon size={20} color={nihongoTheme.colors.textMuted} />
            </View>
            <View style={styles.bannerMeta}>
              <Text style={styles.lockedBannerTitle}>Nói · Phỏng vấn 3D AI</Text>
              <Text style={styles.vocabShortcutDesc}>Khóa trên điện thoại (mở trên Web PC)</Text>
            </View>
            <View style={styles.webOnlyPill}>
              <Text style={styles.webOnlyPillText}>Chỉ trên Web</Text>
            </View>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.grid}>
            {CORE_SKILLS.map(renderSkillTile)}
          </View>

          <Pressable
            style={({ pressed }) => [styles.grammarWideCard, pressed && styles.cardPressed]}
            onPress={() => router.push(GRAMMAR_SKILL.route)}
          >
            <View style={[styles.iconCircle, styles.bannerIconCircle]}>
              <GrammarSkillIcon size={22} color={nihongoTheme.colors.accentHover} />
            </View>
            <View style={styles.bannerMeta}>
              <Text style={styles.skillTitle}>{GRAMMAR_SKILL.title}</Text>
              <Text style={styles.skillDesc}>{GRAMMAR_SKILL.desktopDesc}</Text>
            </View>
            <View style={styles.ctaPill}>
              <Text style={styles.ctaPillText}>Luyện ngay</Text>
              <ChevronRightIcon size={15} color={nihongoTheme.colors.accentHover} />
            </View>
          </Pressable>
        </>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  vocabStack: {
    gap: 10,
    marginBottom: 20,
  },
  vocabPairRow: {
    flexDirection: 'row',
    gap: 10,
  },
  vocabShortcutCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    gap: 6,
    ...nihongoTheme.shadow.card,
  },
  vocabDesktopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 22,
  },
  vocabDesktopCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 6,
    ...nihongoTheme.shadow.card,
  },
  vocabGameCard: {
    borderColor: '#FAD7B5',
    backgroundColor: '#FFFBF5',
  },
  smallIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: nihongoTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  vocabShortcutTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  vocabShortcutDesc: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 16,
  },
  gameBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBF5',
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: '#FAD7B5',
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...nihongoTheme.shadow.card,
  },
  gameIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: nihongoTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  bannerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ksPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  ksPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  skillCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    gap: 6,
    ...nihongoTheme.shadow.card,
  },
  skillCardPhone: {
    width: '48.4%',
    padding: 14,
  },
  skillCardDesktop: {
    width: '48.6%',
    padding: 18,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: nihongoTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bannerIconCircle: {
    marginBottom: 0,
  },
  lockedIconCircle: {
    marginBottom: 0,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  skillTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  skillDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lockedSkillBanner: {
    width: '100%',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    opacity: 0.78,
    ...nihongoTheme.shadow.card,
  },
  lockedBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  webOnlyPill: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  webOnlyPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  grammarWideCard: {
    width: '100%',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...nihongoTheme.shadow.card,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ctaPillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
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
});
