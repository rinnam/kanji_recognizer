import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import {
  GrammarSkillIcon,
  HeadphonesSkillIcon,
  LockClosedIcon,
  ReadingSkillIcon,
  SpeakingSkillIcon,
  WritingSkillIcon,
} from '../../src/components/AppIcons';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { useIsMobilePhone } from '../../src/utils/device';

const VOCAB_PILLS = [
  { label: 'Bài học từ vựng', route: '/lessons' as const },
  { label: 'Flashcard & Quiz', route: '/practice/flashcard-quiz' as const },
  { label: 'Trung tâm Game (Sushi · Boss)', route: '/games' as const },
];

const SKILLS = [
  { key: 'listening', title: 'Nghe', desc: 'Luyện nghe & Shadowing', Icon: HeadphonesSkillIcon, route: '/practice/listening' as const },
  { key: 'speaking', title: 'Nói', desc: 'Hội thoại cùng AI', Icon: SpeakingSkillIcon, route: '/practice/speaking' as const },
  { key: 'reading', title: 'Đọc', desc: 'Thư viện bài đọc JLPT', Icon: ReadingSkillIcon, route: '/practice/reading' as const },
  { key: 'writing', title: 'Viết', desc: 'Luyện viết & sửa kính ngữ AI', Icon: WritingSkillIcon, route: '/practice/writing' as const },
  { key: 'grammar', title: 'Ngữ pháp', desc: 'JLPT N5–N1 & Game ★', Icon: GrammarSkillIcon, route: '/practice/grammar' as const },
];

export default function PracticeScreen() {
  const router = useRouter();
  const isPhone = useIsMobilePhone();
  const [phoneLockNotice, setPhoneLockNotice] = useState(false);

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Luyện tập" subtitle="Chọn kỹ năng hoặc chế độ ôn từ vựng" />

      <Text style={styles.sectionTitle}>Từ vựng</Text>
      <View style={styles.pillRow}>
        {VOCAB_PILLS.map((item) => (
          <Pressable
            key={item.label}
            style={[styles.pillCard, isPhone && styles.pillCardPhone]}
            onPress={() => router.push(item.route)}
          >
            <Text style={styles.pillText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Kỹ năng</Text>
      {phoneLockNotice ? (
        <View style={styles.lockNoticeBox}>
          <LockClosedIcon size={16} color={nihongoTheme.colors.warningText} />
          <Text style={styles.lockNoticeText}>
            Luyện nói &amp; Phỏng vấn 3D cùng AI hiện chỉ hỗ trợ trên trình duyệt máy tính (Web PC).
          </Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {SKILLS.map((skill) => {
          const lockedOnPhone = isPhone && skill.key === 'speaking';
          const SkillIcon = skill.Icon;
          return (
            <Pressable
              key={skill.title}
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
              <View style={styles.cardTopRow}>
                <View style={styles.iconCircle}>
                  {lockedOnPhone ? (
                    <LockClosedIcon size={21} color={nihongoTheme.colors.textMuted} />
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  pillCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    ...nihongoTheme.shadow.card,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  skillCard: {
    width: '48.4%',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 6,
    ...nihongoTheme.shadow.card,
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
  icon: {
    fontSize: 22,
  },
  skillTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  skillDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  pillCardPhone: {
    flexGrow: 0,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
