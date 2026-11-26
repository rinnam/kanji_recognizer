import React from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { nihongoTheme } from '../theme/nihongo-theme';
import { DesktopSidebar } from './DesktopSidebar';

interface AppShellProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

export const DESKTOP_BREAKPOINT = 960;

export function AppShell({ children, scroll = true, contentStyle }: AppShellProps) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isDesktop = width >= DESKTOP_BREAKPOINT && !isAuthPage;

  const webGradient =
    Platform.OS === 'web'
      ? ({
          backgroundImage: 'linear-gradient(160deg, #FFFDF9 0%, #FFF7EE 48%, #FCECE3 100%)',
          minHeight: '100vh',
        } as unknown as ViewStyle)
      : undefined;

  return (
    <SafeAreaView style={[styles.root, webGradient]} edges={['top', 'left', 'right']}>
      <View style={styles.shellRow}>
        {isDesktop ? <DesktopSidebar /> : null}

        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              isDesktop ? styles.scrollContentDesktop : styles.scrollContentMobile,
              contentStyle,
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>{children}</View>
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.container, contentStyle]}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.bgWarm,
  },
  shellRow: {
    flex: 1,
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
  },
  scrollContentMobile: {
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: nihongoTheme.layout.contentBottomPadding + 8,
  },
  scrollContentDesktop: {
    paddingHorizontal: 40,
    paddingBottom: 48,
  },
  container: {
    width: '100%',
    maxWidth: nihongoTheme.layout.maxWidth,
    alignSelf: 'center',
  },
});
