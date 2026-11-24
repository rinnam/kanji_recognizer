import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

const VOCAB_PILLS = [
  { label: 'Bài học từ vựng', route: '/lessons' as const },
  { label: 'Flashcard & Quiz', route: '/practice/flashcard-quiz' as const },
  { label: 'Game từ vựng', route: '/games' as const },
];

const SKILLS = [
  { title: 'Nghe', desc: 'Luyện nghe & Shadowing', icon: '🎧', route: '/practice/listening' as const },
  { title: 'Nói', desc: 'Hội thoại cùng AI', icon: '🎙️', route: '/practice/speaking' as const },
  { title: 'Đọc', desc: 'Thư viện bài đọc JLPT', icon: '📖', route: '/practice/reading' as const },
  { title: 'Viết', desc: 'Luyện viết trên giấy ô vuông', icon: '✍️', route: '/practice/writing' as const },
];

export default function PracticeScreen() {
  const router = useRouter();

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Luyện tập" subtitle="Chọn kỹ năng hoặc chế độ ôn từ vựng" />

      <Text style={styles.sectionTitle}>Từ vựng</Text>
      <View style={styles.pillRow}>
        {VOCAB_PILLS.map((item) => (
          <Pressable key={item.label} style={styles.pillCard} onPress={() => router.push(item.route)}>
            <Text style={styles.pillText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Kỹ năng</Text>
      <View style={styles.grid}>
        {SKILLS.map((skill) => (
          <Pressable key={skill.title} style={styles.skillCard} onPress={() => router.push(skill.route)}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>{skill.icon}</Text>
            </View>
            <Text style={styles.skillTitle}>{skill.title}</Text>
            <Text style={styles.skillDesc}>{skill.desc}</Text>
          </Pressable>
        ))}
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
    gap: 12,
  },
  skillCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 155,
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
});
