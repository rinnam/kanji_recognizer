import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { nihongoTheme } from '../theme/nihongo-theme';
import { DESKTOP_BREAKPOINT } from './AppShell';

interface DockRoute {
  key: string;
  name: string;
}

interface FloatingBottomDockProps {
  state: {
    index: number;
    routes: DockRoute[];
  };
  navigateToTab?: (routeKey: string) => void;
  navigation?: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented?: boolean };
    navigate: (name: string) => void;
  };
}

const TAB_META: Record<string, { label: string; icon: string }> = {
  app: { label: 'Trang chủ', icon: '⌂' },
  practice: { label: 'Luyện tập', icon: '✦' },
  lookup: { label: 'Tra cứu', icon: '⌕' },
  lessons: { label: 'Bài học', icon: '▤' },
  profile: { label: 'Cá nhân', icon: '◯' },
};

export function FloatingBottomDock({ state, navigateToTab, navigation }: FloatingBottomDockProps) {
  const { width } = useWindowDimensions();
  if (width >= DESKTOP_BREAKPOINT) return null;

  return (
    <View pointerEvents="box-none" style={styles.outer}>
      <View style={styles.dock} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] ?? { label: route.name, icon: '•' };

          const onPress = () => {
            if (isFocused) return;
            if (navigateToTab) {
              navigateToTab(route.key);
              return;
            }
            if (navigation) {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
            >
              <Text style={[styles.icon, isFocused && styles.activeText]}>{meta.icon}</Text>
              <Text style={[styles.label, isFocused && styles.activeText]}>{meta.label}</Text>
              <View style={[styles.dot, isFocused && styles.dotActive]} />
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    minWidth: 64,
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
