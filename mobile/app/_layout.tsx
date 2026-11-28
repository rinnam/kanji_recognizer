import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { AntiAfkPromptModal } from '../src/components/AntiAfkPromptModal';
import { FloatingBottomDock } from '../src/components/FloatingBottomDock';
import { FloatingUtilityDock } from '../src/components/FloatingUtilityDock';
import {
  getCachedAuthSession,
  readAuthSession,
  refreshAuthMe,
  subscribeAuthSession,
  type AuthSession,
} from '../src/features/auth/auth-store';
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
  const [session, setSession] = useState<AuthSession | null>(() => getCachedAuthSession());
  const [dailyMinutes, setDailyMinutes] = useState(DEFAULT_PROFILE.dailyMinutes);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isOnboardingPage = pathname === '/onboarding';
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const hasSession = Boolean(session);
  const isAdminUser = session?.user.role === 'admin';
  const isRoleMismatch =
    hasSession && !isAuthPage && ((isAdminUser && !isAdminRoute) || (!isAdminUser && isAdminRoute));

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = isAdminRoute ? 'Kanji Smart · Quản trị' : 'Kanji Smart';
    }
  }, [isAdminRoute]);

  useEffect(() => {
    const unsub = subscribeAuthSession((s) => {
      setSession(s);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const local = await readAuthSession();
      if (!active) return;
      if (local) {
        setSession(local);
        const fresh = await refreshAuthMe();
        if (!active) return;
        setSession(fresh);
      } else {
        setSession(null);
      }
      setChecked(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void readAuthSession().then((current) => {
      if (!active) return;
      setSession(current);
      if (!current || current.user.role !== 'admin') {
        void readLearningProfile().then((p) => {
          if (active) setDailyMinutes(p.dailyMinutes);
        });
      }
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!checked || !rootNavState?.key) return;
    if (!hasSession && !isAuthPage) {
      router.replace('/login');
      return;
    }
    if (hasSession && isAdminUser && !isAdminRoute && !isAuthPage) {
      router.replace('/admin');
      return;
    }
    if (hasSession && !isAdminUser && isAdminRoute) {
      router.replace('/app');
    }
  }, [checked, hasSession, isAdminUser, isAdminRoute, isAuthPage, rootNavState?.key, router]);

  useGlobalStudyTimer({
    enabled: checked && hasSession && !isAuthPage && !isOnboardingPage && !isAdminUser && !isAdminRoute,
    pathname,
    goalSeconds: Math.max(1, dailyMinutes) * 60,
  });

  const showLearnerChrome = checked && hasSession && !isAuthPage && !isAdminUser && !isAdminRoute;

  return (
    <View style={styles.root} onTouchStart={markStudyInteraction}>
      <View style={styles.contentArea}>
        <Stack screenOptions={{ headerShown: false }} />
        {!checked || (!hasSession && !isAuthPage) || isRoleMismatch ? (
          <View style={styles.authGateOverlay} />
        ) : null}
      </View>
      {showLearnerChrome ? <FloatingBottomDock /> : null}
      {showLearnerChrome ? <FloatingUtilityDock /> : null}
      {showLearnerChrome ? <AntiAfkPromptModal /> : null}
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
