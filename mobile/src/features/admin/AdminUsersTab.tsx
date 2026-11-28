import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AdminConfirmBanner } from './AdminConfirmModal';
import { adminTheme, formatDateVn, formatVnd } from './admin-theme';
import {
  adminAdjustUserPointsApi,
  fetchAdminUsers,
  updateAdminUserBan,
  updateAdminUserRole,
  type AdminUserRow,
} from './admin-api';

function formatUserPlanSummary(u: AdminUserRow): string {
  const effectiveTier = u.rawTier ?? u.tier;
  if (effectiveTier === 'free') {
    return `Miễn phí · Tạo TK ${formatDateVn(u.createdAt)}`;
  }
  const tierName = effectiveTier === 'pro' ? 'Pro AI' : 'Plus';
  const priceText =
    u.listPriceVnd && u.listPriceVnd > 0
      ? `${formatVnd(u.listPriceVnd)}/${u.billingCycle === 'yearly' ? 'năm' : 'tháng'}`
      : u.billingCycle === 'yearly'
        ? 'Chu kỳ năm'
        : 'Chu kỳ tháng';
  const regText = u.startedAt ? `ĐK ${formatDateVn(u.startedAt)}` : null;
  const expText = u.isLifetime
    ? 'Không giới hạn'
    : u.expiresAt
      ? u.subscriptionStatus === 'expired'
        ? `Hết hạn ${formatDateVn(u.expiresAt)}`
        : `Hạn ${formatDateVn(u.expiresAt)} (còn ${Math.max(0, u.daysRemaining ?? 0)} ngày)`
      : null;
  return [tierName, priceText, regText, expText].filter(Boolean).join(' · ');
}

function hasLearnerActivity(u: AdminUserRow): boolean {
  return (
    u.role === 'user' ||
    (u.rawTier !== undefined && u.rawTier !== 'free') ||
    u.tier !== 'free' ||
    u.ksBalance > 0 ||
    u.vocabCount > 0 ||
    u.studyDays > 0
  );
}

interface AdminUsersTabProps {
  refreshSignal?: number;
  onInspectSubscription?: (email: string) => void;
}

