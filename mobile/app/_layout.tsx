import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { AntiAfkPromptModal } from '../src/components/AntiAfkPromptModal';
import { FloatingBottomDock } from '../src/components/FloatingBottomDock';
import { FloatingUtilityDock } from '../src/components/FloatingUtilityDock';
import { readAuthSession, subscribeAuthSession } from '../src/features/auth/auth-store';
import { DEFAULT_PROFILE, readLearningProfile } from '../src/features/profile/profile-store';
import {
  markStudyInteraction,
  useGlobalStudyTimer,
} from '../src/features/study-tracker/use-study-tracker';

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [dailyMinutes, setDailyMinutes] = useState(DEFAULT_PROFILE.dailyMinutes);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isOnboardingPage = pathname === '/onboarding';

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Kanji Smart';
    }
  }, [pathname]);

  useEffect(() => {
    const unsub = subscribeAuthSession((s) => {
      setHasSession(Boolean(s));
    });
    return unsub;
  }, []);

  useEffect(() => {
    let active = true;
    void readLearningProfile().then((p) => {
      if (active) setDailyMinutes(p.dailyMinutes);
    });
    void readAuthSession().then((session) => {
      if (!active) return;
      setHasSession(Boolean(session));
      setChecked(true);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (checked && rootNavState?.key && !hasSession && !isAuthPage) {
      router.replace('/login');
    }
  }, [checked, hasSession, isAuthPage, rootNavState?.key, router]);

  useGlobalStudyTimer({
    enabled: checked && hasSession && !isAuthPage && !isOnboardingPage,
    pathname,
    goalSeconds: Math.max(1, dailyMinutes) * 60,
  });

  const showAuthedChrome = checked && hasSession && !isAuthPage;

  return (
    <View style={styles.root} onTouchStart={markStudyInteraction}>
      <View style={styles.contentArea}>
        <Stack screenOptions={{ headerShown: false }} />
        {!checked || (!hasSession && !isAuthPage) ? <View style={styles.authGateOverlay} /> : null}
      </View>
      {showAuthedChrome ? <FloatingBottomDock /> : null}
      {showAuthedChrome ? <FloatingUtilityDock /> : null}
      <AntiAfkPromptModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  authGateOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 50,
  },
});
