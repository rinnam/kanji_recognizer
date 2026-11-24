import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
    <View pointerEvents="box-none" style={styles.outer}>
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
              <Text style={[styles.label, active && styles.activeText]}>{tab.label}</Text>
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
    paddingHorizontal: 14,
    zIndex: 25,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    ...nihongoTheme.shadow.dock,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    minWidth: 60,
  },
  tabItemActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  icon: {
    fontSize: 17,
    color: nihongoTheme.colors.textSecondary,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
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
