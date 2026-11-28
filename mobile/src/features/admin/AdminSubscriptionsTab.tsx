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
import type { SubscriptionTier } from '../lessons/lessons-api';
import { AdminPlanConfigPanel } from './AdminPlanConfigPanel';
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
  { key: 'bank_transfer', label: 'Chuyển khoản', isDemo: false },
  { key: 'momo', label: 'MoMo', isDemo: false },
  { key: 'vnpay', label: 'VNPay', isDemo: false },
  { key: 'cash', label: 'Tiền mặt', isDemo: false },
  { key: 'admin_demo', label: 'Demo', isDemo: true },
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
  paid: { label: 'Đã thu', bg: '#ECFDF5', text: '#1B873F' },
  pending: { label: 'Chờ duyệt', bg: '#FFF7ED', text: '#C25E00' },
  refunded: { label: 'Hoàn tiền', bg: '#FEF2F2', text: '#DC2626' },
};

const DURATION_PRESETS = [
  { label: '1 tháng (30 ngày)', days: 30, cycle: 'monthly' as const },
  { label: '3 tháng (90 ngày)', days: 90, cycle: 'monthly' as const },
  { label: '1 năm (365 ngày)', days: 365, cycle: 'yearly' as const },
];

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSubStatusBadge(row: AdminSubscriptionRow): {
  label: string;
  bg: string;
  text: string;
} {
  if (row.subscriptionStatus === 'free') {
    return { label: 'Miễn phí', bg: '#F4F4F5', text: '#52525B' };
  }
  if (row.isLifetime) {
    return { label: 'Hoạt động · Không giới hạn', bg: '#ECFDF5', text: '#1B873F' };
  }
  if (row.subscriptionStatus === 'expired') {
    const overdueDays = Math.abs(row.daysRemaining ?? 0);
    return {
      label: overdueDays > 0 ? `Hết hạn ${overdueDays} ngày` : 'Đã hết hạn',
      bg: '#FEF2F2',
      text: '#DC2626',
    };
  }
  if (row.subscriptionStatus === 'expiring_soon') {
    return {
      label: `Sắp hết hạn · còn ${Math.max(0, row.daysRemaining ?? 0)} ngày`,
      bg: '#FFF7ED',
      text: '#C25E00',
    };
  }
  return {
    label: `Hoạt động · còn ${row.daysRemaining ?? 0} ngày`,
    bg: '#ECFDF5',
    text: '#1B873F',
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
}

export function AdminSubscriptionsTab({ initialQuery }: AdminSubscriptionsTabProps) {
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

  // Selected customer modal + detail
  const [selectedRow, setSelectedRow] = useState<AdminSubscriptionRow | null>(null);
  const [detail, setDetail] = useState<AdminSubscriptionDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state for renew / upgrade
  const [actionMode, setActionMode] = useState<'extend' | 'replace'>('extend');
  const [formTier, setFormTier] = useState<'plus' | 'pro'>('plus');
  const [formCycle, setFormCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [durationDaysInput, setDurationDaysInput] = useState('30');
  const [recordOrder, setRecordOrder] = useState(true);
  const [amountInput, setAmountInput] = useState('79000');
  const [provider, setProvider] = useState<string>('bank_transfer');
  const [orderNote, setOrderNote] = useState('');
  const [saving, setSaving] = useState(false);

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

  const openDetailModal = async (row: AdminSubscriptionRow) => {
    setSelectedRow(row);
    setDetail(null);
    setDetailLoading(true);
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
    setAmountInput(String(computeDefaultPrice(data?.planCatalog, defaultTier, defaultCycle, defaultDays)));
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
    const baseMs =
      actionMode === 'extend' && curExpiryMs > nowMs ? curExpiryMs : nowMs;
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
      const isDemo = provider === 'admin_demo';
      const parsedAmount = Math.max(0, Number(amountInput.replace(/[^0-9]/g, '')) || 0);
      await adminSetUserSubscriptionApi(selectedRow.userId, {
        tier: targetTier,
        billingCycle: targetTier === 'free' ? 'monthly' : formCycle,
        mode: targetTier === 'free' ? 'replace' : actionMode,
        durationDays: parsedDays,
        recordOrder: targetTier !== 'free' && recordOrder,
        amountVnd: parsedAmount,
        isDemo,
        provider,
        note: orderNote.trim() || undefined,
      });

      setNoticeMsg(
        targetTier === 'free'
          ? `Đã chuyển ${selectedRow.email} về gói Miễn phí.`
          : `${actionMode === 'extend' ? 'Đã gia hạn' : 'Đã kích hoạt'} gói ${targetTier.toUpperCase()} (+${parsedDays} ngày) cho ${selectedRow.email}.`,
      );
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
  const catalog = data?.planCatalog;
  const rows = data?.subscriptions ?? [];

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
        <AdminPlanConfigPanel onPlanSaved={() => void loadList()} />
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
          <Text style={[styles.kpiValue, (summary?.expiringSoonCount ?? 0) > 0 && { color: '#C25E00' }]}>
            {summary?.expiringSoonCount ?? 0}
          </Text>
          <Text style={styles.kpiSub}>Cần nhắc gia hạn</Text>
        </View>
        <View style={[styles.kpiCard, isPhone && styles.kpiCardPhone]}>
          <Text style={styles.kpiLabel}>Đã hết hạn</Text>
          <Text style={[styles.kpiValue, (summary?.expiredCount ?? 0) > 0 && { color: '#DC2626' }]}>
            {summary?.expiredCount ?? 0}
          </Text>
          <Text style={styles.kpiSub}>Free hiện tại: {summary?.freeCount ?? 0}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiCardAccent, isPhone && styles.kpiCardPhone]}>
          <Text style={styles.kpiLabel}>Doanh thu định kỳ (MRR)</Text>
          <Text style={[styles.kpiValue, { color: nihongoTheme.colors.accentHover }]}>
            {formatVnd(summary?.estimatedMrrVnd ?? 0)}
          </Text>
          <Text style={styles.kpiSub}>
            Thực thu đơn thật: {formatVnd(summary?.totalRevenueCollectedVnd ?? 0)}
          </Text>
        </View>
      </View>

      {/* Catalog Price Strip */}
      <View style={styles.catalogCard}>
        <Text style={styles.catalogTitle}>Bảng giá niêm yết</Text>
        <View style={styles.catalogRow}>
          <Text style={styles.catalogItem}>
            Plus Tháng: <Text style={styles.catalogPrice}>{formatVnd(catalog?.plus.monthlyPriceVnd ?? 79000)}</Text>
          </Text>
          <Text style={styles.catalogItem}>
            Plus Năm: <Text style={styles.catalogPrice}>{formatVnd(catalog?.plus.yearlyPriceVnd ?? 708000)}</Text>
          </Text>
          <Text style={styles.catalogItem}>
            Pro AI Tháng: <Text style={styles.catalogPrice}>{formatVnd(catalog?.pro.monthlyPriceVnd ?? 149000)}</Text>
          </Text>
          <Text style={styles.catalogItem}>
            Pro AI Năm: <Text style={styles.catalogPrice}>{formatVnd(catalog?.pro.yearlyPriceVnd ?? 1428000)}</Text>
          </Text>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.card}>
        <View style={styles.rowBetweenWrap}>
          <Text style={styles.cardTitle}>Danh sách gói khách hàng ({data?.total ?? 0})</Text>
          {q ? (
            <Pressable onPress={() => setQ('')}>
              <Text style={styles.clearLink}>Xóa tìm kiếm</Text>
            </Pressable>
          ) : null}
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Tìm tên khách hàng, email hoặc mã đơn..."
          placeholderTextColor={nihongoTheme.colors.textMuted}
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
            <ActivityIndicator color={nihongoTheme.colors.accent} />
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
                            : `${row.planName}`}
                      </Text>
                    </View>

                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>NGÀY ĐĂNG KÝ</Text>
                      <Text style={styles.metaValue}>
                        {row.tier === 'free'
                          ? formatDateShort(row.userCreatedAt)
                          : formatDateShort(row.startedAt)}
                      </Text>
                      <Text style={styles.metaHint}>
                        {row.tier === 'free'
                          ? 'Ngày tạo tài khoản'
                          : formatDateTimeShort(row.startedAt)}
                      </Text>
                    </View>

                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>NGÀY HẾT HẠN</Text>
                      <Text style={styles.metaValue}>
                        {row.tier === 'free'
                          ? '—'
                          : row.isLifetime
                            ? 'Không giới hạn'
                            : formatDateShort(row.expiresAt)}
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
        onRequestClose={() => setSelectedRow(null)}
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
              <Pressable onPress={() => setSelectedRow(null)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
              {/* Contract Summary */}
              {selectedRow ? (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Thông tin gói hiện tại</Text>
                  <View style={styles.contractGrid}>
                    <View style={styles.contractItem}>
                      <Text style={styles.metaLabel}>GÓI HIỆN TẠI</Text>
                      <Text style={styles.metaValue}>{selectedRow.planName}</Text>
                    </View>
                    <View style={styles.contractItem}>
                      <Text style={styles.metaLabel}>GIÁ NIÊM YẾT</Text>
                      <Text style={styles.metaValue}>
                        {selectedRow.tier === 'free'
                          ? '0đ'
                          : `${formatVnd(selectedRow.listPriceVnd)}/${
                              selectedRow.billingCycle === 'yearly' ? 'năm' : 'tháng'
                            }`}
                      </Text>
                    </View>
                    <View style={styles.contractItem}>
                      <Text style={styles.metaLabel}>NGÀY ĐĂNG KÝ</Text>
                      <Text style={styles.metaValue}>
                        {selectedRow.tier === 'free'
                          ? formatDateShort(selectedRow.userCreatedAt)
                          : formatDateTimeShort(selectedRow.startedAt)}
                      </Text>
                    </View>
                    <View style={styles.contractItem}>
                      <Text style={styles.metaLabel}>NGÀY HẾT HẠN</Text>
                      <Text style={styles.metaValue}>
                        {selectedRow.tier === 'free'
                          ? '—'
                          : selectedRow.isLifetime
                            ? 'Không giới hạn'
                            : formatDateShort(selectedRow.expiresAt)}
                      </Text>
                    </View>
                    <View style={styles.contractItem}>
                      <Text style={styles.metaLabel}>MÃ ĐƠN HIỆN TẠI</Text>
                      <Text style={styles.metaValue}>{selectedRow.currentOrderCode || '—'}</Text>
                    </View>
                    <View style={styles.contractItem}>
                      <Text style={styles.metaLabel}>TỔNG CHI TIÊU</Text>
                      <Text style={styles.metaValue}>
                        {formatVnd(selectedRow.totalPaidVnd)} ({selectedRow.paidOrderCount} đơn)
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Renew / Upgrade Form */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>Gia hạn hoặc Cấp / Đổi gói</Text>

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
                </View>

                <View style={styles.filterGroup}>
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
                  <Text style={styles.inputLabel}>Số ngày cấp thêm:</Text>
                  <TextInput
                    value={durationDaysInput}
                    onChangeText={(v) => setDurationDaysInput(v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={[styles.modalInput, { width: 110, textAlign: 'right' }]}
                  />
                </View>

                <Text style={styles.previewText}>
                  Hạn mới dự kiến: <Text style={styles.previewStrong}>{previewNewExpiryText}</Text>
                </Text>

                <View style={styles.rowBetween}>
                  <Text style={styles.mutedLabel}>Ghi nhận đơn vào sổ doanh thu</Text>
                  <Switch
                    value={recordOrder}
                    onValueChange={setRecordOrder}
                    trackColor={{ false: '#E4E4E7', true: nihongoTheme.colors.accent }}
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
                      placeholder="Ghi chú giao dịch (tùy chọn)..."
                      placeholderTextColor={nihongoTheme.colors.textMuted}
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
                  <Pressable
                    style={styles.downgradeBtn}
                    disabled={saving}
                    onPress={() => void handleSaveSubscription('free')}
                  >
                    <Text style={styles.downgradeBtnText}>Hạ về gói Miễn phí</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Payment History */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>
                  Lịch sử đơn hàng &amp; thanh toán ({detail?.orders.length ?? 0})
                </Text>
                {detailLoading ? (
                  <ActivityIndicator color={nihongoTheme.colors.accent} />
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
                              <View
                                style={[
                                  styles.pill,
                                  ord.isDemo ? styles.pillNeutral : styles.pillReal,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.pillText,
                                    ord.isDemo ? styles.pillNeutralText : styles.pillRealText,
                                  ]}
                                >
                                  {ord.isDemo ? 'Demo' : 'Đơn thật'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.metaHint}>
                              Gói {ord.tier.toUpperCase()} ({ord.billingCycle === 'yearly' ? 'Năm' : 'Tháng'}) ·{' '}
                              {PROVIDER_LABELS[ord.provider] ?? ord.provider} ·{' '}
                              {formatDateTimeShort(ord.paidAt ?? ord.createdAt)}
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
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiGridPhone: { gap: 8 },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 14,
    gap: 4,
  },
  kpiCardPhone: { minWidth: '47%' },
  kpiCardAccent: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: '#52525B' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#18181B' },
  kpiSub: { fontSize: 11, color: '#71717A' },
  catalogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  catalogTitle: { fontSize: 12, fontWeight: '800', color: '#52525B' },
  catalogRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  catalogItem: { fontSize: 12, color: '#52525B' },
  catalogPrice: { fontWeight: '800', color: '#18181B' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#18181B' },
  clearLink: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#18181B',
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
    borderRadius: 9999,
    backgroundColor: '#F4F4F5',
  },
  chipActive: { backgroundColor: nihongoTheme.colors.accent },
  chipDarkActive: { backgroundColor: '#18181B' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#52525B' },
  chipTextActive: { color: '#FFFFFF' },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#71717A', paddingVertical: 8 },
  listGap: { gap: 10 },
  subCard: {
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FAFAFA',
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
  userName: { fontSize: 14, fontWeight: '800', color: '#18181B' },
  userEmail: { fontSize: 12, color: '#52525B' },
  pill: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillNeutral: { backgroundColor: '#E4E4E7' },
  pillNeutralText: { color: '#52525B' },
  pillTier: { backgroundColor: '#FFF7ED' },
  pillTierText: { color: '#C25E00' },
  pillReal: { backgroundColor: '#EFF6FF' },
  pillRealText: { color: '#1D4ED8' },
  detailBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  detailBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    paddingTop: 10,
  },
  metaGridPhone: { gap: 10 },
  metaCell: { flex: 1, minWidth: 170, gap: 2 },
  metaLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: '#71717A' },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#18181B' },
  metaHint: { fontSize: 11, color: '#52525B' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 27, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 18,
    gap: 12,
  },
  closeText: { fontSize: 13, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  modalScroll: { maxHeight: 540 },
  modalBody: { gap: 12 },
  sectionBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#18181B' },
  contractGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  contractItem: { width: '47%', minWidth: 180, gap: 2 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#3F3F46' },
  mutedLabel: { fontSize: 12, fontWeight: '600', color: '#52525B', flex: 1 },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D8',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
    color: '#18181B',
  },
  previewText: { fontSize: 12, color: '#52525B' },
  previewStrong: { fontWeight: '800', color: '#1B873F' },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  downgradeBtn: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  downgradeBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  orderHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 10,
    padding: 10,
  },
  orderCode: { fontSize: 12, fontWeight: '800', color: '#18181B' },
  orderNote: { fontSize: 11, color: '#71717A', fontStyle: 'italic' },
  orderAmount: { fontSize: 13, fontWeight: '800', color: '#18181B' },
});
