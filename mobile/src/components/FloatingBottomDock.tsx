import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { nihongoTheme } from '../theme/nihongo-theme';
import { DESKTOP_BREAKPOINT } from './AppShell';

const TABS = [
  { key: 'app', label: 'Trang chủ', icon: '⌂', route: '/app' as const },
  { key: 'practice', label: 'Luyện tập', icon: '✦', route: '/practice' as const },
  { key: 'lookup', label: 'Tra cứu', icon: '⌕', route: '/lookup' as const },
  { key: 'lessons', label: 'Bài học', icon: '▤', route: '/lessons' as const },
  { key: 'profile', label: 'Cá nhân', icon: '◯', route: '/profile' as const },
];

export function FloatingBottomDock() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  if (width >= DESKTOP_BREAKPOINT) return null;
  if (pathname === '/onboarding' || pathname === '/profile/learning') return null;

  const isActive = (key: string) => {
    if (key === 'app') return pathname === '/' || pathname === '/app' || pathname === '/plan';
    if (key === 'practice') {
      return pathname.startsWith('/practice') || pathname.startsWith('/flashcards') || pathname.startsWith('/games');
    }
    return pathname === `/${key}` || pathname.startsWith(`/${key}/`);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outer,
        { bottom: Math.max(nihongoTheme.layout.dockBottomOffset, insets.bottom + 8) },
      ]}
    >
      <View style={styles.dock} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const active = isActive(tab.key);
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={active ? { selected: true } : {}}
              onPress={() => router.push(tab.route)}
              style={[styles.tabItem, active && styles.tabItemActive]}
            >
              <Text style={[styles.icon, active && styles.activeText]}>{tab.icon}</Text>
              <Text numberOfLines={1} style={[styles.label, active && styles.activeText]}>
                {tab.label}
              </Text>
              <View style={[styles.dot, active && styles.dotActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: nihongoTheme.layout.dockBottomOffset,
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 25,
  },
  dock: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 6,
    paddingVertical: 7,
    gap: 2,
    ...nihongoTheme.shadow.dock,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
  },
  tabItemActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  icon: {
    fontSize: 16,
    color: nihongoTheme.colors.textSecondary,
    marginBottom: 1,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
  },
  activeText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
});
