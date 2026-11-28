import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useIsMobilePhone } from '../../utils/device';
import {
  createAdminManualOrder,
  fetchAdminOrders,
  fetchAdminOverview,
  updateAdminOrderStatus,
  type AdminOrderDto,
  type AdminOverviewResponse,
} from './admin-api';

const PLAN_PRICES: Record<'plus' | 'pro', Record<'monthly' | 'yearly', number>> = {
  plus: { monthly: 79000, yearly: 708000 },
  pro: { monthly: 149000, yearly: 1428000 },
};

const ORDER_STATUS_META: Record<
  AdminOrderDto['status'],
  { label: string; bg: string; text: string }
> = {
  paid: { label: 'Đã thu', bg: '#ECFDF5', text: '#1B873F' },
  pending: { label: 'Chờ duyệt', bg: '#FFF7ED', text: '#C25E00' },
  refunded: { label: 'Hoàn tiền', bg: '#FEF2F2', text: '#DC2626' },
};

const ACTION_LABELS: Record<string, string> = {
  order_create: 'Tạo đơn hàng',
  order_status_update: 'Cập nhật đơn hàng',
  user_role_update: 'Đổi phân quyền',
  user_ban: 'Khóa tài khoản',
  user_unban: 'Mở khóa tài khoản',
  user_subscription_set: 'Cập nhật gói cước',
  user_points_adjust: 'Điều chỉnh Xu KS',
  lesson_create: 'Tạo bài học',
  lesson_update: 'Cập nhật bài học',
  lesson_delete: 'Xóa bài học',
  lesson_items_bulk_add: 'Nhập từ vựng CSV',
  lesson_material_upload: 'Tải lên tài liệu',
  lesson_material_link: 'Gắn liên kết tài liệu',
  lesson_material_delete: 'Xóa tài liệu',
};

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

