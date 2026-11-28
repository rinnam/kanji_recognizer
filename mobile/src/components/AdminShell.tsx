import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DESKTOP_BREAKPOINT } from './AppShell';
import {
  AdminDashboardIcon,
  CrownIcon,
  LessonsNavIcon,
  LogoutIcon,
  ProfileNavIcon,
  ResetIcon,
} from './AppIcons';

export type AdminTabKey = 'overview' | 'subscriptions' | 'lessons' | 'users';

interface AdminShellProps {
  activeTab: AdminTabKey;
  onSelectTab: (tab: AdminTabKey) => void;
  adminName: string;
  adminEmail: string;
  onRefresh?: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const ADMIN_NAV: readonly {
  key: AdminTabKey;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ size?: number; color?: string; active?: boolean }>;
}[] = [
  {
    key: 'overview',
    label: 'Doanh thu & Tổng quan',
    shortLabel: 'Doanh thu',
    Icon: AdminDashboardIcon,
  },
  {
    key: 'subscriptions',
    label: 'Quản lý gói',
    shortLabel: 'Quản lý gói',
    Icon: CrownIcon,
  },
  {
    key: 'lessons',
    label: 'Bài học & Tài liệu',
    shortLabel: 'Bài học',
    Icon: LessonsNavIcon,
  },
  {
    key: 'users',
    label: 'Người dùng',
    shortLabel: 'Người dùng',
    Icon: ProfileNavIcon,
  },
];

/** Layout riêng cho cổng Quản trị — tách biệt hoàn toàn với không gian học viên. */
export function AdminShell({
  activeTab,
  onSelectTab,
  adminName,
  adminEmail,
  onRefresh,
  onLogout,
  children,
}: AdminShellProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const activeMeta = ADMIN_NAV.find((item) => item.key === activeTab) ?? ADMIN_NAV[0];
  const initialChar = (adminName || adminEmail || 'A').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={[styles.shellRow, !isDesktop && styles.shellColumn]}>
        {isDesktop ? (
          <View style={styles.sidebar}>
            <View>
              <View style={styles.brandRow}>
                <View style={styles.brandBadge}>
                  <AdminDashboardIcon size={18} color="#FFFFFF" active />
                </View>
                <View style={styles.brandTextCol}>
                  <Text style={styles.brandTitle}>Kanji Smart</Text>
                  <View style={styles.adminPill}>
                    <Text style={styles.adminPillText}>QUẢN TRỊ</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionLabel}>DANH MỤC</Text>
              <View style={styles.navList}>
                {ADMIN_NAV.map((item) => {
                  const active = item.key === activeTab;
                  const IconComp = item.Icon;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      style={[styles.navItem, active && styles.navItemActive]}
                      onPress={() => onSelectTab(item.key)}
                    >
                      <IconComp
                        size={17}
                        color={active ? '#F48A34' : '#A1A1AA'}
                        active={active}
                      />
                      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sidebarFooter}>
              <View style={styles.adminCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialChar}</Text>
                </View>
                <View style={styles.adminMeta}>
                  <Text style={styles.adminName} numberOfLines={1}>
                    {adminName || 'Quản trị viên'}
                  </Text>
                  <Text style={styles.adminEmail} numberOfLines={1}>
                    {adminEmail}
                  </Text>
                </View>
              </View>

              <Pressable accessibilityRole="button" style={styles.logoutBtn} onPress={onLogout}>
                <LogoutIcon size={15} color="#FCA5A5" />
                <Text style={styles.logoutBtnText}>Đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.mobileChrome}>
            <View style={styles.mobileHeader}>
              <View style={styles.mobileBrand}>
                <View style={styles.brandBadgeSmall}>
                  <AdminDashboardIcon size={15} color="#FFFFFF" active />
                </View>
                <View style={styles.mobileBrandMeta}>
                  <Text style={styles.mobileBrandTitle}>Kanji Smart · Quản trị</Text>
                  <Text style={styles.mobileBrandEmail} numberOfLines={1}>
                    {adminEmail}
                  </Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" style={styles.mobileLogoutBtn} onPress={onLogout}>
                <LogoutIcon size={14} color="#FCA5A5" />
                <Text style={styles.mobileLogoutText}>Đăng xuất</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.mobileTabsBar}
              contentContainerStyle={styles.mobileTabsRow}
            >
              {ADMIN_NAV.map((item) => {
                const active = item.key === activeTab;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    style={[styles.mobileTabChip, active && styles.mobileTabChipActive]}
                    onPress={() => onSelectTab(item.key)}
                  >
                    <Text style={[styles.mobileTabText, active && styles.mobileTabTextActive]}>
                      {item.shortLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.mainContent,
            isDesktop ? styles.mainContentDesktop : styles.mainContentMobile,
            !isDesktop && { paddingBottom: Math.max(28, insets.bottom + 16) },
          ]}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={Platform.OS !== 'web'}
        >
          <View style={styles.container}>
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>{activeMeta.label}</Text>
              {onRefresh ? (
                <Pressable accessibilityRole="button" style={styles.refreshBtn} onPress={onRefresh}>
                  <ResetIcon size={14} color="#3F3F46" />
                  <Text style={styles.refreshBtnText}>Làm mới</Text>
                </Pressable>
              ) : null}
            </View>
            {children}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  shellRow: {
    flex: 1,
    flexDirection: 'row',
  },
  shellColumn: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 248,
    backgroundColor: '#18181B',
    borderRightWidth: 1,
    borderRightColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    marginBottom: 24,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F48A34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextCol: {
    gap: 3,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: -0.2,
  },
  adminPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(244, 138, 52, 0.18)',
    borderRadius: 9999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  adminPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#FDBA74',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#71717A',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  navList: {
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: 'rgba(244, 138, 52, 0.16)',
    borderColor: 'rgba(244, 138, 52, 0.35)',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    paddingTop: 14,
    gap: 10,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  adminMeta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  adminName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  adminEmail: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  mobileChrome: {
    backgroundColor: '#FFFFFF',
  },
  mobileHeader: {
    backgroundColor: '#18181B',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mobileBrand: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadgeSmall: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F48A34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBrandMeta: {
    flex: 1,
    minWidth: 0,
  },
  mobileBrandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  mobileBrandEmail: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  mobileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mobileLogoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  mobileTabsBar: {
    flexGrow: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  mobileTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mobileTabChip: {
    backgroundColor: '#F4F4F5',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  mobileTabChipActive: {
    backgroundColor: '#F48A34',
  },
  mobileTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#52525B',
  },
  mobileTabTextActive: {
    color: '#FFFFFF',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  mainContent: {
    paddingTop: 22,
  },
  mainContentDesktop: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  mainContentMobile: {
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  container: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#18181B',
    letterSpacing: -0.3,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  refreshBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#18181B',
  },
});
