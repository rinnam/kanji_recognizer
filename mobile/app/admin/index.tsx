import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AdminShell, type AdminTabKey } from '../../src/components/AdminShell';
import { AdminLessonsTab } from '../../src/features/admin/AdminLessonsTab';
import { AdminOverviewTab } from '../../src/features/admin/AdminOverviewTab';
import { AdminUsersTab } from '../../src/features/admin/AdminUsersTab';
import {
  getCachedAuthSession,
  refreshAuthMe,
  saveAuthSession,
  type AuthUser,
} from '../../src/features/auth/auth-store';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

export default function AdminPortalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: AdminTabKey =
    params.tab === 'lessons' ? 'lessons' : params.tab === 'users' ? 'users' : 'overview';

  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);
  const [authorized, setAuthorized] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [adminUser, setAdminUser] = useState<AuthUser | null>(
    () => getCachedAuthSession()?.user ?? null,
  );

  useEffect(() => {
    if (params.tab === 'lessons' || params.tab === 'users' || params.tab === 'overview') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    let active = true;
    void refreshAuthMe().then((session) => {
      if (!active) return;
      if (!session || session.user.role !== 'admin') {
        setAuthorized('denied');
        router.replace(session ? '/app' : '/login');
        return;
      }
      setAdminUser(session.user);
      setAuthorized('ok');
    });
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await saveAuthSession(null);
    router.replace('/login');
  };

  return (
    <AdminShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      adminName={adminUser?.displayName ?? 'Quản trị viên'}
      adminEmail={adminUser?.email ?? ''}
      onLogout={() => void handleLogout()}
    >
      {authorized !== 'ok' ? (
        <View style={styles.centerCard}>
          <ActivityIndicator color={nihongoTheme.colors.accent} />
          <Text style={styles.hintText}>Đang xác thực quyền quản trị...</Text>
        </View>
      ) : activeTab === 'overview' ? (
        <AdminOverviewTab />
      ) : activeTab === 'lessons' ? (
        <AdminLessonsTab />
      ) : (
        <AdminUsersTab />
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  centerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  hintText: {
    fontSize: 13,
    color: '#52525B',
  },
});
