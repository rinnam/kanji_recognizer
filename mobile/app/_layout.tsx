import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { FloatingBottomDock } from '../src/components/FloatingBottomDock';
import { FloatingUtilityDock } from '../src/components/FloatingUtilityDock';
import { readAuthSession } from '../src/features/auth/auth-store';

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    let active = true;
    void readAuthSession().then((session) => {
      if (!active) return;
      if (!session && !isAuthPage) {
        router.replace('/login');
      }
      setChecked(true);
    });
    return () => {
      active = false;
    };
  }, [pathname, isAuthPage, router]);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      {checked && !isAuthPage ? <FloatingBottomDock /> : null}
      {!isAuthPage ? <FloatingUtilityDock /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
