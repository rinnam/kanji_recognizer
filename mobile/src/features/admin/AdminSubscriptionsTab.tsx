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
import type { SubscriptionTier } from '../lessons/lessons-api';
import { AdminConfirmBanner } from './AdminConfirmModal';
import { AdminPlanConfigPanel } from './AdminPlanConfigPanel';
import { AdminSwitch } from './AdminSwitch';
import {
  adminTheme,
  downloadCsvFile,
  formatDateTimeVn,
  formatDateVn,
  formatVnd,
} from './admin-theme';
import {
  adminSetUserSubscriptionApi,
  fetchAdminSubscriptionDetail,
  fetchAdminSubscriptions,
  type AdminSubscriptionDetailResponse,
  type AdminSubscriptionRow,
  type AdminSubscriptionsResponse,
  type SubscriptionStatusKind,
} from './admin-api';

const PROVIDER_OPTIONS = [
  { key: 'bank_transfer', label: 'Chuyển khoản' },
  { key: 'momo', label: 'MoMo' },
  { key: 'vnpay', label: 'VNPay' },
  { key: 'cash', label: 'Tiền mặt' },
] as const;

const PROVIDER_LABELS: Record<string, string> = {
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  vnpay: 'VNPay',
  cash: 'Tiền mặt',
  manual: 'Thủ công',
  admin_manual: 'Admin cấp',
  admin_demo: 'Demo (Admin)',
  demo_checkout: 'Demo Checkout',
};

const ORDER_STATUS_META: Record<
  'paid' | 'pending' | 'refunded',
  { label: string; bg: string; text: string }
> = {
  paid: {
    label: 'Đã thu',
    bg: adminTheme.colors.successBg,
    text: adminTheme.colors.successText,
  },
  pending: {
    label: 'Chờ duyệt',
    bg: adminTheme.colors.warningBg,
    text: adminTheme.colors.warningText,
  },
  refunded: {
    label: 'Hoàn tiền',
    bg: adminTheme.colors.dangerBg,
    text: adminTheme.colors.dangerText,
  },
};

const DURATION_PRESETS = [
  { label: '1 tháng (30 ngày)', days: 30, cycle: 'monthly' as const },
  { label: '3 tháng (90 ngày)', days: 90, cycle: 'monthly' as const },
  { label: '1 năm (365 ngày)', days: 365, cycle: 'yearly' as const },
];

function formatSubStatusBadge(row: AdminSubscriptionRow): {
  label: string;
  bg: string;
  text: string;
} {
  if (row.subscriptionStatus === 'free') {
    return {
      label: 'Miễn phí',
      bg: adminTheme.colors.chipBg,
      text: adminTheme.colors.textSecondary,
    };
  }
  if (row.isLifetime) {
    return {
      label: 'Hoạt động · Không giới hạn',
      bg: adminTheme.colors.successBg,
      text: adminTheme.colors.successText,
    };
  }
  if (row.subscriptionStatus === 'expired') {
    const overdueDays = Math.abs(row.daysRemaining ?? 0);
    return {
      label: overdueDays > 0 ? `Hết hạn ${overdueDays} ngày` : 'Đã hết hạn',
      bg: adminTheme.colors.dangerBg,
      text: adminTheme.colors.dangerText,
    };
  }
  if (row.subscriptionStatus === 'expiring_soon') {
    return {
      label: `Sắp hết hạn · còn ${Math.max(0, row.daysRemaining ?? 0)} ngày`,
      bg: adminTheme.colors.warningBg,
      text: adminTheme.colors.warningText,
    };
  }
  return {
    label: `Hoạt động · còn ${row.daysRemaining ?? 0} ngày`,
    bg: adminTheme.colors.successBg,
    text: adminTheme.colors.successText,
  };
}

function computeDefaultPrice(
  catalog: AdminSubscriptionsResponse['planCatalog'] | undefined,
  tier: 'plus' | 'pro',
  cycle: 'monthly' | 'yearly',
  days: number,
): number {
  const plusDef = catalog?.plus ?? { monthlyPriceVnd: 79000, yearlyPriceVnd: 708000 };
  const proDef = catalog?.pro ?? { monthlyPriceVnd: 149000, yearlyPriceVnd: 1428000 };
  const plan = tier === 'pro' ? proDef : plusDef;
  if (cycle === 'yearly' || days >= 360) return plan.yearlyPriceVnd;
  const months = Math.max(1, Math.round(days / 30));
  return plan.monthlyPriceVnd * months;
}

