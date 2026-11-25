import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import {
  DEFAULT_PROFILE,
  readLearningProfile,
  type LearningProfile,
} from '../../src/features/profile/profile-store';
import {
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from '../../src/features/auth/auth-store';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<LearningProfile>(DEFAULT_PROFILE);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    void readLearningProfile().then(setProfile);
    void readAuthSession().then(setSession);
  }, []);

  const handleLogout = async () => {
    await saveAuthSession(null);
    setSession(null);
    router.push('/login');
  };

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Cá nhân"
        subtitle="Chế độ 1 người dùng (Local-First)"
        rightSlot={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.displayName.charAt(0).toUpperCase()}</Text>
          </View>
        }
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tài khoản & Phân quyền</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{session?.user.email ?? 'Chưa đăng nhập'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vai trò (Role)</Text>
          <View style={styles.greenBadge}>
            <Text style={styles.greenBadgeText}>
              {session ? (session.user.role === 'admin' ? 'Admin' : 'User') : 'Khách'}
            </Text>
          </View>
        </View>
        {session ? (
          <Pressable style={styles.outlineBtn} onPress={() => void handleLogout()}>
            <Text style={styles.outlineBtnText}>Đăng xuất</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/login')}>
            <Text style={styles.primaryBtnText}>Đăng nhập / Đăng ký</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thiết lập học tập</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trình độ hiện tại</Text>
          <Text style={styles.infoValue}>{profile.jlptLevel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mục tiêu chính</Text>
          <Text style={styles.infoValue}>{profile.primaryGoal}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Thời gian mỗi ngày</Text>
          <Text style={styles.infoValue}>{profile.dailyMinutes} phút</Text>
        </View>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/profile/learning')}>
          <Text style={styles.primaryBtnText}>Chỉnh sửa trình độ và mục tiêu</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lộ trình & Hướng dẫn</Text>
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/onboarding')}>
          <Text style={styles.outlineBtnText}>Mở lại màn hình Onboarding 3 bước</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: nihongoTheme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    marginBottom: 14,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  greenBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  greenBadgeText: {
    color: nihongoTheme.colors.successText,
    fontWeight: '700',
    fontSize: 12,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
});
