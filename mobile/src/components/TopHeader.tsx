import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { nihongoTheme } from '../theme/nihongo-theme';
import { MomoAvatar } from './MomoAvatar';
import { ChevronLeftIcon, CoinKsIcon } from './AppIcons';
import { DESKTOP_BREAKPOINT } from './AppShell';
import { useIsMobilePhone } from '../utils/device';
import { useMembership } from '../features/membership/membership-store';

interface TopHeaderProps {
  mode?: 'home' | 'subpage';
  title?: string;
  subtitle?: string;
  jlptLevel?: string;
  dailyMinutes?: number;
  rightSlot?: React.ReactNode;
  onBack?: () => void;
}

export function TopHeader({
  mode = 'subpage',
  title,
  subtitle,
  jlptLevel = 'N3',
  dailyMinutes = 30,
  rightSlot,
  onBack,
}: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isPhone = useIsMobilePhone();
  const { tier, ksBalance } = useMembership();
  const tierShort = tier === 'pro' ? 'Pro' : tier === 'plus' ? 'Plus' : 'Free';

  const handleOpenBilling = () => {
    if (pathname !== '/billing') {
      router.push('/billing');
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/app');
    }
  };

  return (
    <View style={[styles.wrapper, isPhone && styles.wrapperPhone]}>
      {!isDesktop || mode === 'home' ? (
        <View style={styles.brandRow}>
          {!isDesktop ? (
            <Pressable style={styles.brandLeft} onPress={() => router.push('/app')}>
              <MomoAvatar size={isPhone ? 30 : 34} />
              <Text style={[styles.brandText, isPhone && styles.brandTextPhone]}>
                <Text style={styles.brandDark}>Kanji </Text>
                <Text style={styles.brandOrange}>Smart</Text>
              </Text>
            </Pressable>
          ) : (
            <View />
          )}

          {mode === 'home' ? (
            <View style={styles.chipsRow}>
              <Pressable style={styles.ksPill} onPress={handleOpenBilling}>
                <CoinKsIcon size={13} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.ksPillText}>
                  {ksBalance.toLocaleString('vi-VN')} KS · {tierShort}
                </Text>
              </Pressable>
              <Pressable style={styles.pill} onPress={() => router.push('/plan')}>
                <Text style={styles.pillAccentText}>{jlptLevel}</Text>
              </Pressable>
              {!isPhone ? (
                <Pressable style={styles.pill} onPress={() => router.push('/plan')}>
                  <Text style={styles.pillText}>{dailyMinutes} phút/ngày</Text>
                </Pressable>
              ) : null}
            </View>
          ) : !isDesktop ? (
            <Pressable style={styles.ksPill} onPress={handleOpenBilling}>
              <CoinKsIcon size={13} color={nihongoTheme.colors.accentHover} />
              <Text style={styles.ksPillText}>
                {ksBalance.toLocaleString('vi-VN')} KS · {tierShort}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {mode === 'subpage' && title ? (
        <View style={[styles.subHeaderRow, isPhone && styles.subHeaderRowPhone]}>
          <View style={styles.subHeaderLeft}>
            <Pressable style={styles.backButton} onPress={handleBack} accessibilityLabel="Quay lại">
              <ChevronLeftIcon size={20} color={nihongoTheme.colors.textPrimary} />
            </Pressable>
            <View style={styles.titleCol}>
              <Text style={[styles.pageTitle, isPhone && styles.pageTitlePhone]}>{title}</Text>
              {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
            </View>
          </View>
          {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandTextPhone: {
    fontSize: 19,
  },
  brandDark: {
    color: nihongoTheme.colors.textPrimary,
  },
  brandOrange: {
    color: nihongoTheme.colors.accent,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  ksPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    ...nihongoTheme.shadow.card,
  },
  ksPillText: {
    color: nihongoTheme.colors.accentHover,
    fontSize: 12,
    fontWeight: '800',
  },
  pill: {
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...nihongoTheme.shadow.card,
  },
  pillAccentText: {
    color: nihongoTheme.colors.accentHover,
    fontSize: 13,
    fontWeight: '700',
  },
  pillText: {
    color: nihongoTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  subHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    alignItems: 'center',
    justifyContent: 'center',
    ...nihongoTheme.shadow.card,
  },
  backIcon: {
    fontSize: 22,
    lineHeight: 24,
    color: nihongoTheme.colors.textPrimary,
    marginTop: -2,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    marginTop: 2,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wrapperPhone: {
    marginBottom: 14,
    gap: 10,
  },
  subHeaderRowPhone: {
    flexWrap: 'wrap',
    gap: 8,
  },
  titleCol: {
    flexShrink: 1,
  },
  pageTitlePhone: {
    fontSize: 19,
  },
});
