import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppShell } from '../src/components/AppShell';
import { TopHeader } from '../src/components/TopHeader';
import { nihongoTheme } from '../src/theme/nihongo-theme';
import {
  DEFAULT_PROFILE,
  readLearningProfile,
  type LearningProfile,
} from '../src/features/profile/profile-store';

export default function PlanScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<LearningProfile>(DEFAULT_PROFILE);

  useFocusEffect(
    useCallback(() => {
      void readLearningProfile().then(setProfile);
    }, []),
  );

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Kế hoạch học tập" subtitle="Lộ trình cá nhân hóa cùng Momo" />

      <View style={styles.card}>
        <Text style={styles.title}>Thiết lập hiện tại</Text>
        <Text style={styles.line}>Trình độ: {profile.jlptLevel}</Text>
        <Text style={styles.line}>Mục tiêu: {profile.primaryGoal}</Text>
        <Text style={styles.line}>Thời lượng: {profile.dailyMinutes} phút/ngày</Text>

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/profile/learning')}>
            <Text style={styles.primaryBtnText}>Chỉnh sửa kế hoạch</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={() => router.replace('/app')}>
            <Text style={styles.outlineBtnText}>Về trang chủ</Text>
          </Pressable>
        </View>
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
    padding: 20,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  line: {
    fontSize: 14,
    color: nihongoTheme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
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
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
  },
});
