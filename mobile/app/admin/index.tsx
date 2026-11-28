import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AdminShell, type AdminTabKey } from '../../src/components/AdminShell';
import { AdminLessonsTab } from '../../src/features/admin/AdminLessonsTab';
import { AdminOverviewTab } from '../../src/features/admin/AdminOverviewTab';
import { AdminSubscriptionsTab } from '../../src/features/admin/AdminSubscriptionsTab';
import { AdminUsersTab } from '../../src/features/admin/AdminUsersTab';
import {
  getCachedAdminSession,
  refreshAdminAuthMe,
  saveAdminSession,
  type AuthUser,
} from '../../src/features/auth/auth-store';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

function parseAdminTab(raw?: string): AdminTabKey {
  if (raw === 'subscriptions') return 'subscriptions';
  if (raw === 'lessons') return 'lessons';
  if (raw === 'users') return 'users';
  return 'overview';
}

export default function AdminPortalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<AdminTabKey>(() => parseAdminTab(params.tab));
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [authorized, setAuthorized] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [adminUser, setAdminUser] = useState<AuthUser | null>(
    () => getCachedAdminSession()?.user ?? null,
  );

  useEffect(() => {
    if (
      params.tab === 'subscriptions' ||
      params.tab === 'lessons' ||
      params.tab === 'users' ||
      params.tab === 'overview'
    ) {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    let active = true;
    void refreshAdminAuthMe().then((session) => {
      if (!active) return;
      if (!session || session.user.role !== 'admin' || session.portal !== 'admin') {
        setAuthorized('denied');
        router.replace('/admin/login');
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
    await saveAdminSession(null);
    router.replace('/admin/login');
  };

  const handleSelectTab = (tab: AdminTabKey) => {
    if (tab !== 'subscriptions') {
      setSubscriptionSearch('');
    }
    setActiveTab(tab);
  };

  const handleInspectSubscription = (email: string) => {
    setSubscriptionSearch(email);
    setActiveTab('subscriptions');
  };

  return (
    <AdminShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
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
      ) : activeTab === 'subscriptions' ? (
        <AdminSubscriptionsTab initialQuery={subscriptionSearch} />
      ) : activeTab === 'lessons' ? (
        <AdminLessonsTab />
      ) : (
        <AdminUsersTab onInspectSubscription={handleInspectSubscription} />
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
