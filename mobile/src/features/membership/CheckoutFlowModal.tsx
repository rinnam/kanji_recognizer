import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { ShieldCheckIcon } from '../../components/AppIcons';
import { nihongoTheme } from '../../theme/nihongo-theme';
import {
  confirmCheckout,
  initiateCheckout,
  type BillingCycle,
  type CheckoutOrderDto,
  type CheckoutProvider,
  type CheckoutReceiptDto,
  type MembershipSummaryDto,
  type PlanDefinitionDto,
  type SubscriptionTier,
} from './membership-store';

type CheckoutStep = 'review' | 'qr' | 'success';

const PAYMENT_CHANNELS: readonly {
  key: CheckoutProvider;
  label: string;
  sublabel: string;
}[] = [
  { key: 'bank_transfer', label: 'Chuyển khoản VietQR', sublabel: 'Hỗ trợ mọi ngân hàng 24/7' },
  { key: 'momo', label: 'Ví MoMo', sublabel: 'Quét mã qua ứng dụng MoMo' },
  { key: 'vnpay', label: 'VNPay QR', sublabel: 'Cổng thanh toán VNPay' },
];

const PROVIDER_LABELS: Record<string, string> = {
  bank_transfer: 'Chuyển khoản VietQR',
  momo: 'Ví MoMo',
  vnpay: 'VNPay QR',
};

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

function formatDateVn(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildQrMatrix(seedText: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const placeFinder = (row0: number, col0: number) => {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const rr = row0 + r;
        const cc = col0 + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr]![cc] = true;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          grid[rr]![cc] = false;
          continue;
        }
        const onOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const onInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[rr]![cc] = onOuter || onInner;
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i += 1) {
    reserved[6]![i] = true;
    grid[6]![i] = i % 2 === 0;
    reserved[i]![6] = true;
    grid[i]![6] = i % 2 === 0;
  }

  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (reserved[r]![c]) continue;
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      grid[r]![c] = ((state >>> 28) & 1) === 1;
    }
  }
  return grid;
}

function QrSvgCode({ seed }: { seed: string }) {
  const matrix = useMemo(() => buildQrMatrix(seed), [seed]);
  return (
    <Svg width={164} height={164} viewBox="0 0 21 21">
      <Rect x={0} y={0} width={21} height={21} fill="#FFFFFF" />
      {matrix.map((row, r) =>
        row.map((filled, c) =>
          filled ? <Rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#18181B" /> : null,
        ),
      )}
    </Svg>
  );
}

interface CheckoutFlowModalProps {
  visible: boolean;
  plan: PlanDefinitionDto | null;
  initialCycle: BillingCycle;
  currentTier: SubscriptionTier;
  onClose: () => void;
  onCompleted: (summary: MembershipSummaryDto, receipt: CheckoutReceiptDto) => void;
}

