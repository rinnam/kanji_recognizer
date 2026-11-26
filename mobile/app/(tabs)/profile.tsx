import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { MomoAvatar } from '../../src/components/MomoAvatar';
import { CoinKsIcon, CrownIcon } from '../../src/components/AppIcons';
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
import { useMembership } from '../../src/features/membership/membership-store';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<LearningProfile>(DEFAULT_PROFILE);
  const [session, setSession] = useState<AuthSession | null>(null);
  const { summary, tier, ksBalance, refresh } = useMembership();

  useFocusEffect(
    useCallback(() => {
      void readLearningProfile().then(setProfile);
      void readAuthSession().then(setSession);
      void refresh();
    }, []),
  );

  const handleLogout = async () => {
    await saveAuthSession(null);
    setSession(null);
    router.replace('/login');
  };

  const displayName = session?.user.displayName || profile.displayName;
  const email = session?.user.email || 'Chưa đăng nhập';
  const roleLabel = session?.user.role === 'admin' ? 'Admin' : 'Thành viên';

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Cá nhân" subtitle="Quản lý tài khoản và lộ trình học tập" />

      {/* Hero Profile Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>{displayName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            </View>
            <Text style={styles.heroEmail}>{email}</Text>
          </View>
        </View>
        <MomoAvatar size={52} />
      </View>

      {/* 3-Card Grid */}
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gói sử dụng &amp; Ví Xu KS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gói hiện tại</Text>
            <View style={styles.accentPill}>
              <Text style={styles.accentPillText}>{summary.subscription.planName}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hệ số tích Xu KS</Text>
            <Text style={styles.infoValue}>×{summary.subscription.multiplier}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số dư ví</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <CoinKsIcon size={15} color={nihongoTheme.colors.accentHover} />
              <Text style={[styles.infoValue, { color: nihongoTheme.colors.accentHover }]}>
                {ksBalance.toLocaleString('vi-VN')} KS
              </Text>
            </View>
          </View>
          {tier !== 'free' && summary.subscription.expiresAt ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hạn gói (Demo)</Text>
              <Text style={styles.infoValue}>
                {new Date(summary.subscription.expiresAt).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          ) : null}
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/billing')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CrownIcon size={15} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Quản lý gói &amp; Đổi Xu KS →</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thiết lập học tập</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trình độ hiện tại</Text>
            <View style={styles.accentPill}>
              <Text style={styles.accentPillText}>{profile.jlptLevel}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mục tiêu chính</Text>
            <Text style={styles.infoValue}>{profile.primaryGoal}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian mỗi ngày</Text>
            <Text style={styles.infoValue}>{profile.dailyMinutes} phút / ngày</Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/profile/learning')}>
            <Text style={styles.primaryBtnText}>Chỉnh sửa trình độ & mục tiêu</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phiên đăng nhập & Bảo mật</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái</Text>
            <View style={styles.greenBadge}>
              <Text style={styles.greenBadgeText}>{session ? 'Đã xác thực' : 'Chưa đăng nhập'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Đồng bộ đám mây</Text>
            <Text style={styles.infoValue}>PostgreSQL · Tự động</Text>
          </View>
          <View style={styles.actionsCol}>
            <Pressable style={styles.outlineBtn} onPress={() => router.push('/onboarding')}>
              <Text style={styles.outlineBtnText}>Mở lại hướng dẫn Onboarding</Text>
            </Pressable>
            {session ? (
              <Pressable style={styles.dangerBtn} onPress={() => void handleLogout()}>
                <Text style={styles.dangerBtnText}>Đăng xuất</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={() => router.push('/login')}>
                <Text style={styles.primaryBtnText}>Đăng nhập ngay</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    ...nihongoTheme.shadow.card,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatarLarge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: nihongoTheme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 24,
  },
  heroMeta: {
    gap: 4,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  heroEmail: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  roleBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    flex: 1,
    minWidth: 280,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    gap: 14,
    justifyContent: 'space-between',
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
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
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
  accentPill: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  accentPillText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
    fontSize: 12,
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
  actionsCol: {
    gap: 8,
    marginTop: 4,
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
  dangerBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
});