export function AdminUsersTab({ refreshSignal = 0, onInspectSubscription }: AdminUsersTabProps) {
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'plus' | 'pro'>('all');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Selected user modal state
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'role'; nextRole: 'user' | 'admin' }
    | { type: 'ban'; nextBan: boolean }
    | null
  >(null);
  const [ksDeltaInput, setKsDeltaInput] = useState('100');
  const [ksReason, setKsReason] = useState('Thưởng học tập');
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAdminUsers({ q, role: roleFilter, tier: tierFilter });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, tierFilter]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers, refreshSignal]);

  const openManageModal = (u: AdminUserRow) => {
    setSelectedUser(u);
    setPendingAction(null);
    setKsDeltaInput('100');
    setKsReason('Thưởng học tập');
    setErrorMsg(null);
  };

  const handleConfirmPendingAction = async () => {
    if (!selectedUser || !pendingAction || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      if (pendingAction.type === 'role') {
        await updateAdminUserRole(selectedUser.id, pendingAction.nextRole);
        setSelectedUser({ ...selectedUser, role: pendingAction.nextRole });
        setNoticeMsg(`Đã đổi quyền ${selectedUser.email} → ${pendingAction.nextRole}.`);
      } else {
        await updateAdminUserBan(selectedUser.id, pendingAction.nextBan);
        setSelectedUser({ ...selectedUser, isBanned: pendingAction.nextBan });
        setNoticeMsg(
          `${pendingAction.nextBan ? 'Đã khóa' : 'Đã mở khóa'} tài khoản ${selectedUser.email}.`,
        );
      }
      setPendingAction(null);
      await loadUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustPoints = async (sign: 1 | -1) => {
    if (!selectedUser || busy) return;
    const rawAbs = Math.abs(Number(ksDeltaInput.replace(/[^0-9]/g, '')) || 0);
    if (rawAbs <= 0) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await adminAdjustUserPointsApi(
        selectedUser.id,
        sign * rawAbs,
        ksReason.trim() || 'Admin điều chỉnh số dư Xu KS',
      );
      setSelectedUser({ ...selectedUser, ksBalance: res.balanceAfter });
      setNoticeMsg(
        `Đã ${sign > 0 ? 'cộng' : 'trừ'} ${rawAbs} Xu KS cho ${selectedUser.email} (số dư mới: ${res.balanceAfter.toLocaleString('vi-VN')} KS).`,
      );
      await loadUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không điều chỉnh được Xu KS.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}
      {noticeMsg ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{noticeMsg}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quản lý người dùng ({total})</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Tìm theo tên hoặc email..."
          placeholderTextColor={adminTheme.colors.textMuted}
          style={styles.searchInput}
        />

        <View style={styles.filterRows}>
          <View style={styles.filterGroup}>
            {(
              [
                ['all', 'Tất cả vai trò'],
                ['admin', 'Admin'],
                ['user', 'Học viên'],
              ] as const
            ).map(([k, lbl]) => (
              <Pressable
                key={k}
                style={[styles.chip, roleFilter === k && styles.chipActive]}
                onPress={() => setRoleFilter(k)}
              >
                <Text style={[styles.chipText, roleFilter === k && styles.chipTextActive]}>{lbl}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.filterGroup}>
            {(
              [
                ['all', 'Tất cả gói'],
                ['free', 'Free'],
                ['plus', 'Plus'],
                ['pro', 'Pro AI'],
              ] as const
            ).map(([t, lbl]) => (
              <Pressable
                key={t}
                style={[styles.chip, tierFilter === t && styles.chipActive]}
                onPress={() => setTierFilter(t)}
              >
                <Text style={[styles.chipText, tierFilter === t && styles.chipTextActive]}>{lbl}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading && users.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={adminTheme.colors.accent} />
          </View>
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>Không tìm thấy tài khoản phù hợp.</Text>
        ) : (
          <View style={styles.listGap}>
            {users.map((u) => {
              const showLearnerMeta = hasLearnerActivity(u);
              return (
                <View key={u.id} style={styles.userRow}>
                  <View style={styles.userMain}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.userName}>{u.displayName}</Text>
                      <View
                        style={[
                          styles.pill,
                          u.role === 'admin' ? styles.pillAdmin : styles.pillNeutral,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            u.role === 'admin' ? styles.pillAdminText : styles.pillNeutralText,
                          ]}
                        >
                          {u.role === 'admin' ? 'Admin' : 'Học viên'}
                        </Text>
                      </View>
                      {showLearnerMeta ? (
                        <View
                          style={[
                            styles.pill,
                            u.tier === 'free' ? styles.pillNeutral : styles.pillPaid,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              u.tier === 'free' ? styles.pillNeutralText : styles.pillPaidText,
                            ]}
                          >
                            {u.tier.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                      {u.isBanned ? (
                        <View style={styles.pillBan}>
                          <Text style={styles.pillBanText}>Đã khóa</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    {showLearnerMeta ? (
                      <>
                        <Text style={styles.userSubLine}>{formatUserPlanSummary(u)}</Text>
                        <Text style={styles.userStats}>
                          {u.jlptLevel} · {u.ksBalance.toLocaleString('vi-VN')} KS · {u.studyDays} ngày học · {u.vocabCount} từ
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.userStats}>Tài khoản quản trị hệ thống</Text>
                    )}
                  </View>

                  <View style={styles.filterGroup}>
                    {onInspectSubscription && showLearnerMeta ? (
                      <Pressable
                        style={styles.outlineChip}
                        onPress={() => onInspectSubscription(u.email)}
                      >
                        <Text style={styles.outlineChipText}>Xem gói</Text>
                      </Pressable>
                    ) : null}
                    <Pressable style={styles.manageBtn} onPress={() => openManageModal(u)}>
                      <Text style={styles.manageBtnText}>Quản lý</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Manage User Modal */}
      <Modal
        visible={Boolean(selectedUser)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{selectedUser?.displayName}</Text>
                <Text style={styles.userEmail}>{selectedUser?.email}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setSelectedUser(null)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
              {/* Role & Ban with Inline Confirm */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>Phân quyền &amp; Trạng thái</Text>
                <View style={styles.filterGroup}>
                  {(['user', 'admin'] as const).map((r) => (
                    <Pressable
                      key={r}
                      disabled={busy || selectedUser?.role === r}
                      style={[styles.chip, selectedUser?.role === r && styles.chipActive]}
                      onPress={() => setPendingAction({ type: 'role', nextRole: r })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedUser?.role === r && styles.chipTextActive,
                        ]}
                      >
                        {r === 'admin' ? 'Quản trị viên' : 'Học viên'}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    disabled={busy}
                    style={[styles.chip, selectedUser?.isBanned ? styles.unbanBtn : styles.banBtn]}
                    onPress={() =>
                      selectedUser &&
                      setPendingAction({ type: 'ban', nextBan: !selectedUser.isBanned })
                    }
                  >
                    <Text style={selectedUser?.isBanned ? styles.unbanText : styles.banText}>
                      {selectedUser?.isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                    </Text>
                  </Pressable>
                </View>

                <AdminConfirmBanner
                  visible={Boolean(pendingAction)}
                  message={
                    pendingAction?.type === 'role'
                      ? `Chuyển quyền tài khoản ${selectedUser?.email ?? ''} thành ${
                          pendingAction.nextRole === 'admin' ? 'Quản trị viên' : 'Học viên'
                        }?`
                      : pendingAction?.nextBan
                        ? `Khóa tài khoản ${selectedUser?.email ?? ''}? Người dùng sẽ bị đăng xuất và không thể truy cập.`
                        : `Mở khóa tài khoản ${selectedUser?.email ?? ''}?`
                  }
                  confirmLabel={
                    pendingAction?.type === 'ban' && pendingAction.nextBan
                      ? 'Xác nhận khóa'
                      : 'Xác nhận'
                  }
                  tone={pendingAction?.type === 'ban' && pendingAction.nextBan ? 'danger' : 'primary'}
                  busy={busy}
                  onCancel={() => setPendingAction(null)}
                  onConfirm={() => void handleConfirmPendingAction()}
                />
              </View>

              {selectedUser && hasLearnerActivity(selectedUser) ? (
                <>
                  {/* Direct link to Subscriptions CRM */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionLabel}>Gói sử dụng hiện tại</Text>
                    <Text style={styles.mutedText}>{formatUserPlanSummary(selectedUser)}</Text>
                    {onInspectSubscription ? (
                      <Pressable
                        style={styles.primaryBtn}
                        onPress={() => {
                          const targetEmail = selectedUser.email;
                          setSelectedUser(null);
                          onInspectSubscription(targetEmail);
                        }}
                      >
                        <Text style={styles.primaryBtnText}>
                          Mở Quản lý gói &amp; Lịch sử thanh toán →
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Adjust KS Balance */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionLabel}>
                      Điều chỉnh Xu KS (Hiện có: {selectedUser.ksBalance.toLocaleString('vi-VN')} KS)
                    </Text>
                    <TextInput
                      value={ksDeltaInput}
                      onChangeText={(v) => setKsDeltaInput(v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      placeholder="Số Xu"
                      style={styles.modalInput}
                    />
                    <TextInput
                      value={ksReason}
                      onChangeText={setKsReason}
                      placeholder="Lý do điều chỉnh"
                      style={styles.modalInput}
                    />
                    <View style={styles.rowBetween}>
                      <Pressable
                        style={[styles.adjustBtn, styles.adjustPlus]}
                        disabled={busy}
                        onPress={() => void handleAdjustPoints(1)}
                      >
                        <Text style={styles.adjustPlusText}>+ Cộng Xu</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.adjustBtn, styles.adjustMinus]}
                        disabled={busy}
                        onPress={() => void handleAdjustPoints(-1)}
                      >
                        <Text style={styles.adjustMinusText}>− Trừ Xu</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Tài khoản quản trị hệ thống</Text>
                  <Text style={styles.mutedText}>
                    Tài khoản quản trị thuần không sử dụng gói học viên hoặc ví Xu KS.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  errorBanner: {
    backgroundColor: adminTheme.colors.dangerBg,
    borderWidth: 1,
    borderColor: adminTheme.colors.dangerBorder,
    borderRadius: adminTheme.radius.md,
    padding: 12,
  },
  errorText: { color: adminTheme.colors.dangerText, fontSize: 13, fontWeight: '600' },
  noticeBanner: {
    backgroundColor: adminTheme.colors.successBg,
    borderWidth: 1,
    borderColor: adminTheme.colors.successBorder,
    borderRadius: adminTheme.radius.md,
    padding: 12,
  },
  noticeText: { color: adminTheme.colors.successText, fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: adminTheme.colors.textPrimary },
  searchInput: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: adminTheme.colors.textPrimary,
  },
  filterRows: { gap: 8 },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: adminTheme.radius.pill,
    backgroundColor: adminTheme.colors.chipBg,
  },
  chipActive: { backgroundColor: adminTheme.colors.accent },
  chipText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  outlineChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: adminTheme.radius.input,
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.surface,
  },
  outlineChipText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: adminTheme.colors.textMuted, paddingVertical: 12 },
  listGap: { gap: 10 },
  userRow: {
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderRadius: adminTheme.radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  userMain: { flex: 1, minWidth: 220, gap: 3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  userName: { fontSize: 14, fontWeight: '800', color: adminTheme.colors.textPrimary },
  userEmail: { fontSize: 12, color: adminTheme.colors.textSecondary },
  userSubLine: { fontSize: 12, fontWeight: '600', color: adminTheme.colors.textPrimary },
  userStats: { fontSize: 11, color: adminTheme.colors.textMuted },
  pill: { borderRadius: adminTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillAdmin: { backgroundColor: adminTheme.colors.accentSoft },
  pillAdminText: { color: adminTheme.colors.accentHover },
  pillNeutral: { backgroundColor: adminTheme.colors.border },
  pillNeutralText: { color: adminTheme.colors.textSecondary },
  pillPaid: { backgroundColor: adminTheme.colors.successBg },
  pillPaidText: { color: adminTheme.colors.successText },
  pillBan: {
    backgroundColor: adminTheme.colors.dangerBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillBanText: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.dangerText },
  manageBtn: {
    borderWidth: 1,
    borderColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  manageBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.accentHover },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  closeBtn: {
    backgroundColor: adminTheme.colors.chipBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(24, 24, 27, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 16,
    gap: 10,
  },
  modalScroll: { flexShrink: 1 },
  modalBody: { gap: 10, paddingRight: 4, paddingBottom: 4 },
  sectionBox: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.md,
    padding: 12,
    gap: 8,
  },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: adminTheme.colors.textPrimary },
  mutedText: { fontSize: 12, color: adminTheme.colors.textSecondary },
  banBtn: { backgroundColor: adminTheme.colors.dangerBg },
  banText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.dangerText },
  unbanBtn: { backgroundColor: adminTheme.colors.successBg },
  unbanText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.successText },
  modalInput: {
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: adminTheme.colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.input,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  adjustBtn: { flex: 1, borderRadius: adminTheme.radius.input, paddingVertical: 10, alignItems: 'center' },
  adjustPlus: { backgroundColor: adminTheme.colors.successBg },
  adjustPlusText: { fontSize: 13, fontWeight: '700', color: adminTheme.colors.successText },
  adjustMinus: { backgroundColor: adminTheme.colors.dangerBg },
  adjustMinusText: { fontSize: 13, fontWeight: '700', color: adminTheme.colors.dangerText },
});
