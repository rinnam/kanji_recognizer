import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { nihongoTheme } from '../theme/nihongo-theme';
import { MomoAvatar } from './MomoAvatar';
import {
  CoinKsIcon,
  CrownIcon,
  HomeNavIcon,
  LessonsNavIcon,
  PracticeNavIcon,
  ProfileNavIcon,
  SearchNavIcon,
} from './AppIcons';
import { useMembership } from '../features/membership/membership-store';

const MAIN_NAV = [
  { label: 'Trang chủ', Icon: HomeNavIcon, route: '/app' as const },
  { label: 'Luyện tập', Icon: PracticeNavIcon, route: '/practice' as const },
  { label: 'Tra cứu', Icon: SearchNavIcon, route: '/lookup' as const },
  { label: 'Bài học', Icon: LessonsNavIcon, route: '/lessons' as const },
  { label: 'Cá nhân', Icon: ProfileNavIcon, route: '/profile' as const },
];

const VOCAB_NAV = [
  { label: 'Flashcard & Quiz', route: '/practice/flashcard-quiz' as const },
  { label: 'Game từ vựng', route: '/games' as const },
];

const QUICK_PRACTICE_NAV = [
  { label: 'Nghe & shadowing', route: '/practice/listening' as const },
  { label: 'Luyện nói AI', route: '/practice/speaking' as const },
  { label: 'Luyện đọc', route: '/practice/reading' as const },
  { label: 'Luyện viết', route: '/practice/writing' as const },
];

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { tier, ksBalance } = useMembership();

  const tierLabel = tier === 'pro' ? 'PRO AI' : tier === 'plus' ? 'PLUS' : 'FREE';

  const isActive = (route: string) => {
    if (route === '/app') return pathname === '/' || pathname === '/app';
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  return (
    <View style={styles.sidebar}>
      <Pressable style={styles.brand} onPress={() => router.push('/app')}>
        <MomoAvatar size={36} />
        <Text style={styles.brandText}>
          <Text style={styles.brandDark}>Kanji </Text>
          <Text style={styles.brandOrange}>Smart</Text>
        </Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>KHÔNG GIAN HỌC TẬP</Text>
        <View style={styles.group}>
          {MAIN_NAV.map((item) => {
            const active = isActive(item.route);
            const IconComp = item.Icon;
            const iconColor = active ? nihongoTheme.colors.accentHover : nihongoTheme.colors.textPrimary;
            return (
              <Pressable
                key={item.route}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => router.push(item.route)}
              >
                <View style={styles.navLeft}>
                  <View style={styles.navIconBox}>
                    <IconComp size={18} color={iconColor} active={active} />
                  </View>
                  <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
                </View>
                {active ? <View style={styles.activeDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>TỪ VỰNG</Text>
        <View style={styles.group}>
          {VOCAB_NAV.map((item) => {
            const active = isActive(item.route);
            return (
              <Pressable
                key={item.route}
                style={[styles.subNavItem, active && styles.navItemActive]}
                onPress={() => router.push(item.route)}
              >
                <Text style={[styles.subNavText, active && styles.navTextActive]}>{item.label}</Text>
                {active ? <View style={styles.activeDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>LUYỆN NHANH</Text>
        <View style={styles.group}>
          {QUICK_PRACTICE_NAV.map((item) => {
            const active = isActive(item.route);
            return (
              <Pressable
                key={item.route}
                style={[styles.subNavItem, active && styles.navItemActive]}
                onPress={() => router.push(item.route)}
              >
                <Text style={[styles.subNavText, active && styles.navTextActive]}>{item.label}</Text>
                {active ? <View style={styles.activeDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.billingCard, isActive('/billing') && styles.billingCardActive]}
          onPress={() => router.push('/billing')}
        >
          <View style={styles.billingTop}>
            <View style={styles.billingBadgeRow}>
              <CrownIcon size={15} color={nihongoTheme.colors.accentHover} />
              <Text style={styles.billingTierText}>{tierLabel}</Text>
            </View>
            <View style={styles.billingKsRow}>
              <CoinKsIcon size={14} color={nihongoTheme.colors.accentHover} />
              <Text style={styles.billingKsText}>{ksBalance.toLocaleString('vi-VN')} KS</Text>
            </View>
          </View>
          <Text style={styles.billingSubText}>Gói cước &amp; Cửa hàng Xu KS →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 236,
    backgroundColor: nihongoTheme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    marginBottom: 26,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandDark: {
    color: nihongoTheme.colors.textPrimary,
  },
  brandOrange: {
    color: nihongoTheme.colors.accent,
  },
  scroll: {
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: nihongoTheme.colors.textMuted,
    paddingHorizontal: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  group: {
    gap: 4,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
  },
  navItemActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navIconBox: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: nihongoTheme.colors.textPrimary,
  },
  navTextActive: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
  },
  subNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  subNavText: {
    fontSize: 13,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: nihongoTheme.colors.accent,
  },
  billingCard: {
    marginTop: 14,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 5,
  },
  billingCardActive: {
    borderColor: nihongoTheme.colors.accent,
  },
  billingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  billingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  billingTierText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  billingKsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  billingKsText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  billingSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
  },
});