interface AdminSubscriptionsTabProps {
  initialQuery?: string;
  refreshSignal?: number;
}

export function AdminSubscriptionsTab({
  initialQuery,
  refreshSignal = 0,
}: AdminSubscriptionsTabProps) {
  const isPhone = useIsMobilePhone();
  const [subView, setSubView] = useState<'customers' | 'plans'>('customers');
  const [q, setQ] = useState(initialQuery ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatusKind>('all');
  const [tierFilter, setTierFilter] = useState<'all' | SubscriptionTier>('all');
  const [sortBy, setSortBy] = useState<'expires_asc' | 'started_desc' | 'spent_desc'>('expires_asc');

  const [data, setData] = useState<AdminSubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const [selectedRow, setSelectedRow] = useState<AdminSubscriptionRow | null>(null);
  const [detail, setDetail] = useState<AdminSubscriptionDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionMode, setActionMode] = useState<'extend' | 'replace'>('extend');
  const [formTier, setFormTier] = useState<'plus' | 'pro'>('plus');
  const [formCycle, setFormCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [durationDaysInput, setDurationDaysInput] = useState('30');
  const [recordOrder, setRecordOrder] = useState(true);
  const [amountInput, setAmountInput] = useState('79000');
  const [provider, setProvider] = useState<string>('bank_transfer');
  const [orderNote, setOrderNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [modalTab, setModalTab] = useState<'manage' | 'history'>('manage');

  useEffect(() => {
    if (initialQuery !== undefined) {
      setQ(initialQuery);
      if (initialQuery) setSubView('customers');
    }
  }, [initialQuery]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAdminSubscriptions({
        q,
        status: statusFilter,
        tier: tierFilter,
        sort: sortBy,
      });
      setData(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được dữ liệu quản lý gói.');
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, tierFilter, sortBy]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const prevRefreshRef = useRef(refreshSignal);
  useEffect(() => {
    if (prevRefreshRef.current === refreshSignal) return;
    prevRefreshRef.current = refreshSignal;
    void loadList();
  }, [refreshSignal, loadList]);

  const closeDetailModal = () => {
    setSelectedRow(null);
    setConfirmDowngrade(false);
  };

  const openDetailModal = async (row: AdminSubscriptionRow) => {
    setSelectedRow(row);
    setDetail(null);
    setDetailLoading(true);
    setConfirmDowngrade(false);
    setModalTab('manage');
    setErrorMsg(null);

    const hasPaidActive =
      row.tier !== 'free' &&
      (row.subscriptionStatus === 'active' || row.subscriptionStatus === 'expiring_soon') &&
      !row.isLifetime;
    const defaultTier: 'plus' | 'pro' = row.tier === 'pro' ? 'pro' : 'plus';
    const defaultCycle: 'monthly' | 'yearly' =
      row.tier === 'free' ? 'monthly' : row.billingCycle;
    const defaultDays = defaultCycle === 'yearly' ? 365 : 30;

    setActionMode(hasPaidActive ? 'extend' : 'replace');
    setFormTier(defaultTier);
    setFormCycle(defaultCycle);
    setDurationDaysInput(String(defaultDays));
    setRecordOrder(true);
    setProvider('bank_transfer');
    setAmountInput(
      String(computeDefaultPrice(data?.planCatalog, defaultTier, defaultCycle, defaultDays)),
    );
    setOrderNote('');

    try {
      const d = await fetchAdminSubscriptionDetail(row.userId);
      setDetail(d);
      setSelectedRow(d.subscription);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được chi tiết gói.');
    } finally {
      setDetailLoading(false);
    }
  };

  const parsedDays = Math.max(1, Number(durationDaysInput.replace(/[^0-9]/g, '')) || 30);

  const previewNewExpiryText = useMemo(() => {
    if (!selectedRow) return '—';
    const nowMs = Date.now();
    const curExpiryMs = selectedRow.expiresAt ? new Date(selectedRow.expiresAt).getTime() : 0;
    const baseMs = actionMode === 'extend' && curExpiryMs > nowMs ? curExpiryMs : nowMs;
    const targetDate = new Date(baseMs + parsedDays * 86_400_000);
    return targetDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, [selectedRow, actionMode, parsedDays]);

  const handleSelectPlanForm = (
    nextTier: 'plus' | 'pro',
    nextCycle: 'monthly' | 'yearly',
    nextDays: number,
  ) => {
    setFormTier(nextTier);
    setFormCycle(nextCycle);
    setDurationDaysInput(String(nextDays));
    setAmountInput(String(computeDefaultPrice(data?.planCatalog, nextTier, nextCycle, nextDays)));
  };

  const handleSaveSubscription = async (targetTier: 'free' | 'plus' | 'pro') => {
    if (!selectedRow || saving) return;
    setSaving(true);
    setErrorMsg(null);
    setNoticeMsg(null);

    try {
      const parsedAmount = Math.max(0, Number(amountInput.replace(/[^0-9]/g, '')) || 0);
      await adminSetUserSubscriptionApi(selectedRow.userId, {
        tier: targetTier,
        billingCycle: targetTier === 'free' ? 'monthly' : formCycle,
        mode: targetTier === 'free' ? 'replace' : actionMode,
        durationDays: parsedDays,
        recordOrder: targetTier !== 'free' && recordOrder,
        amountVnd: parsedAmount,
        isDemo: false,
        provider,
        note: orderNote.trim() || undefined,
      });

      setNoticeMsg(
        targetTier === 'free'
          ? `Đã chuyển ${selectedRow.email} về gói Miễn phí.`
          : `${actionMode === 'extend' ? 'Đã gia hạn' : 'Đã kích hoạt'} gói ${targetTier.toUpperCase()} (+${parsedDays} ngày) cho ${selectedRow.email}.`,
      );
      setConfirmDowngrade(false);
      const [freshDetail] = await Promise.all([
        fetchAdminSubscriptionDetail(selectedRow.userId),
        loadList(),
      ]);
      setDetail(freshDetail);
      setSelectedRow(freshDetail.subscription);
      setOrderNote('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không cập nhật được gói cho khách.');
    } finally {
      setSaving(false);
    }
  };

  const summary = data?.summary;
  const rows = data?.subscriptions ?? [];

  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const ok = downloadCsvFile(
      'kanjismart-goi-khach-hang.csv',
      [
        'Khách hàng',
        'Email',
        'Gói',
        'Chu kỳ',
        'Trạng thái',
        'Giá niêm yết (VNĐ)',
        'Ngày đăng ký',
        'Ngày hết hạn',
        'Mã đơn gần nhất',
        'Tổng đã thu (VNĐ)',
        'Số đơn',
      ],
      rows.map((r) => [
        r.displayName,
        r.email,
        r.tier === 'pro' ? 'Pro AI' : r.tier === 'plus' ? 'Plus' : 'Free',
        r.tier === 'free' ? '' : r.billingCycle === 'yearly' ? 'Năm' : 'Tháng',
        formatSubStatusBadge(r).label,
        r.tier === 'free' ? 0 : r.listPriceVnd,
        formatDateVn(r.tier === 'free' ? r.userCreatedAt : r.startedAt),
        r.tier === 'free' ? '' : r.isLifetime ? 'Không giới hạn' : formatDateVn(r.expiresAt),
        r.currentOrderCode ?? '',
        r.totalPaidVnd,
        r.paidOrderCount,
      ]),
    );
    if (ok) {
      setNoticeMsg(`Đã xuất ${rows.length} khách hàng ra tệp CSV.`);
    }
  };

  const renderSubViewBar = () => (
    <View style={styles.filterGroup}>
      {(
        [
          ['customers', 'Khách hàng & Thời hạn'],
          ['plans', 'Cấu hình giá & Chức năng gói'],
        ] as const
      ).map(([k, lbl]) => (
        <Pressable
          key={k}
          style={[styles.chip, subView === k && styles.chipDarkActive]}
          onPress={() => setSubView(k)}
        >
          <Text style={[styles.chipText, subView === k && styles.chipTextActive]}>{lbl}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (subView === 'plans') {
    return (
      <View style={styles.container}>
        {renderSubViewBar()}
        <AdminPlanConfigPanel
          refreshSignal={refreshSignal}
          onPlanSaved={() => void loadList()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSubViewBar()}
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

      {/* Top Sales & Subscription KPIs */}
      <View style={[styles.kpiGrid, isPhone && styles.kpiGridPhone]}>
        <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
          <Text style={styles.kpiLabel}>Gói đang hoạt động</Text>
          <Text style={styles.kpiValue}>{summary?.activePaidCount ?? 0}</Text>
          <Text style={styles.kpiSub}>
            Plus: {summary?.activePlusCount ?? 0} · Pro AI: {summary?.activeProCount ?? 0}
          </Text>
        </View>
        <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
          <Text style={styles.kpiLabel}>Sắp hết hạn (≤ 7 ngày)</Text>
          <Text
            style={[
              styles.kpiValue,
              (summary?.expiringSoonCount ?? 0) > 0 && { color: adminTheme.colors.warningText },
            ]}
          >
            {summary?.expiringSoonCount ?? 0}
          </Text>
          <Text style={styles.kpiSub}>Cần nhắc gia hạn</Text>
        </View>
        <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
          <Text style={styles.kpiLabel}>Đã hết hạn</Text>
          <Text
            style={[
              styles.kpiValue,
              (summary?.expiredCount ?? 0) > 0 && { color: adminTheme.colors.dangerText },
            ]}
          >
            {summary?.expiredCount ?? 0}
          </Text>
          <Text style={styles.kpiSub}>Free hiện tại: {summary?.freeCount ?? 0}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiCardAccent, isPhone && styles.kpiCardPhone]}>
          <Text style={styles.kpiLabel}>Doanh thu định kỳ (MRR)</Text>
          <Text style={[styles.kpiValue, { color: adminTheme.colors.accentHover }]}>
            {formatVnd(summary?.estimatedMrrVnd ?? 0)}
          </Text>
          <Text style={styles.kpiSub}>
            Thực thu: {formatVnd(summary?.totalRevenueCollectedVnd ?? 0)}
          </Text>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.card}>
        <View style={styles.rowBetweenWrap}>
          <Text style={styles.cardTitle}>Danh sách gói khách hàng ({data?.total ?? 0})</Text>
          <View style={styles.filterGroup}>
            {rows.length > 0 ? (
              <Pressable style={styles.outlineBtn} onPress={handleExportCsv}>
                <Text style={styles.outlineBtnText}>Xuất CSV</Text>
              </Pressable>
            ) : null}
            {q ? (
              <Pressable style={styles.outlineBtn} onPress={() => setQ('')}>
                <Text style={styles.outlineBtnText}>Xóa tìm kiếm</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Tìm tên khách hàng, email hoặc mã đơn..."
          placeholderTextColor={adminTheme.colors.textMuted}
          style={styles.searchInput}
        />

        <View style={styles.filtersStack}>
          <View style={styles.filterGroup}>
            {(
              [
                ['all', 'Tất cả trạng thái'],
                ['active', 'Đang hoạt động'],
                ['expiring_soon', 'Sắp hết hạn'],
                ['expired', 'Đã hết hạn'],
                ['free', 'Miễn phí'],
              ] as const
            ).map(([k, lbl]) => (
              <Pressable
                key={k}
                style={[styles.chip, statusFilter === k && styles.chipActive]}
                onPress={() => setStatusFilter(k)}
              >
                <Text style={[styles.chipText, statusFilter === k && styles.chipTextActive]}>
                  {lbl}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.rowBetweenWrap}>
            <View style={styles.filterGroup}>
              {(
                [
                  ['all', 'Tất cả gói'],
                  ['plus', 'Plus'],
                  ['pro', 'Pro AI'],
                  ['free', 'Free'],
                ] as const
              ).map(([t, lbl]) => (
                <Pressable
                  key={t}
                  style={[styles.chip, tierFilter === t && styles.chipActive]}
                  onPress={() => setTierFilter(t)}
                >
                  <Text style={[styles.chipText, tierFilter === t && styles.chipTextActive]}>
                    {lbl}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterGroup}>
              {(
                [
                  ['expires_asc', 'Hết hạn gần nhất'],
                  ['started_desc', 'Đăng ký mới nhất'],
                  ['spent_desc', 'Chi tiêu cao nhất'],
                ] as const
              ).map(([s, lbl]) => (
                <Pressable
                  key={s}
                  style={[styles.chip, sortBy === s && styles.chipDarkActive]}
                  onPress={() => setSortBy(s)}
                >
                  <Text style={[styles.chipText, sortBy === s && styles.chipTextActive]}>
                    {lbl}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {loading && !data ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={adminTheme.colors.accent} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.emptyText}>Không có khách hàng nào khớp bộ lọc.</Text>
        ) : (
          <View style={styles.listGap}>
            {rows.map((row) => {
              const st = formatSubStatusBadge(row);
              const priceStr =
                row.tier === 'free'
                  ? '0đ'
                  : `${formatVnd(row.listPriceVnd)}/${row.billingCycle === 'yearly' ? 'năm' : 'tháng'}`;
              return (
                <View key={row.userId} style={styles.subCard}>
                  <View style={styles.subTopRow}>
                    <View style={styles.subIdentity}>
                      <View style={styles.badgeRow}>
                        <Text style={styles.userName}>{row.displayName}</Text>
                        <View
                          style={[
                            styles.pill,
                            row.tier === 'free' ? styles.pillNeutral : styles.pillTier,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              row.tier === 'free' ? styles.pillNeutralText : styles.pillTierText,
                            ]}
                          >
                            {row.tier === 'pro' ? 'PRO AI' : row.tier.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.pill, { backgroundColor: st.bg }]}>
                          <Text style={[styles.pillText, { color: st.text }]}>{st.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.userEmail}>{row.email}</Text>
                    </View>

                    <Pressable
                      style={styles.detailBtn}
                      onPress={() => void openDetailModal(row)}
                    >
                      <Text style={styles.detailBtnText}>Chi tiết &amp; Gia hạn</Text>
                    </Pressable>
                  </View>

                  <View style={[styles.metaGrid, isPhone && styles.metaGridPhone]}>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>GÓI &amp; GIÁ BÁN</Text>
                      <Text style={styles.metaValue}>{priceStr}</Text>
                      <Text style={styles.metaHint}>
                        {row.tier === 'free'
                          ? 'Gói cơ bản'
                          : row.lastPaidAmountVnd !== null
                            ? `Thực thu gần nhất: ${formatVnd(row.lastPaidAmountVnd)}`
                            : row.planName}
                      </Text>
                    </View>

                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>NGÀY ĐĂNG KÝ</Text>
                      <Text style={styles.metaValue}>
                        {row.tier === 'free'
                          ? formatDateVn(row.userCreatedAt)
                          : formatDateVn(row.startedAt)}
                      </Text>
                      <Text style={styles.metaHint}>
                        {row.tier === 'free'
                          ? 'Ngày tạo tài khoản'
                          : formatDateTimeVn(row.startedAt)}
                      </Text>
                    </View>

                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>NGÀY HẾT HẠN</Text>
                      <Text style={styles.metaValue}>
                        {row.tier === 'free'
                          ? '—'
                          : row.isLifetime
                            ? 'Không giới hạn'
                            : formatDateVn(row.expiresAt)}
                      </Text>
                      <Text style={styles.metaHint}>
                        {row.tier === 'free'
                          ? 'Chưa nâng cấp'
                          : row.isLifetime
                            ? 'Gói vĩnh viễn / dài hạn'
                            : row.subscriptionStatus === 'expired'
                              ? 'Cần gia hạn lại'
                              : `Còn ${row.daysRemaining ?? 0} ngày`}
                      </Text>
                    </View>

                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>MÃ ĐƠN &amp; TỔNG CHI</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>
                        {row.currentOrderCode || '—'}
                      </Text>
                      <Text style={styles.metaHint}>
                        Tổng thu: {formatVnd(row.totalPaidVnd)} ({row.paidOrderCount} đơn)
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Subscription Detail & Renew Modal */}
      <Modal
        visible={Boolean(selectedRow)}
        transparent
        animationType="fade"
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {selectedRow?.displayName}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {selectedRow?.email}
                </Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={closeDetailModal}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            {/* Compact Contract Summary Strip */}
            {selectedRow ? (
              <View style={styles.summaryStrip}>
                <View style={styles.summaryCell}>
                  <Text style={styles.metaLabel}>GÓI &amp; GIÁ</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {selectedRow.planName}
                  </Text>
                  <Text style={styles.metaHint}>
                    {selectedRow.tier === 'free'
                      ? '0đ'
                      : `${formatVnd(selectedRow.listPriceVnd)}/${
                          selectedRow.billingCycle === 'yearly' ? 'năm' : 'tháng'
                        }`}
                  </Text>
                </View>

                <View style={styles.summaryCell}>
                  <Text style={styles.metaLabel}>HIỆU LỰC</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {selectedRow.tier === 'free'
                      ? formatDateVn(selectedRow.userCreatedAt)
                      : `${formatDateVn(selectedRow.startedAt)} → ${
                          selectedRow.isLifetime ? 'Vĩnh viễn' : formatDateVn(selectedRow.expiresAt)
                        }`}
                  </Text>
                  <Text style={styles.metaHint}>
                    {selectedRow.tier === 'free'
                      ? 'Chưa nâng cấp'
                      : selectedRow.isLifetime
                        ? 'Không giới hạn'
                        : selectedRow.subscriptionStatus === 'expired'
                          ? 'Đã hết hạn'
                          : `Còn ${selectedRow.daysRemaining ?? 0} ngày`}
                  </Text>
                </View>

                <View style={styles.summaryCell}>
                  <Text style={styles.metaLabel}>MÃ ĐƠN &amp; TỔNG CHI</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {selectedRow.currentOrderCode || '—'}
                  </Text>
                  <Text style={styles.metaHint}>
                    {formatVnd(selectedRow.totalPaidVnd)} ({selectedRow.paidOrderCount} đơn)
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Segmented Modal Tabs */}
            <View style={styles.filterGroup}>
              <Pressable
                style={[styles.chip, modalTab === 'manage' && styles.chipDarkActive]}
                onPress={() => setModalTab('manage')}
              >
                <Text style={[styles.chipText, modalTab === 'manage' && styles.chipTextActive]}>
                  Gia hạn / Cấp gói
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, modalTab === 'history' && styles.chipDarkActive]}
                onPress={() => setModalTab('history')}
              >
                <Text style={[styles.chipText, modalTab === 'history' && styles.chipTextActive]}>
                  Lịch sử đơn hàng ({detail?.orders.length ?? 0})
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
              {modalTab === 'manage' ? (
                /* Renew / Upgrade Form */
                <View style={styles.sectionBox}>
                  <View style={styles.filterGroup}>
                    {(
                      [
                        ['extend', 'Gia hạn cộng dồn'],
                        ['replace', 'Cấp / Đổi gói mới'],
                      ] as const
                    ).map(([m, lbl]) => (
                      <Pressable
                        key={m}
                        style={[styles.chip, actionMode === m && styles.chipDarkActive]}
                        onPress={() => setActionMode(m)}
                      >
                        <Text style={[styles.chipText, actionMode === m && styles.chipTextActive]}>
                          {lbl}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.filterGroup}>
                    {(['plus', 'pro'] as const).map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.chip, formTier === t && styles.chipActive]}
                        onPress={() => handleSelectPlanForm(t, formCycle, parsedDays)}
                      >
                        <Text style={[styles.chipText, formTier === t && styles.chipTextActive]}>
                          {t === 'plus' ? 'Gói Plus' : 'Gói Pro AI'}
                        </Text>
                      </Pressable>
                    ))}
                    {DURATION_PRESETS.map((p) => {
                      const active = parsedDays === p.days && formCycle === p.cycle;
                      return (
                        <Pressable
                          key={p.label}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => handleSelectPlanForm(formTier, p.cycle, p.days)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {p.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={styles.inputLabel}>
                      Số ngày thêm (hạn mới:{' '}
                      <Text style={styles.previewStrong}>{previewNewExpiryText}</Text>)
                    </Text>
                    <TextInput
                      value={durationDaysInput}
                      onChangeText={(v) => setDurationDaysInput(v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      style={[styles.modalInput, { width: 96, textAlign: 'right' }]}
                    />
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={styles.mutedLabel}>Ghi nhận đơn vào sổ doanh thu</Text>
                    <AdminSwitch
                      value={recordOrder}
                      onValueChange={setRecordOrder}
                      accessibilityLabel="Ghi nhận đơn vào sổ doanh thu"
                    />
                  </View>

                  {recordOrder ? (
                    <>
                      <View style={styles.rowBetween}>
                        <Text style={styles.inputLabel}>Số tiền thực thu (VNĐ):</Text>
                        <TextInput
                          value={amountInput}
                          onChangeText={(v) => setAmountInput(v.replace(/[^0-9]/g, ''))}
                          keyboardType="numeric"
                          style={[styles.modalInput, { width: 150, textAlign: 'right' }]}
                        />
                      </View>

                      <View style={styles.filterGroup}>
                        {PROVIDER_OPTIONS.map((p) => (
                          <Pressable
                            key={p.key}
                            style={[styles.chip, provider === p.key && styles.chipActive]}
                            onPress={() => setProvider(p.key)}
                          >
                            <Text style={[styles.chipText, provider === p.key && styles.chipTextActive]}>
                              {p.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <TextInput
                        value={orderNote}
                        onChangeText={setOrderNote}
                        placeholder="Ghi chú giao dịch..."
                        placeholderTextColor={adminTheme.colors.textMuted}
                        style={styles.modalInput}
                      />
                    </>
                  ) : null}

                  <Pressable
                    style={styles.primaryBtn}
                    disabled={saving}
                    onPress={() => void handleSaveSubscription(formTier)}
                  >
                    <Text style={styles.primaryBtnText}>
                      {saving
                        ? 'Đang lưu...'
                        : actionMode === 'extend'
                          ? `Gia hạn +${parsedDays} ngày (${formTier === 'pro' ? 'Pro AI' : 'Plus'})`
                          : `Kích hoạt gói ${formTier === 'pro' ? 'Pro AI' : 'Plus'} (${parsedDays} ngày)`}
                    </Text>
                  </Pressable>

                  {selectedRow && selectedRow.tier !== 'free' ? (
                    confirmDowngrade ? (
                      <AdminConfirmBanner
                        visible
                        message={`Hạ tài khoản ${selectedRow.email} về gói Miễn phí ngay lập tức? Khách sẽ mất quyền lợi gói trả phí hiện tại.`}
                        confirmLabel="Xác nhận hạ về Free"
                        tone="danger"
                        busy={saving}
                        onCancel={() => setConfirmDowngrade(false)}
                        onConfirm={() => void handleSaveSubscription('free')}
                      />
                    ) : (
                      <Pressable
                        style={styles.downgradeBtn}
                        disabled={saving}
                        onPress={() => setConfirmDowngrade(true)}
                      >
                        <Text style={styles.downgradeBtnText}>Hạ về gói Miễn phí</Text>
                      </Pressable>
                    )
                  ) : null}
                </View>
              ) : (
                /* Payment History Tab */
                <View style={styles.sectionBox}>
                  {detailLoading ? (
                    <ActivityIndicator color={adminTheme.colors.accent} />
                  ) : (detail?.orders.length ?? 0) === 0 ? (
                    <Text style={styles.emptyText}>Chưa có giao dịch thanh toán nào được ghi nhận.</Text>
                  ) : (
                    <View style={styles.listGap}>
                      {detail?.orders.map((ord) => {
                        const st = ORDER_STATUS_META[ord.status];
                        return (
                          <View key={ord.id} style={styles.orderHistoryRow}>
                            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                              <View style={styles.badgeRow}>
                                <Text style={styles.orderCode}>{ord.orderCode}</Text>
                                <View style={[styles.pill, { backgroundColor: st.bg }]}>
                                  <Text style={[styles.pillText, { color: st.text }]}>{st.label}</Text>
                                </View>
                                {ord.isDemo ? (
                                  <View style={[styles.pill, styles.pillNeutral]}>
                                    <Text style={[styles.pillText, styles.pillNeutralText]}>Demo</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={styles.metaHint}>
                                Gói {ord.tier.toUpperCase()} ({ord.billingCycle === 'yearly' ? 'Năm' : 'Tháng'}) ·{' '}
                                {PROVIDER_LABELS[ord.provider] ?? ord.provider} ·{' '}
                                {formatDateTimeVn(ord.paidAt ?? ord.createdAt)}
                              </Text>
                              {ord.note ? <Text style={styles.orderNote}>{ord.note}</Text> : null}
                            </View>
                            <Text style={styles.orderAmount}>{formatVnd(ord.amountVnd)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
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
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiGridPhone: { gap: 8 },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 14,
    gap: 4,
  },
  kpiCardPhone: { minWidth: '47%' },
  kpiCardAccent: {
    backgroundColor: adminTheme.colors.accentSoft,
    borderColor: adminTheme.colors.accentBorder,
  },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  kpiValue: { fontSize: 22, fontWeight: '800', color: adminTheme.colors.textPrimary },
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
  outlineBtn: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  searchInput: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: adminTheme.colors.textPrimary,
  },
  filtersStack: { gap: 8 },
  rowBetweenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  chipDarkActive: { backgroundColor: adminTheme.colors.textPrimary },
  chipText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: adminTheme.colors.textMuted, paddingVertical: 8 },
  listGap: { gap: 10 },
  subCard: {
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  subTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  subIdentity: { flex: 1, minWidth: 220, gap: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  userName: { fontSize: 14, fontWeight: '800', color: adminTheme.colors.textPrimary },
  userEmail: { fontSize: 12, color: adminTheme.colors.textSecondary },
  pill: { borderRadius: adminTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillNeutral: { backgroundColor: adminTheme.colors.border },
  pillNeutralText: { color: adminTheme.colors.textSecondary },
  pillTier: { backgroundColor: adminTheme.colors.warningBg },
  pillTierText: { color: adminTheme.colors.warningText },
  detailBtn: {
    backgroundColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  detailBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: adminTheme.colors.border,
    paddingTop: 10,
  },
  metaGridPhone: { gap: 10 },
  metaCell: { flex: 1, minWidth: 170, gap: 2 },
  metaLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: adminTheme.colors.textMuted,
  },
  metaValue: { fontSize: 13, fontWeight: '700', color: adminTheme.colors.textPrimary },
  metaHint: { fontSize: 11, color: adminTheme.colors.textSecondary },
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
    maxWidth: 600,
    maxHeight: '92%',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 16,
    gap: 10,
  },
  summaryStrip: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.md,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCell: {
    flex: 1,
    minWidth: 150,
    gap: 2,
  },
  closeBtn: {
    backgroundColor: adminTheme.colors.chipBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  modalScroll: { flexShrink: 1 },
  modalBody: { gap: 10, paddingRight: 4, paddingBottom: 4 },
  sectionBox: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  mutedLabel: { fontSize: 12, fontWeight: '600', color: adminTheme.colors.textSecondary, flex: 1 },
  modalInput: {
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
    color: adminTheme.colors.textPrimary,
  },
  previewText: { fontSize: 12, color: adminTheme.colors.textSecondary },
  previewStrong: { fontWeight: '800', color: adminTheme.colors.successText },
  primaryBtn: {
    backgroundColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.input,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  downgradeBtn: {
    borderWidth: 1,
    borderColor: adminTheme.colors.dangerBorder,
    backgroundColor: adminTheme.colors.dangerBg,
    borderRadius: adminTheme.radius.input,
    paddingVertical: 9,
    alignItems: 'center',
  },
  downgradeBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.dangerText },
  orderHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.input,
    padding: 10,
  },
  orderCode: { fontSize: 12, fontWeight: '800', color: adminTheme.colors.textPrimary },
  orderNote: { fontSize: 11, color: adminTheme.colors.textMuted, fontStyle: 'italic' },
  orderAmount: { fontSize: 13, fontWeight: '800', color: adminTheme.colors.textPrimary },
});
