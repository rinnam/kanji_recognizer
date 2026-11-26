import React from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { nihongoTheme } from '../theme/nihongo-theme';
import { DESKTOP_BREAKPOINT } from './AppShell';
import {
  HomeNavIcon,
  LessonsNavIcon,
  PracticeNavIcon,
  ProfileNavIcon,
  SearchNavIcon,
} from './AppIcons';

const TABS = [
  { key: 'app', label: 'Trang chủ', Icon: HomeNavIcon, route: '/app' as const },
  { key: 'practice', label: 'Luyện tập', Icon: PracticeNavIcon, route: '/practice' as const },
  { key: 'lookup', label: 'Tra cứu', Icon: SearchNavIcon, route: '/lookup' as const },
  { key: 'lessons', label: 'Bài học', Icon: LessonsNavIcon, route: '/lessons' as const },
  { key: 'profile', label: 'Cá nhân', Icon: ProfileNavIcon, route: '/profile' as const },
];

export function FloatingBottomDock() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  if (width >= DESKTOP_BREAKPOINT) return null;
  if (
    pathname === '/onboarding' ||
    pathname === '/profile/learning' ||
    pathname === '/practice/speaking/room' ||
    pathname.startsWith('/games/')
  ) {
    return null;
  }

  const isActive = (key: string) => {
    if (key === 'app') return pathname === '/' || pathname === '/app' || pathname === '/plan';
    if (key === 'practice') {
      return pathname.startsWith('/practice') || pathname.startsWith('/flashcards') || pathname.startsWith('/games');
    }
    return pathname === `/${key}` || pathname.startsWith(`/${key}/`);
  };

  return (
    <View
      style={[
        styles.barWrapper,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.barInner} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const active = isActive(tab.key);
          const color = active ? nihongoTheme.colors.accentHover : nihongoTheme.colors.textSecondary;
          const IconComp = tab.Icon;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={active ? { selected: true } : {}}
              onPress={() => {
                if (pathname !== tab.route) {
                  router.replace(tab.route);
                }
              }}
              style={styles.tabItem}
            >
              <View style={[styles.iconPill, active && styles.iconPillActive]}>
                <IconComp size={20} color={color} active={active} />
              </View>
              <Text numberOfLines={1} style={[styles.label, active && styles.activeText]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const topBarShadow = Platform.select<ViewStyle>({
  web: { boxShadow: '0 -4px 16px rgba(30, 30, 30, 0.06)' } as ViewStyle,
  default: {
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 12,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  barWrapper: {
    width: '100%',
    backgroundColor: nihongoTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderWarm,
    paddingTop: 6,
    paddingHorizontal: 6,
    ...topBarShadow,
  },
  barInner: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 3,
  },
  iconPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: nihongoTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
  },
  activeText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
  },
});
