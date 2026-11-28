import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useIsMobilePhone } from '../../utils/device';
import { AdminConfirmModal } from './AdminConfirmModal';
import { adminTheme, downloadCsvFile, formatDateTimeVn, formatVnd } from './admin-theme';
import {
  createAdminManualOrder,
  fetchAdminOrders,
  fetchAdminOverview,
  fetchAdminPlans,
  updateAdminOrderStatus,
  type AdminOrderDto,
  type AdminOverviewResponse,
} from './admin-api';

const DEFAULT_PLAN_PRICES: Record<'plus' | 'pro', Record<'monthly' | 'yearly', number>> = {
  plus: { monthly: 79000, yearly: 708000 },
  pro: { monthly: 149000, yearly: 1428000 },
};

const ORDER_STATUS_META: Record<
  AdminOrderDto['status'],
  { label: string; bg: string; text: string }
> = {
  paid: { label: 'Đã thu', bg: adminTheme.colors.successBg, text: adminTheme.colors.successText },
  pending: { label: 'Chờ duyệt', bg: adminTheme.colors.warningBg, text: adminTheme.colors.warningText },
  refunded: { label: 'Hoàn tiền', bg: adminTheme.colors.dangerBg, text: adminTheme.colors.dangerText },
};

const ACTION_LABELS: Record<string, string> = {
  order_create: 'Tạo đơn hàng',
  order_status_update: 'Cập nhật đơn hàng',
  user_role_update: 'Đổi phân quyền',
  user_ban: 'Khóa tài khoản',
  user_unban: 'Mở khóa tài khoản',
  user_subscription_set: 'Cập nhật gói cước',
  plan_config_update: 'Cập nhật cấu hình gói',
  user_points_adjust: 'Điều chỉnh Xu KS',
  lesson_create: 'Tạo bài học',
  lesson_update: 'Cập nhật bài học',
  lesson_delete: 'Xóa bài học',
  lesson_items_bulk_add: 'Nhập từ vựng CSV',
  lesson_material_upload: 'Tải lên tài liệu',
  lesson_material_link: 'Gắn liên kết tài liệu',
  lesson_material_delete: 'Xóa tài liệu',
};

interface AdminOverviewTabProps {
  refreshSignal?: number;
}

