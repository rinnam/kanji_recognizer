import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { AntiAfkPromptModal } from '../src/components/AntiAfkPromptModal';
import { FloatingBottomDock } from '../src/components/FloatingBottomDock';
import { FloatingUtilityDock } from '../src/components/FloatingUtilityDock';
import {
  getCachedAdminSession,
  getCachedAuthSession,
  readAdminSession,
  readAuthSession,
  refreshAdminAuthMe,
  refreshAuthMe,
  subscribeAdminSession,
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
  const [learnerSession, setLearnerSession] = useState<AuthSession | null>(
    () => getCachedAuthSession(),
  );
  const [adminSession, setAdminSession] = useState<AuthSession | null>(
    () => getCachedAdminSession(),
  );
  const [dailyMinutes, setDailyMinutes] = useState(DEFAULT_PROFILE.dailyMinutes);

  const isLearnerAuthPage = pathname === '/login' || pathname === '/register';
  const isOnboardingPage = pathname === '/onboarding';
  const isAdminLoginPage = pathname === '/admin/login';
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  const needsAdminRedirect =
    checked &&
    isAdminRoute &&
    ((!adminSession && !isAdminLoginPage) || (Boolean(adminSession) && isAdminLoginPage));
  const needsLearnerRedirect = checked && !isAdminRoute && !learnerSession && !isLearnerAuthPage;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = isAdminRoute ? 'Kanji Smart · Quản trị' : 'Kanji Smart';
    }
  }, [isAdminRoute]);

  useEffect(() => {
    const unsubLearner = subscribeAuthSession((s) => setLearnerSession(s));
    const unsubAdmin = subscribeAdminSession((s) => setAdminSession(s));
    return () => {
      unsubLearner();
      unsubAdmin();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [localLearner, localAdmin] = await Promise.all([
        readAuthSession(),
        readAdminSession(),
      ]);
      if (!active) return;
      setLearnerSession(localLearner);
      setAdminSession(localAdmin);
      const [freshLearner, freshAdmin] = await Promise.all([
        localLearner ? refreshAuthMe() : Promise.resolve(null),
        localAdmin ? refreshAdminAuthMe() : Promise.resolve(null),
      ]);
      if (!active) return;
      setLearnerSession(freshLearner);
      setAdminSession(freshAdmin);
      setChecked(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (isAdminRoute) {
      void readAdminSession().then((s) => {
        if (active) setAdminSession(s);
      });
    } else {
      void readAuthSession().then((s) => {
        if (!active) return;
        setLearnerSession(s);
        if (s) {
          void readLearningProfile().then((p) => {
            if (active) setDailyMinutes(p.dailyMinutes);
          });
        }
      });
    }
    return () => {
      active = false;
    };
  }, [isAdminRoute, pathname]);

  useEffect(() => {
    if (!checked || !rootNavState?.key) return;
    if (isAdminRoute) {
      if (!adminSession && !isAdminLoginPage) {
        router.replace('/admin/login');
        return;
      }
      if (adminSession && isAdminLoginPage) {
        router.replace('/admin');
      }
      return;
    }
    if (!learnerSession && !isLearnerAuthPage) {
      router.replace('/login');
    }
  }, [
    adminSession,
    checked,
    isAdminLoginPage,
    isAdminRoute,
    isLearnerAuthPage,
    learnerSession,
    rootNavState?.key,
    router,
  ]);

  useGlobalStudyTimer({
    enabled:
      checked &&
      Boolean(learnerSession) &&
      !isLearnerAuthPage &&
      !isOnboardingPage &&
      !isAdminRoute,
    pathname,
    goalSeconds: Math.max(1, dailyMinutes) * 60,
  });

  const showLearnerChrome =
    checked && Boolean(learnerSession) && !isLearnerAuthPage && !isAdminRoute;

  return (
    <View style={styles.root} onTouchStart={markStudyInteraction}>
      <View style={styles.contentArea}>
        <Stack screenOptions={{ headerShown: false }} />
        {!checked || needsAdminRedirect || needsLearnerRedirect ? (
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