export function AdminOverviewTab() {
  const isPhone = useIsMobilePhone();
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const [kind, setKind] = useState<'all' | 'real' | 'demo'>('all');
  const [orderStatus, setOrderStatus] = useState<'all' | 'paid' | 'pending' | 'refunded'>('all');
  const [orderQuery, setOrderQuery] = useState('');

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [orders, setOrders] = useState<AdminOrderDto[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null);

  // Manual order modal state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [mEmail, setMEmail] = useState('');
  const [mTier, setMTier] = useState<'plus' | 'pro'>('plus');
  const [mCycle, setMCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [mAmountInput, setMAmountInput] = useState(String(PLAN_PRICES.plus.monthly));
  const [mIsDemo, setMIsDemo] = useState(false);
  const [mNote, setMNote] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [ov, ord] = await Promise.all([
        fetchAdminOverview(days, kind),
        fetchAdminOrders({ status: orderStatus, kind, q: orderQuery }),
      ]);
      setOverview(ov);
      setOrders(ord.orders);
      setTotalOrders(ord.total);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được dữ liệu thống kê.');
    } finally {
      setLoading(false);
    }
  }, [days, kind, orderStatus, orderQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const maxBarAmount = useMemo(() => {
    if (!overview) return 1;
    return Math.max(1, ...overview.revenueSeries.map((p) => p.amountVnd));
  }, [overview]);

  const selectedPoint = useMemo(() => {
    if (!overview || overview.revenueSeries.length === 0) return null;
    if (selectedBarKey) {
      const found = overview.revenueSeries.find((p) => p.dateKey === selectedBarKey);
      if (found) return found;
    }
    return [...overview.revenueSeries].reverse().find((p) => p.amountVnd > 0) ??
      overview.revenueSeries[overview.revenueSeries.length - 1] ??
      null;
  }, [overview, selectedBarKey]);

  const handleSelectPlanOption = (nextTier: 'plus' | 'pro', nextCycle: 'monthly' | 'yearly') => {
    setMTier(nextTier);
    setMCycle(nextCycle);
    setMAmountInput(String(PLAN_PRICES[nextTier][nextCycle]));
  };

  const handleCreateOrder = async () => {
    if (!mEmail.trim() || savingOrder) return;
    setSavingOrder(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const amount = Number(mAmountInput.replace(/[^0-9]/g, ''));
      const res = await createAdminManualOrder({
        email: mEmail.trim(),
        tier: mTier,
        billingCycle: mCycle,
        amountVnd: Number.isFinite(amount) ? amount : PLAN_PRICES[mTier][mCycle],
        status: 'paid',
        isDemo: mIsDemo,
        note: mNote.trim() || undefined,
      });
      setNoticeMsg(`Đã tạo đơn ${res.orderCode} và kích hoạt gói ${mTier.toUpperCase()}.`);
      setOrderModalOpen(false);
      setMEmail('');
      setMNote('');
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tạo được đơn hàng.');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleChangeOrderStatus = async (
    order: AdminOrderDto,
    nextStatus: 'paid' | 'refunded',
  ) => {
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      await updateAdminOrderStatus(order.id, nextStatus);
      setNoticeMsg(`Đã cập nhật đơn ${order.orderCode} → ${ORDER_STATUS_META[nextStatus].label}.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không cập nhật được đơn hàng.');
    }
  };

  const kpi = overview?.kpi;
  const totalUsers = kpi?.totalUsers ?? 0;

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

      {loading && !overview ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={nihongoTheme.colors.accent} />
          <Text style={styles.mutedText}>Đang tổng hợp số liệu quản trị...</Text>
        </View>
      ) : (
        <>
          {/* KPI Summary Row */}
          <View style={[styles.kpiGrid, isPhone && styles.kpiGridPhone]}>
            <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
              <Text style={styles.kpiLabel}>Người dùng</Text>
              <Text style={styles.kpiValue}>{kpi?.totalUsers ?? 0}</Text>
              <Text style={styles.kpiSub}>+{kpi?.newUsers30d ?? 0} trong 30 ngày</Text>
            </View>
            <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
              <Text style={styles.kpiLabel}>Học hôm nay</Text>
              <Text style={styles.kpiValue}>{kpi?.activeUsersToday ?? 0}</Text>
              <Text style={styles.kpiSub}>Có thời lượng học thực</Text>
            </View>
            <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
              <Text style={styles.kpiLabel}>Hội viên trả phí</Text>
              <Text style={styles.kpiValue}>{kpi?.paidUsersCount ?? 0}</Text>
              <Text style={styles.kpiSub}>
                Plus: {kpi?.tierCounts.plus ?? 0} · Pro: {kpi?.tierCounts.pro ?? 0}
              </Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardHighlight, isPhone && styles.kpiCardPhone]}>
              <Text style={styles.kpiLabel}>Doanh thu đơn thật</Text>
              <Text style={[styles.kpiValue, { color: nihongoTheme.colors.accentHover }]}>
                {formatVnd(kpi?.revenueRealVnd ?? 0)}
              </Text>
              <Text style={styles.kpiSub}>
                Demo: {formatVnd(kpi?.revenueDemoVnd ?? 0)} · {kpi?.paidOrderCount ?? 0} đơn
              </Text>
            </View>
          </View>

          {/* Tier & Content Breakdown Strip */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Cơ cấu gói &amp; Học liệu</Text>
              <Text style={styles.mutedText}>
                Tháng này: {formatVnd(kpi?.revenueThisMonthRealVnd ?? 0)} (thật) ·{' '}
                {formatVnd(kpi?.revenueThisMonthDemoVnd ?? 0)} (demo)
              </Text>
            </View>
            <View style={styles.ratioBar}>
              {(['free', 'plus', 'pro'] as const).map((t) => {
                const count = kpi?.tierCounts[t] ?? 0;
                const pct = totalUsers > 0 ? Math.max(count > 0 ? 4 : 0, (count / totalUsers) * 100) : 0;
                const color = t === 'pro' ? '#EA7A1E' : t === 'plus' ? '#F59E0B' : '#E7DED4';
                return pct > 0 ? (
                  <View key={t} style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
                ) : null;
              })}
            </View>
            <View style={styles.legendRow}>
              <Text style={styles.legendText}>Free: {kpi?.tierCounts.free ?? 0}</Text>
              <Text style={styles.legendText}>Plus: {kpi?.tierCounts.plus ?? 0}</Text>
              <Text style={styles.legendText}>Pro AI: {kpi?.tierCounts.pro ?? 0}</Text>
              <Text style={styles.legendText}>
                Bài học: {kpi?.publishedLessonCount ?? 0} công khai / {kpi?.draftLessonCount ?? 0} nháp ·{' '}
                {kpi?.materialCount ?? 0} tài liệu
              </Text>
            </View>
          </View>

          {/* Revenue Chart */}
          <View style={styles.card}>
            <View style={styles.rowBetweenWrap}>
              <Text style={styles.cardTitle}>Biểu đồ doanh thu</Text>
              <View style={styles.filterGroup}>
                {([7, 30, 90, 365] as const).map((d) => (
                  <Pressable
                    key={d}
                    style={[styles.chip, days === d && styles.chipActive]}
                    onPress={() => setDays(d)}
                  >
                    <Text style={[styles.chipText, days === d && styles.chipTextActive]}>
                      {d === 365 ? '12 tháng' : `${d} ngày`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.rowBetweenWrap}>
              <View style={styles.filterGroup}>
                {(
                  [
                    ['all', 'Tất cả đơn'],
                    ['real', 'Đơn thật'],
                    ['demo', 'Đơn demo'],
                  ] as const
                ).map(([k, lbl]) => (
                  <Pressable
                    key={k}
                    style={[styles.chip, kind === k && styles.chipActive]}
                    onPress={() => setKind(k)}
                  >
                    <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>{lbl}</Text>
                  </Pressable>
                ))}
              </View>

              {selectedPoint ? (
                <View style={styles.chartFocusPill}>
                  <Text style={styles.chartFocusText}>
                    {selectedPoint.label}: {formatVnd(selectedPoint.amountVnd)} ({selectedPoint.orderCount} đơn)
                  </Text>
                </View>
              ) : null}
            </View>

            <ScrollView
              horizontal={(overview?.revenueSeries.length ?? 0) > 14}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartRow}
            >
              {(overview?.revenueSeries ?? []).map((point) => {
                const ratio = point.amountVnd > 0 ? Math.max(0.08, point.amountVnd / maxBarAmount) : 0.03;
                const barHeight = Math.round(ratio * 116);
                const isSelected = selectedPoint?.dateKey === point.dateKey;
                return (
                  <Pressable
                    key={point.dateKey}
                    style={[
                      styles.chartCol,
                      (overview?.revenueSeries.length ?? 0) <= 14 && styles.chartColFlex,
                    ]}
                    onPress={() => setSelectedBarKey(point.dateKey)}
                  >
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: barHeight },
                          point.amountVnd === 0 && styles.barFillEmpty,
                          isSelected && styles.barFillSelected,
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isSelected && styles.barLabelSelected]} numberOfLines={1}>
                      {point.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Payment Orders List */}
          <View style={styles.card}>
            <View style={styles.rowBetweenWrap}>
              <Text style={styles.cardTitle}>Đơn hàng &amp; Doanh thu ({totalOrders})</Text>
              <Pressable style={styles.primaryBtnSmall} onPress={() => setOrderModalOpen(true)}>
                <Text style={styles.primaryBtnText}>+ Ghi nhận đơn thủ công</Text>
              </Pressable>
            </View>

            <View style={styles.rowBetweenWrap}>
              <TextInput
                value={orderQuery}
                onChangeText={setOrderQuery}
                placeholder="Tìm mã đơn hoặc email..."
                placeholderTextColor={nihongoTheme.colors.textMuted}
                style={styles.searchInput}
              />
              <View style={styles.filterGroup}>
                {(
                  [
                    ['all', 'Tất cả'],
                    ['paid', 'Đã thu'],
                    ['pending', 'Chờ duyệt'],
                    ['refunded', 'Hoàn tiền'],
                  ] as const
                ).map(([st, lbl]) => (
                  <Pressable
                    key={st}
                    style={[styles.chip, orderStatus === st && styles.chipActive]}
                    onPress={() => setOrderStatus(st)}
                  >
                    <Text style={[styles.chipText, orderStatus === st && styles.chipTextActive]}>
                      {lbl}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {orders.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có đơn hàng nào khớp bộ lọc.</Text>
            ) : (
              <View style={styles.listGap}>
                {orders.map((ord) => {
                  const st = ORDER_STATUS_META[ord.status];
                  return (
                    <View key={ord.id} style={styles.orderRow}>
                      <View style={styles.orderInfo}>
                        <View style={styles.badgeRow}>
                          <Text style={styles.orderCode}>{ord.orderCode}</Text>
                          <View style={[styles.pill, { backgroundColor: st.bg }]}>
                            <Text style={[styles.pillText, { color: st.text }]}>{st.label}</Text>
                          </View>
                          <View style={[styles.pill, ord.isDemo ? styles.pillMuted : styles.pillReal]}>
                            <Text style={[styles.pillText, ord.isDemo ? styles.pillMutedText : styles.pillRealText]}>
                              {ord.isDemo ? 'Demo' : 'Đơn thật'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.orderCustomer}>
                          {ord.userName} ({ord.userEmail}) · Gói {ord.tier.toUpperCase()} ({ord.billingCycle === 'yearly' ? 'Năm' : 'Tháng'})
                        </Text>
                        <Text style={styles.orderMeta}>
                          {new Date(ord.createdAt).toLocaleString('vi-VN')}
                          {ord.note ? ` · ${ord.note}` : ''}
                        </Text>
                      </View>
                      <View style={styles.orderRight}>
                        <Text style={styles.orderAmount}>{formatVnd(ord.amountVnd)}</Text>
                        <View style={styles.actionLinks}>
                          {ord.status === 'pending' ? (
                            <Pressable
                              style={styles.miniBtn}
                              onPress={() => void handleChangeOrderStatus(ord, 'paid')}
                            >
                              <Text style={styles.miniBtnText}>Xác nhận thu</Text>
                            </Pressable>
                          ) : null}
                          {ord.status === 'paid' ? (
                            <Pressable
                              style={styles.miniDangerBtn}
                              onPress={() => void handleChangeOrderStatus(ord, 'refunded')}
                            >
                              <Text style={styles.miniDangerText}>Hoàn tiền</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Recent Admin Audit Log */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nhật ký quản trị gần đây</Text>
            {(overview?.recentAuditLogs.length ?? 0) === 0 ? (
              <Text style={styles.emptyText}>Chưa có thao tác quản trị nào.</Text>
            ) : (
              <View style={styles.listGap}>
                {overview?.recentAuditLogs.map((log) => (
                  <View key={log.id} style={styles.auditRow}>
                    <View style={styles.auditTop}>
                      <Text style={styles.auditAction}>{ACTION_LABELS[log.action] ?? log.action}</Text>
                      <Text style={styles.auditTime}>{new Date(log.createdAt).toLocaleString('vi-VN')}</Text>
                    </View>
                    <Text style={styles.auditDetail}>{log.detail}</Text>
                    <Text style={styles.auditActor}>Bởi: {log.adminName}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      {/* Manual Order Modal */}
      <Modal
        visible={orderModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOrderModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Ghi nhận đơn nâng cấp gói</Text>
              <Pressable onPress={() => setOrderModalOpen(false)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Email tài khoản học viên</Text>
            <TextInput
              value={mEmail}
              onChangeText={setMEmail}
              placeholder="vd: student@gmail.com"
              placeholderTextColor={nihongoTheme.colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Gói nâng cấp</Text>
            <View style={styles.filterGroup}>
              {(['plus', 'pro'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, mTier === t && styles.chipActive]}
                  onPress={() => handleSelectPlanOption(t, mCycle)}
                >
                  <Text style={[styles.chipText, mTier === t && styles.chipTextActive]}>
                    {t === 'plus' ? 'Plus' : 'Pro AI'}
                  </Text>
                </Pressable>
              ))}
              {(['monthly', 'yearly'] as const).map((c) => (
                <Pressable
                  key={c}
                  style={[styles.chip, mCycle === c && styles.chipActive]}
                  onPress={() => handleSelectPlanOption(mTier, c)}
                >
                  <Text style={[styles.chipText, mCycle === c && styles.chipTextActive]}>
                    {c === 'monthly' ? '1 tháng' : '12 tháng'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Số tiền thực thu (VNĐ)</Text>
            <TextInput
              value={mAmountInput}
              onChangeText={(val) => setMAmountInput(val.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <View style={styles.rowBetween}>
              <Text style={styles.inputLabel}>Đánh dấu là đơn Demo (không tính doanh thu thật)</Text>
              <Switch
                value={mIsDemo}
                onValueChange={setMIsDemo}
                trackColor={{ false: '#E5DDD4', true: nihongoTheme.colors.accent }}
              />
            </View>

            <Text style={styles.inputLabel}>Ghi chú</Text>
            <TextInput
              value={mNote}
              onChangeText={setMNote}
              placeholder="Chuyển khoản ngân hàng, ưu đãi..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.modalInput}
            />

            <Pressable
              style={[styles.primaryBtn, (!mEmail.trim() || savingOrder) && styles.disabledBtn]}
              disabled={!mEmail.trim() || savingOrder}
              onPress={() => void handleCreateOrder()}
            >
              <Text style={styles.primaryBtnText}>
                {savingOrder ? 'Đang lưu...' : 'Tạo đơn & Kích hoạt gói'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  loadingCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
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
  kpiGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kpiGridPhone: { gap: 10 },
  kpiCard: {
    flex: 1,
    minWidth: 190,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 4,
    ...nihongoTheme.shadow.card,
  },
  kpiCardPhone: { minWidth: '47%' },
  kpiCardHighlight: { backgroundColor: '#FFFBF5', borderColor: '#F6D5B0' },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  kpiValue: { fontSize: 24, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  kpiSub: { fontSize: 12, color: nihongoTheme.colors.textMuted },
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
  mutedText: { fontSize: 12, color: nihongoTheme.colors.textSecondary },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowBetweenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  ratioBar: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F3EEE8',
    flexDirection: 'row',
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendText: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  chipActive: { backgroundColor: nihongoTheme.colors.accent },
  chipText: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  chartFocusPill: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chartFocusText: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minWidth: '100%',
    paddingTop: 12,
    paddingBottom: 4,
  },
  chartCol: { alignItems: 'center', gap: 5, width: 32 },
  chartColFlex: { flex: 1, width: undefined, minWidth: 22 },
  barTrack: { height: 120, justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  barFill: {
    width: '72%',
    maxWidth: 28,
    minWidth: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  barFillEmpty: { backgroundColor: '#EFE8DF' },
  barFillSelected: { backgroundColor: nihongoTheme.colors.accentHover },
  barLabel: { fontSize: 10, color: nihongoTheme.colors.textMuted, fontWeight: '600' },
  barLabelSelected: { color: nihongoTheme.colors.accentHover, fontWeight: '800' },
  searchInput: {
    flex: 1,
    minWidth: 200,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  emptyText: { fontSize: 13, color: nihongoTheme.colors.textMuted, paddingVertical: 12 },
  listGap: { gap: 10 },
  orderRow: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderLight,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  orderInfo: { flex: 1, minWidth: 220, gap: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  orderCode: { fontSize: 13, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  pill: { borderRadius: nihongoTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillMuted: { backgroundColor: '#EFEAE4' },
  pillMutedText: { color: nihongoTheme.colors.textSecondary },
  pillReal: { backgroundColor: '#EEF2FF' },
  pillRealText: { color: '#4338CA' },
  orderCustomer: { fontSize: 13, fontWeight: '600', color: nihongoTheme.colors.textPrimary },
  orderMeta: { fontSize: 11, color: nihongoTheme.colors.textMuted },
  orderRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  orderAmount: { fontSize: 15, fontWeight: '800', color: nihongoTheme.colors.accentHover },
  actionLinks: { flexDirection: 'row', gap: 8 },
  miniBtn: {
    backgroundColor: '#ECFDF5',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  miniBtnText: { fontSize: 11, fontWeight: '700', color: '#1B873F' },
  miniDangerBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  miniDangerText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  auditRow: {
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
    paddingBottom: 8,
    gap: 2,
  },
  auditTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  auditAction: { fontSize: 13, fontWeight: '700', color: nihongoTheme.colors.textPrimary },
  auditTime: { fontSize: 11, color: nihongoTheme.colors.textMuted },
  auditDetail: { fontSize: 12, color: nihongoTheme.colors.textSecondary },
  auditActor: { fontSize: 11, color: nihongoTheme.colors.textMuted },
  primaryBtnSmall: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.55 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  closeText: { fontSize: 13, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    gap: 10,
    ...nihongoTheme.shadow.dock,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  modalInput: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: nihongoTheme.colors.textPrimary,
  },
});
