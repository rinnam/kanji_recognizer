import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { AntiAfkPromptModal } from '../src/components/AntiAfkPromptModal';
import { FloatingBottomDock } from '../src/components/FloatingBottomDock';
import { FloatingUtilityDock } from '../src/components/FloatingUtilityDock';
import { readAuthSession } from '../src/features/auth/auth-store';
import { DEFAULT_PROFILE, readLearningProfile } from '../src/features/profile/profile-store';
import {
  markStudyInteraction,
  useGlobalStudyTimer,
} from '../src/features/study-tracker/use-study-tracker';

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
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
    let active = true;
    void readLearningProfile().then((p) => {
      if (active) setDailyMinutes(p.dailyMinutes);
    });
    void readAuthSession().then((session) => {
      if (!active) return;
      setHasSession(Boolean(session));
      if (!session && !isAuthPage) {
        router.replace('/login');
      }
      setChecked(true);
    });
    return () => {
      active = false;
    };
  }, [pathname, isAuthPage, router]);

  useGlobalStudyTimer({
    enabled: checked && hasSession && !isAuthPage && !isOnboardingPage,
    pathname,
    goalSeconds: Math.max(1, dailyMinutes) * 60,
  });

  return (
    <View style={styles.root} onTouchStart={markStudyInteraction}>
      <View style={styles.contentArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      {checked && !isAuthPage ? <FloatingBottomDock /> : null}
      {!isAuthPage ? <FloatingUtilityDock /> : null}
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
});