export function AdminOverviewTab({ refreshSignal = 0 }: AdminOverviewTabProps) {
  const isPhone = useIsMobilePhone();
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const [kind, setKind] = useState<'all' | 'real' | 'demo'>('all');
  const [orderStatus, setOrderStatus] = useState<'all' | 'paid' | 'pending' | 'refunded'>('all');
  const [orderQuery, setOrderQuery] = useState('');
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [orders, setOrders] = useState<AdminOrderDto[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [planPrices, setPlanPrices] = useState(DEFAULT_PLAN_PRICES);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null);
  const chartScrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);

  // Order status confirm modal state
  const [confirmOrderAction, setConfirmOrderAction] = useState<{
    order: AdminOrderDto;
    nextStatus: 'paid' | 'refunded';
  } | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState(false);

  // Manual order modal state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [mEmail, setMEmail] = useState('');
  const [mTier, setMTier] = useState<'plus' | 'pro'>('plus');
  const [mCycle, setMCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [mAmountInput, setMAmountInput] = useState(String(DEFAULT_PLAN_PRICES.plus.monthly));
  const [mNote, setMNote] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [ov, ord, planSnap] = await Promise.all([
        fetchAdminOverview(days, kind),
        fetchAdminOrders({ status: orderStatus, kind, q: orderQuery }),
        fetchAdminPlans().catch(() => null),
      ]);
      setOverview(ov);
      setOrders(ord.orders);
      setTotalOrders(ord.total);
      if (planSnap) {
        const plusPlan = planSnap.plans.find((p) => p.tier === 'plus');
        const proPlan = planSnap.plans.find((p) => p.tier === 'pro');
        setPlanPrices({
          plus: {
            monthly: plusPlan?.monthlyPriceVnd ?? DEFAULT_PLAN_PRICES.plus.monthly,
            yearly: plusPlan?.yearlyPriceVnd ?? DEFAULT_PLAN_PRICES.plus.yearly,
          },
          pro: {
            monthly: proPlan?.monthlyPriceVnd ?? DEFAULT_PLAN_PRICES.pro.monthly,
            yearly: proPlan?.yearlyPriceVnd ?? DEFAULT_PLAN_PRICES.pro.yearly,
          },
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được dữ liệu thống kê.');
    } finally {
      setLoading(false);
    }
  }, [days, kind, orderStatus, orderQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshSignal]);

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
    setMAmountInput(String(planPrices[nextTier][nextCycle]));
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
        amountVnd: Number.isFinite(amount) ? amount : planPrices[mTier][mCycle],
        status: 'paid',
        isDemo: false,
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

  const handleConfirmOrderStatus = async () => {
    if (!confirmOrderAction || updatingOrder) return;
    const { order, nextStatus } = confirmOrderAction;
    setUpdatingOrder(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      await updateAdminOrderStatus(order.id, nextStatus);
      setNoticeMsg(`Đã cập nhật đơn ${order.orderCode} → ${ORDER_STATUS_META[nextStatus].label}.`);
      setConfirmOrderAction(null);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không cập nhật được đơn hàng.');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleExportOrdersCsv = () => {
    if (orders.length === 0) return;
    const ok = downloadCsvFile(
      `kanjismart-don-hang-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Mã đơn', 'Khách hàng', 'Email', 'Gói', 'Chu kỳ', 'Số tiền VNĐ', 'Trạng thái', 'Loại', 'Kênh', 'Thời gian', 'Ghi chú'],
      orders.map((o) => [
        o.orderCode,
        o.userName,
        o.userEmail,
        o.tier.toUpperCase(),
        o.billingCycle === 'yearly' ? 'Năm' : 'Tháng',
        o.amountVnd,
        ORDER_STATUS_META[o.status].label,
        o.isDemo ? 'Demo' : 'Đơn thật',
        o.provider,
        formatDateTimeVn(o.paidAt ?? o.createdAt),
        o.note,
      ]),
    );
    if (!ok) {
      setNoticeMsg('Xuất CSV hiện khả dụng trên trình duyệt web.');
    }
  };

  const kpi = overview?.kpi;
  const hasDemoOrders = (kpi?.revenueDemoVnd ?? 0) > 0;
  const auditLogs = overview?.recentAuditLogs ?? [];
  const visibleLogs = showAllLogs ? auditLogs : auditLogs.slice(0, 5);
  const series = overview?.revenueSeries ?? [];
  const useHorizontalScroll = isPhone ? series.length > 10 : series.length > 31;

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
          <ActivityIndicator color={adminTheme.colors.accent} />
          <Text style={styles.mutedText}>Đang tải số liệu...</Text>
        </View>
      ) : (
        <>
          {/* KPI Summary Row */}
          <View style={[styles.kpiGrid, isPhone && styles.kpiGridPhone]}>
            <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
              <Text style={styles.kpiLabel}>Học viên</Text>
              <Text style={styles.kpiValue}>{kpi?.totalUsers ?? 0}</Text>
              <Text style={styles.kpiSub}>+{kpi?.newUsers30d ?? 0} trong 30 ngày</Text>
            </View>
            <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
              <Text style={styles.kpiLabel}>Học hôm nay</Text>
              <Text style={styles.kpiValue}>{kpi?.activeUsersToday ?? 0}</Text>
              <Text style={styles.kpiSub}>
                {kpi?.publishedLessonCount ?? 0} bài học · {kpi?.materialCount ?? 0} tài liệu
              </Text>
            </View>
            <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
              <Text style={styles.kpiLabel}>Hội viên trả phí</Text>
              <Text style={styles.kpiValue}>{kpi?.paidUsersCount ?? 0}</Text>
              <Text style={styles.kpiSub}>
                Plus: {kpi?.tierCounts.plus ?? 0} · Pro AI: {kpi?.tierCounts.pro ?? 0}
              </Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardHighlight, isPhone && styles.kpiCardPhone]}>
              <Text style={styles.kpiLabel}>{hasDemoOrders ? 'Doanh thu đơn thật' : 'Doanh thu'}</Text>
              <Text style={[styles.kpiValue, { color: adminTheme.colors.accentHover }]}>
                {formatVnd(kpi?.revenueRealVnd ?? 0)}
              </Text>
              <Text style={styles.kpiSub}>
                Tháng này: {formatVnd(kpi?.revenueThisMonthRealVnd ?? 0)} · {kpi?.paidOrderCount ?? 0} đơn
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
              {hasDemoOrders ? (
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
              ) : (
                <View />
              )}

              {selectedPoint ? (
                <View style={styles.chartFocusPill}>
                  <Text style={styles.chartFocusText}>
                    {selectedPoint.label}: {formatVnd(selectedPoint.amountVnd)} ({selectedPoint.orderCount} đơn)
                  </Text>
                </View>
              ) : null}
            </View>

            <ScrollView
              ref={chartScrollRef}
              horizontal={useHorizontalScroll}
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => {
                if (useHorizontalScroll) {
                  chartScrollRef.current?.scrollToEnd({ animated: false });
                }
              }}
              contentContainerStyle={[
                styles.chartRow,
                !useHorizontalScroll && styles.chartRowFit,
              ]}
            >
              {series.map((point, idx) => {
                const ratio = point.amountVnd > 0 ? Math.max(0.08, point.amountVnd / maxBarAmount) : 0.03;
                const barHeight = Math.round(ratio * 116);
                const isSelected = selectedPoint?.dateKey === point.dateKey;
                const showLabel =
                  useHorizontalScroll ||
                  series.length <= 14 ||
                  idx === 0 ||
                  idx === series.length - 1 ||
                  idx % 5 === 0 ||
                  isSelected;
                return (
                  <Pressable
                    key={point.dateKey}
                    style={[styles.chartCol, !useHorizontalScroll && styles.chartColFlex]}
                    onPress={() => setSelectedBarKey(point.dateKey)}
                  >
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: barHeight, minWidth: useHorizontalScroll ? 10 : 6 },
                          point.amountVnd === 0 && styles.barFillEmpty,
                          isSelected && styles.barFillSelected,
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isSelected && styles.barLabelSelected]} numberOfLines={1}>
                      {showLabel ? point.label : ' '}
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
              <View style={styles.filterGroup}>
                {orders.length > 0 ? (
                  <Pressable style={styles.outlineBtn} onPress={handleExportOrdersCsv}>
                    <Text style={styles.outlineBtnText}>Xuất CSV</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.primaryBtnSmall}
                  onPress={() => {
                    setMAmountInput(String(planPrices[mTier][mCycle]));
                    setOrderModalOpen(true);
                  }}
                >
                  <Text style={styles.primaryBtnText}>+ Ghi nhận đơn</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.rowBetweenWrap}>
              <TextInput
                value={orderQuery}
                onChangeText={setOrderQuery}
                placeholder="Tìm mã đơn hoặc email..."
                placeholderTextColor={adminTheme.colors.textMuted}
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
                          {ord.isDemo ? (
                            <View style={[styles.pill, styles.pillMuted]}>
                              <Text style={[styles.pillText, styles.pillMutedText]}>Demo</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.orderCustomer}>
                          {ord.userName} ({ord.userEmail}) · {ord.tier.toUpperCase()} ({ord.billingCycle === 'yearly' ? 'Năm' : 'Tháng'})
                        </Text>
                        <Text style={styles.orderMeta}>
                          {formatDateTimeVn(ord.paidAt ?? ord.createdAt)}
                          {ord.note ? ` · ${ord.note}` : ''}
                        </Text>
                      </View>
                      <View style={styles.orderRight}>
                        <Text style={styles.orderAmount}>{formatVnd(ord.amountVnd)}</Text>
                        <View style={styles.actionLinks}>
                          {ord.status === 'pending' ? (
                            <Pressable
                              style={styles.miniBtn}
                              onPress={() =>
                                setConfirmOrderAction({ order: ord, nextStatus: 'paid' })
                              }
                            >
                              <Text style={styles.miniBtnText}>Xác nhận thu</Text>
                            </Pressable>
                          ) : null}
                          {ord.status === 'paid' ? (
                            <Pressable
                              style={styles.miniDangerBtn}
                              onPress={() =>
                                setConfirmOrderAction({ order: ord, nextStatus: 'refunded' })
                              }
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

          {/* Recent Admin Audit Log (Progressive Disclosure: 5 by default) */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Nhật ký quản trị gần đây</Text>
              {auditLogs.length > 5 ? (
                <Pressable style={styles.outlineBtn} onPress={() => setShowAllLogs((v) => !v)}>
                  <Text style={styles.outlineBtnText}>
                    {showAllLogs ? 'Thu gọn' : `Xem thêm (${auditLogs.length - 5})`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {auditLogs.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có thao tác quản trị nào.</Text>
            ) : (
              <View style={styles.listGap}>
                {visibleLogs.map((log) => (
                  <View key={log.id} style={styles.auditRow}>
                    <View style={styles.auditTop}>
                      <Text style={styles.auditAction}>{ACTION_LABELS[log.action] ?? log.action}</Text>
                      <Text style={styles.auditTime}>{formatDateTimeVn(log.createdAt)}</Text>
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
              <Pressable style={styles.closeBtn} onPress={() => setOrderModalOpen(false)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Email tài khoản học viên</Text>
            <TextInput
              value={mEmail}
              onChangeText={setMEmail}
              placeholder="vd: student@gmail.com"
              placeholderTextColor={adminTheme.colors.textMuted}
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

            <Text style={styles.inputLabel}>Ghi chú</Text>
            <TextInput
              value={mNote}
              onChangeText={setMNote}
              placeholder="Chuyển khoản, tiền mặt..."
              placeholderTextColor={adminTheme.colors.textMuted}
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

      <AdminConfirmModal
        visible={Boolean(confirmOrderAction)}
        title={
          confirmOrderAction?.nextStatus === 'refunded'
            ? 'Xác nhận hoàn tiền đơn hàng'
            : 'Xác nhận đã thu tiền'
        }
        message={
          confirmOrderAction?.nextStatus === 'refunded'
            ? `Đơn ${confirmOrderAction.order.orderCode} (${formatVnd(confirmOrderAction.order.amountVnd)}) sẽ chuyển sang Hoàn tiền và tự động thu hồi gói nếu đơn đang kích hoạt.`
            : `Xác nhận đã thu ${formatVnd(confirmOrderAction?.order.amountVnd ?? 0)} cho đơn ${confirmOrderAction?.order.orderCode ?? ''} và kích hoạt gói cho ${confirmOrderAction?.order.userEmail ?? ''}.`
        }
        confirmLabel={
          confirmOrderAction?.nextStatus === 'refunded' ? 'Hoàn tiền' : 'Xác nhận thu'
        }
        tone={confirmOrderAction?.nextStatus === 'refunded' ? 'danger' : 'primary'}
        busy={updatingOrder}
        onCancel={() => setConfirmOrderAction(null)}
        onConfirm={() => void handleConfirmOrderStatus()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  loadingCard: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
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
  kpiGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kpiGridPhone: { gap: 8 },
  kpiCard: {
    flex: 1,
    minWidth: 190,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 16,
    gap: 4,
  },
  kpiCardPhone: { minWidth: '47%' },
  kpiCardHighlight: {
    backgroundColor: adminTheme.colors.accentSoft,
    borderColor: adminTheme.colors.accentBorder,
  },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  kpiValue: { fontSize: 23, fontWeight: '800', color: adminTheme.colors.textPrimary },
  kpiSub: { fontSize: 11, color: adminTheme.colors.textMuted },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: adminTheme.colors.textPrimary },
  mutedText: { fontSize: 12, color: adminTheme.colors.textSecondary },
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
  chartFocusPill: {
    backgroundColor: adminTheme.colors.accentSoft,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chartFocusText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.accentHover },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minWidth: '100%',
    paddingTop: 12,
    paddingBottom: 4,
  },
  chartRowFit: { gap: 4, width: '100%' },
  chartCol: { alignItems: 'center', gap: 5, width: 32 },
  chartColFlex: { flex: 1, width: undefined, minWidth: 0 },
  barTrack: { height: 120, justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  barFill: {
    width: '72%',
    maxWidth: 28,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  barFillEmpty: { backgroundColor: adminTheme.colors.border },
  barFillSelected: { backgroundColor: adminTheme.colors.accentHover },
  barLabel: { fontSize: 10, color: adminTheme.colors.textMuted, fontWeight: '600' },
  barLabelSelected: { color: adminTheme.colors.accentHover, fontWeight: '800' },
  searchInput: {
    flex: 1,
    minWidth: 200,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: adminTheme.colors.textPrimary,
  },
  emptyText: { fontSize: 13, color: adminTheme.colors.textMuted, paddingVertical: 10 },
  listGap: { gap: 10 },
  orderRow: {
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderRadius: adminTheme.radius.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  orderInfo: { flex: 1, minWidth: 220, gap: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  orderCode: { fontSize: 13, fontWeight: '800', color: adminTheme.colors.textPrimary },
  pill: { borderRadius: adminTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillMuted: { backgroundColor: adminTheme.colors.border },
  pillMutedText: { color: adminTheme.colors.textSecondary },
  orderCustomer: { fontSize: 13, fontWeight: '600', color: adminTheme.colors.textPrimary },
  orderMeta: { fontSize: 11, color: adminTheme.colors.textMuted },
  orderRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  orderAmount: { fontSize: 15, fontWeight: '800', color: adminTheme.colors.accentHover },
  actionLinks: { flexDirection: 'row', gap: 8 },
  miniBtn: {
    backgroundColor: adminTheme.colors.successBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  miniBtnText: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.successText },
  miniDangerBtn: {
    backgroundColor: adminTheme.colors.dangerBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  miniDangerText: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.dangerText },
  auditRow: {
    borderBottomWidth: 1,
    borderBottomColor: adminTheme.colors.border,
    paddingBottom: 8,
    gap: 2,
  },
  auditTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  auditAction: { fontSize: 13, fontWeight: '700', color: adminTheme.colors.textPrimary },
  auditTime: { fontSize: 11, color: adminTheme.colors.textMuted },
  auditDetail: { fontSize: 12, color: adminTheme.colors.textSecondary },
  auditActor: { fontSize: 11, color: adminTheme.colors.textMuted },
  outlineBtn: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  primaryBtnSmall: {
    backgroundColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtn: {
    backgroundColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.input,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.55 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
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
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 18,
    gap: 10,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  modalInput: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: adminTheme.colors.textPrimary,
  },
});