export function CheckoutFlowModal({
  visible,
  plan,
  initialCycle,
  currentTier,
  onClose,
  onCompleted,
}: CheckoutFlowModalProps) {
  const [step, setStep] = useState<CheckoutStep>('review');
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [provider, setProvider] = useState<CheckoutProvider>('bank_transfer');
  const [order, setOrder] = useState<CheckoutOrderDto | null>(null);
  const [receipt, setReceipt] = useState<CheckoutReceiptDto | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('review');
      setCycle(initialCycle);
      setProvider('bank_transfer');
      setOrder(null);
      setReceipt(null);
      setSecondsLeft(900);
      setBusy(false);
      setErrorMsg(null);
    }
  }, [visible, plan?.tier, initialCycle]);

  useEffect(() => {
    if (!visible || step !== 'qr' || !order) return;
    const holdMs = new Date(order.paymentHoldUntil).getTime();
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((holdMs - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [visible, step, order]);

  if (!plan || plan.tier === 'free') {
    return null;
  }

  const targetTier: 'plus' | 'pro' = plan.tier === 'pro' ? 'pro' : 'plus';
  const amountVnd = cycle === 'yearly' ? plan.yearlyPriceVnd : plan.monthlyPriceVnd;
  const durationDays = cycle === 'yearly' ? 365 : 30;
  const isRenew = currentTier === targetTier;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const handleProceedToQr = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const created = await initiateCheckout(targetTier, cycle, provider);
      setOrder(created);
      setStep('qr');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không khởi tạo được đơn thanh toán.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!order || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await confirmCheckout(order.id);
      setReceipt(res.receipt);
      setStep('success');
      onCompleted(res.summary, res.receipt);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Xác nhận thanh toán thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = step === 'review' ? 1 : step === 'qr' ? 2 : 3;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 3-Step Indicator */}
          <View style={styles.stepsRow}>
            {(
              [
                [1, '1. Chọn gói'],
                [2, '2. Quét mã QR'],
                [3, '3. Hoàn tất'],
              ] as const
            ).map(([idx, lbl]) => {
              const active = stepIndex === idx;
              const done = stepIndex > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.stepChip,
                    active && styles.stepChipActive,
                    done && styles.stepChipDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepChipText,
                      active && styles.stepChipTextActive,
                      done && styles.stepChipTextDone,
                    ]}
                  >
                    {lbl}
                  </Text>
                </View>
              );
            })}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {step === 'review' ? (
              <>
                <Text style={styles.title}>
                  {isRenew ? `Gia hạn gói ${plan.name}` : `Đăng ký gói ${plan.name}`}
                </Text>
                <Text style={styles.subtitle}>
                  Chọn chu kỳ và phương thức thanh toán phù hợp với bạn.
                </Text>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Chu kỳ thanh toán</Text>
                  <View style={styles.optionRow}>
                    {(
                      [
                        ['monthly', `1 tháng · ${formatVnd(plan.monthlyPriceVnd)}`],
                        ['yearly', `12 tháng · ${formatVnd(plan.yearlyPriceVnd)}`],
                      ] as const
                    ).map(([cKey, cLabel]) => {
                      const active = cycle === cKey;
                      return (
                        <Pressable
                          key={cKey}
                          style={[styles.choiceBtn, active && styles.choiceBtnActive]}
                          onPress={() => setCycle(cKey)}
                        >
                          <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                            {cLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Phương thức thanh toán</Text>
                  <View style={styles.channelList}>
                    {PAYMENT_CHANNELS.map((ch) => {
                      const active = provider === ch.key;
                      return (
                        <Pressable
                          key={ch.key}
                          style={[styles.channelCard, active && styles.channelCardActive]}
                          onPress={() => setProvider(ch.key)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.channelTitle, active && styles.channelTitleActive]}>
                              {ch.label}
                            </Text>
                            <Text style={styles.channelSub}>{ch.sublabel}</Text>
                          </View>
                          <View style={[styles.radioDot, active && styles.radioDotActive]} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.summaryRowBox}>
                  <Text style={styles.summaryRowLabel}>Thời hạn cộng thêm</Text>
                  <Text style={styles.summaryRowValue}>+{durationDays} ngày</Text>
                </View>
                <View style={styles.summaryRowBox}>
                  <Text style={styles.summaryRowLabel}>Tổng thanh toán</Text>
                  <Text style={styles.summaryRowPrice}>{formatVnd(amountVnd)}</Text>
                </View>
              </>
            ) : step === 'qr' && order ? (
              <>
                <View style={styles.qrHeader}>
                  <Text style={styles.title}>Quét mã QR thanh toán</Text>
                  <Text style={styles.timerBadge}>Giữ mã {mm}:{ss}</Text>
                </View>
                <Text style={styles.subtitle}>
                  Quét mã trên ứng dụng ngân hàng hoặc bấm Thanh toán ngay để kích hoạt gói tức thì.
                </Text>

                <View style={styles.qrFrame}>
                  <QrSvgCode seed={`${order.orderCode}|${order.amountVnd}|${order.provider}`} />
                  <Text style={styles.qrChannelBadge}>
                    {PROVIDER_LABELS[order.provider] ?? order.provider}
                  </Text>
                </View>

                <View style={styles.bankInfoBox}>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Ngân hàng / Ví</Text>
                    <Text style={styles.infoVal}>
                      {order.provider === 'bank_transfer'
                        ? order.bankName
                        : PROVIDER_LABELS[order.provider]}
                    </Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Chủ tài khoản</Text>
                    <Text style={styles.infoVal}>{order.accountHolder}</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Số tài khoản</Text>
                    <Text style={styles.infoVal}>{order.accountNumber}</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Số tiền</Text>
                    <Text style={styles.infoPrice}>{formatVnd(order.amountVnd)}</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Nội dung CK</Text>
                    <Text style={styles.infoCode}>{order.transferContent}</Text>
                  </View>
                </View>
              </>
            ) : receipt ? (
              <>
                <View style={styles.successHeader}>
                  <ShieldCheckIcon size={36} color={nihongoTheme.colors.successText} />
                  <Text style={styles.successTitle}>Thanh toán thành công!</Text>
                  <Text style={styles.subtitle}>
                    Gói {receipt.planName} đã được kích hoạt cho tài khoản của bạn.
                  </Text>
                </View>

                <View style={styles.receiptBox}>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Mã hóa đơn</Text>
                    <Text style={styles.infoVal}>{receipt.orderCode}</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Gói sử dụng</Text>
                    <Text style={styles.infoVal}>
                      {receipt.planName} ({receipt.billingCycle === 'yearly' ? '12 tháng' : '1 tháng'})
                    </Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Phương thức</Text>
                    <Text style={styles.infoVal}>
                      {PROVIDER_LABELS[receipt.provider] ?? receipt.provider}
                    </Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Đã thanh toán</Text>
                    <Text style={styles.infoPrice}>{formatVnd(receipt.amountVnd)}</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Ngày hiệu lực</Text>
                    <Text style={styles.infoVal}>{formatDateVn(receipt.startedAt)}</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoKey}>Hạn sử dụng đến</Text>
                    <Text style={[styles.infoVal, { color: nihongoTheme.colors.successText }]}>
                      {formatDateVn(receipt.expiresAt)}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.actionsRow}>
            {step === 'review' ? (
              <>
                <Pressable style={styles.cancelBtn} disabled={busy} onPress={onClose}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmBtn}
                  disabled={busy}
                  onPress={() => void handleProceedToQr()}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmText}>Tiếp tục thanh toán →</Text>
                  )}
                </Pressable>
              </>
            ) : step === 'qr' ? (
              <>
                <Pressable
                  style={styles.cancelBtn}
                  disabled={busy}
                  onPress={() => {
                    setStep('review');
                    setErrorMsg(null);
                  }}
                >
                  <Text style={styles.cancelText}>← Đổi phương thức</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmBtn}
                  disabled={busy}
                  onPress={() => void handleConfirmPaid()}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmText}>Thanh toán ngay</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.confirmBtn} onPress={onClose}>
                <Text style={styles.confirmText}>Hoàn tất &amp; Bắt đầu học</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    gap: 12,
    ...nihongoTheme.shadow.dock,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepChip: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: 9999,
    paddingVertical: 6,
    alignItems: 'center',
  },
  stepChipActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
  },
  stepChipDone: {
    backgroundColor: nihongoTheme.colors.successBg,
  },
  stepChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  stepChipTextActive: {
    color: nihongoTheme.colors.accentHover,
  },
  stepChipTextDone: {
    color: nihongoTheme.colors.successText,
  },
  body: {
    gap: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: nihongoTheme.colors.textSecondary,
  },
  sectionBox: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  choiceBtnActive: {
    borderColor: nihongoTheme.colors.accent,
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  choiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  choiceTextActive: {
    color: nihongoTheme.colors.accentHover,
  },
  channelList: {
    gap: 8,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  channelCardActive: {
    borderColor: nihongoTheme.colors.accent,
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  channelTitleActive: {
    color: nihongoTheme.colors.accentHover,
  },
  channelSub: {
    fontSize: 11,
    color: nihongoTheme.colors.textMuted,
  },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: nihongoTheme.colors.textMuted,
  },
  radioDotActive: {
    borderColor: nihongoTheme.colors.accent,
    backgroundColor: nihongoTheme.colors.accent,
  },
  summaryRowBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
  },
  summaryRowLabel: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '600',
  },
  summaryRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  summaryRowPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timerBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.warningText,
    backgroundColor: nihongoTheme.colors.warningBg,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  qrFrame: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  qrChannelBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  bankInfoBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    padding: 12,
    gap: 7,
  },
  receiptBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  infoKey: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'right',
  },
  infoPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  infoCode: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  successHeader: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.successText,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: nihongoTheme.radius.button,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
