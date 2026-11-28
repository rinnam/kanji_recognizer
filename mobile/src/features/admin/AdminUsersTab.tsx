import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import type { SubscriptionTier } from '../lessons/lessons-api';
import {
  adminAdjustUserPointsApi,
  adminSetUserSubscriptionApi,
  fetchAdminUsers,
  updateAdminUserBan,
  updateAdminUserRole,
  type AdminUserRow,
} from './admin-api';

export function AdminUsersTab() {
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
  const [subTier, setSubTier] = useState<SubscriptionTier>('free');
  const [subCycle, setSubCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subDaysInput, setSubDaysInput] = useState('30');
  const [recordOrder, setRecordOrder] = useState(false);
  const [orderAmountInput, setOrderAmountInput] = useState('79000');
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
  }, [loadUsers]);

  const openManageModal = (u: AdminUserRow) => {
    setSelectedUser(u);
    setSubTier(u.tier);
    setSubCycle(u.billingCycle);
    setSubDaysInput(u.billingCycle === 'yearly' ? '365' : '30');
    setRecordOrder(false);
    setOrderAmountInput(u.tier === 'pro' ? '149000' : '79000');
    setKsDeltaInput('100');
    setKsReason('Thưởng học tập');
    setErrorMsg(null);
  };

  const handleRoleToggle = async (nextRole: 'user' | 'admin') => {
    if (!selectedUser || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await updateAdminUserRole(selectedUser.id, nextRole);
      setSelectedUser({ ...selectedUser, role: nextRole });
      setNoticeMsg(`Đã đổi quyền ${selectedUser.email} → ${nextRole}.`);
      await loadUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không đổi được phân quyền.');
    } finally {
      setBusy(false);
    }
  };

  const handleBanToggle = async () => {
    if (!selectedUser || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const nextBan = !selectedUser.isBanned;
      await updateAdminUserBan(selectedUser.id, nextBan);
      setSelectedUser({ ...selectedUser, isBanned: nextBan });
      setNoticeMsg(`${nextBan ? 'Đã khóa' : 'Đã mở khóa'} tài khoản ${selectedUser.email}.`);
      await loadUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không cập nhật được trạng thái khóa.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!selectedUser || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const days = Number(subDaysInput.replace(/[^0-9]/g, '')) || 30;
      const amt = Number(orderAmountInput.replace(/[^0-9]/g, '')) || 0;
      await adminSetUserSubscriptionApi(selectedUser.id, {
        tier: subTier,
        billingCycle: subCycle,
        durationDays: days,
        recordOrder: subTier !== 'free' && recordOrder,
        amountVnd: amt,
        isDemo: false,
      });
      setSelectedUser({ ...selectedUser, tier: subTier, billingCycle: subCycle });
      setNoticeMsg(`Đã cập nhật gói ${subTier.toUpperCase()} cho ${selectedUser.email}.`);
      await loadUsers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không cập nhật được gói cước.');
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
        `Đã ${sign > 0 ? 'cộng' : 'trừ'} ${rawAbs} Xu KS cho ${selectedUser.email} (số dư mới: ${res.balanceAfter} KS).`,
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
          placeholderTextColor={nihongoTheme.colors.textMuted}
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
            <ActivityIndicator color={nihongoTheme.colors.accent} />
          </View>
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>Không tìm thấy tài khoản phù hợp.</Text>
        ) : (
          <View style={styles.listGap}>
            {users.map((u) => (
              <View key={u.id} style={styles.userRow}>
                <View style={styles.userMain}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.userName}>{u.displayName}</Text>
                    <View style={[styles.pill, u.role === 'admin' ? styles.pillAdmin : styles.pillNeutral]}>
                      <Text style={[styles.pillText, u.role === 'admin' ? styles.pillAdminText : styles.pillNeutralText]}>
                        {u.role === 'admin' ? 'Admin' : 'Học viên'}
                      </Text>
                    </View>
                    {u.role === 'user' ? (
                      <View style={[styles.pill, u.tier === 'free' ? styles.pillNeutral : styles.pillPaid]}>
                        <Text style={[styles.pillText, u.tier === 'free' ? styles.pillNeutralText : styles.pillPaidText]}>
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
                  <Text style={styles.userStats}>
                    {u.role === 'admin'
                      ? 'Tài khoản quản trị hệ thống'
                      : `${u.jlptLevel} · ${u.ksBalance.toLocaleString('vi-VN')} KS · ${u.studyDays} ngày học (${u.totalStudyMinutes}p) · ${u.vocabCount} từ${
                          u.expiresAt ? ` · Hạn ${new Date(u.expiresAt).toLocaleDateString('vi-VN')}` : ''
                        }`}
                  </Text>
                </View>

                <Pressable style={styles.manageBtn} onPress={() => openManageModal(u)}>
                  <Text style={styles.manageBtnText}>Quản lý</Text>
                </Pressable>
              </View>
            ))}
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
              <Pressable onPress={() => setSelectedUser(null)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
              {/* Role & Ban */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>Phân quyền &amp; Trạng thái</Text>
                <View style={styles.filterGroup}>
                  {(['user', 'admin'] as const).map((r) => (
                    <Pressable
                      key={r}
                      disabled={busy}
                      style={[styles.chip, selectedUser?.role === r && styles.chipActive]}
                      onPress={() => void handleRoleToggle(r)}
                    >
                      <Text style={[styles.chipText, selectedUser?.role === r && styles.chipTextActive]}>
                        {r === 'admin' ? 'Quản trị viên' : 'Học viên'}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    disabled={busy}
                    style={[styles.chip, selectedUser?.isBanned ? styles.unbanBtn : styles.banBtn]}
                    onPress={() => void handleBanToggle()}
                  >
                    <Text style={selectedUser?.isBanned ? styles.unbanText : styles.banText}>
                      {selectedUser?.isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {selectedUser?.role === 'admin' ? (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Phân tách gói &amp; ví học viên</Text>
                  <Text style={styles.mutedText}>
                    Tài khoản quản trị tách biệt khỏi gói học viên và ví Xu KS.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Subscription Tier */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionLabel}>Cấp / Đổi gói sử dụng</Text>
                    <View style={styles.filterGroup}>
                      {(['free', 'plus', 'pro'] as const).map((t) => (
                        <Pressable
                          key={t}
                          style={[styles.chip, subTier === t && styles.chipActive]}
                          onPress={() => {
                            setSubTier(t);
                            setOrderAmountInput(t === 'pro' ? '149000' : '79000');
                          }}
                        >
                          <Text style={[styles.chipText, subTier === t && styles.chipTextActive]}>
                            {t.toUpperCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {subTier !== 'free' ? (
                      <>
                        <View style={styles.filterGroup}>
                          <TextInput
                            value={subDaysInput}
                            onChangeText={(v) => setSubDaysInput(v.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            placeholder="Số ngày (vd: 30)"
                            style={[styles.modalInput, { flex: 1 }]}
                          />
                          {(['monthly', 'yearly'] as const).map((c) => (
                            <Pressable
                              key={c}
                              style={[styles.chip, subCycle === c && styles.chipActive]}
                              onPress={() => {
                                setSubCycle(c);
                                setSubDaysInput(c === 'yearly' ? '365' : '30');
                              }}
                            >
                              <Text style={[styles.chipText, subCycle === c && styles.chipTextActive]}>
                                {c === 'monthly' ? 'Tháng' : 'Năm'}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <View style={styles.rowBetween}>
                          <Text style={styles.mutedText}>Ghi nhận vào sổ doanh thu (đơn thật)</Text>
                          <Switch
                            value={recordOrder}
                            onValueChange={setRecordOrder}
                            trackColor={{ false: '#E5DDD4', true: nihongoTheme.colors.accent }}
                          />
                        </View>
                        {recordOrder ? (
                          <TextInput
                            value={orderAmountInput}
                            onChangeText={(v) => setOrderAmountInput(v.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            placeholder="Số tiền VNĐ"
                            style={styles.modalInput}
                          />
                        ) : null}
                      </>
                    ) : null}

                    <Pressable
                      style={styles.primaryBtn}
                      disabled={busy}
                      onPress={() => void handleSaveSubscription()}
                    >
                      <Text style={styles.primaryBtnText}>Lưu gói sử dụng</Text>
                    </Pressable>
                  </View>

                  {/* Adjust KS Balance */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionLabel}>
                      Điều chỉnh Xu KS (Hiện có: {selectedUser?.ksBalance.toLocaleString('vi-VN') ?? 0} KS)
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
                      placeholder="Lý do điều chỉnh..."
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
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  noticeBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
  },
  noticeText: { color: '#1B873F', fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  searchInput: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  filterRows: { gap: 8 },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  chipActive: { backgroundColor: nihongoTheme.colors.accent },
  chipText: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: nihongoTheme.colors.textMuted, paddingVertical: 12 },
  listGap: { gap: 10 },
  userRow: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderLight,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userMain: { flex: 1, minWidth: 0, gap: 3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  userName: { fontSize: 14, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  userEmail: { fontSize: 12, color: nihongoTheme.colors.textSecondary },
  userStats: { fontSize: 11, color: nihongoTheme.colors.textMuted },
  pill: { borderRadius: nihongoTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillAdmin: { backgroundColor: nihongoTheme.colors.accentSoft },
  pillAdminText: { color: nihongoTheme.colors.accentHover },
  pillNeutral: { backgroundColor: '#EFEAE4' },
  pillNeutralText: { color: nihongoTheme.colors.textSecondary },
  pillPaid: { backgroundColor: '#ECFDF5' },
  pillPaidText: { color: '#1B873F' },
  pillBan: { backgroundColor: '#FEF2F2', borderRadius: nihongoTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillBanText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  manageBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manageBtnText: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  closeText: { fontSize: 13, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.dock,
  },
  modalScroll: { maxHeight: 460 },
  modalBody: { gap: 12 },
  sectionBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderLight,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    gap: 8,
  },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  mutedText: { fontSize: 12, color: nihongoTheme.colors.textSecondary, flex: 1 },
  banBtn: { backgroundColor: '#FEF2F2' },
  banText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  unbanBtn: { backgroundColor: '#ECFDF5' },
  unbanText: { fontSize: 12, fontWeight: '700', color: '#1B873F' },
  modalInput: {
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  adjustBtn: { flex: 1, borderRadius: nihongoTheme.radius.button, paddingVertical: 10, alignItems: 'center' },
  adjustPlus: { backgroundColor: '#ECFDF5' },
  adjustPlusText: { fontSize: 13, fontWeight: '700', color: '#1B873F' },
  adjustMinus: { backgroundColor: '#FEF2F2' },
  adjustMinusText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
});
