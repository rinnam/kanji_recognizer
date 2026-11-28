import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppShell } from '../src/components/AppShell';
import { TopHeader } from '../src/components/TopHeader';
import { CoinKsIcon, CrownIcon, InfoCircleIcon, LockClosedIcon, ShieldCheckIcon } from '../src/components/AppIcons';
import { nihongoTheme } from '../src/theme/nihongo-theme';
import { CheckoutFlowModal } from '../src/features/membership/CheckoutFlowModal';
import {
  claimDailyGoal,
  claimStreakMilestone,
  redeemShopItem,
  useMembership,
  type BillingCycle,
  type PlanDefinitionDto,
  type ShopItemDto,
  type SubscriptionTier,
} from '../src/features/membership/membership-store';
import { useIsMobilePhone } from '../src/utils/device';

const SCENARIO_LABELS: Record<string, string> = {
  roleplay_restaurant: 'Nhà hàng Nhật (N5–N4)',
  roleplay_clinic: 'Khám bệnh Shinjuku (N4–N3)',
  roleplay_horenso: 'Họp Horenso (N3–N2)',
  baito: 'Phỏng vấn Baito (N4–N3)',
  study_abroad: 'Phỏng vấn Du học (N4–N3)',
  it_engineer: 'Phỏng vấn Kỹ sư IT (N3–N2)',
};

function formatVnd(amount: number): string {
  if (amount <= 0) return '0đ';
  return `${amount.toLocaleString('vi-VN')}đ`;
}

export default function BillingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isPhone = useIsMobilePhone();
  const { summary, tier, ksBalance, refresh } = useMembership();

  const [activeTab, setActiveTab] = useState<'plans' | 'shop'>(
    params.tab === 'shop' ? 'shop' : 'plans',
  );
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [checkoutTarget, setCheckoutTarget] = useState<PlanDefinitionDto | null>(null);
  const [antiAfkModalOpen, setAntiAfkModalOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<Record<string, string>>({
    ticket_life: 'roleplay_restaurant',
    ticket_work: 'roleplay_horenso',
    combo_life_4: 'roleplay_restaurant',
  });

  useEffect(() => {
    if (params.tab === 'shop') setActiveTab('shop');
    else if (params.tab === 'plans') setActiveTab('plans');
  }, [params.tab]);

  useEffect(() => {
    void refresh();
  }, []);

  const handleRedeem = async (item: ShopItemDto) => {
    if (busyAction) return;
    const scenarioId =
      item.allowedScenarios.length > 0
        ? selectedScenarios[item.code] ?? item.allowedScenarios[0] ?? 'roleplay_restaurant'
        : '';
    setBusyAction(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      await redeemShopItem(item.code, scenarioId);
      setNotice(
        item.unlockType === 'plus_trial_7d'
          ? 'Kích hoạt thành công Thẻ Dùng Thử Gói Plus 7 ngày bằng Xu KS! Toàn bộ quyền lợi Plus đã mở.'
          : `Đã đổi thành công "${item.title}" cho ${SCENARIO_LABELS[scenarioId] || scenarioId}! Vào Luyện nói 3D để sử dụng ngay.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Đổi Xu KS thất bại.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleClaimGoal = async () => {
    if (busyAction) return;
    setBusyAction(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const res = await claimDailyGoal();
      setNotice(
        res.applied
          ? `Tuyệt vời! Bạn đã nhận +${res.delta} Xu KS từ mục tiêu ${summary.todayGoalStatus.goalMinutes} phút hôm nay.`
          : 'Bạn đã nhận thưởng mục tiêu hôm nay rồi.',
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Chưa đủ điều kiện nhận thưởng.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleClaimStreak = async (days: 3 | 7 | 14 | 30) => {
    if (busyAction) return;
    setBusyAction(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const res = await claimStreakMilestone(days);
      setNotice(
        res.applied
          ? `Chúc mừng chuỗi ${days} ngày liên tiếp! Bạn nhận được +${res.delta} Xu KS.`
          : 'Mốc chuỗi này đã được nhận trước đó.',
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không nhận được thưởng chuỗi.');
    } finally {
      setBusyAction(false);
    }
  };

  const tierColors: Record<SubscriptionTier, { bg: string; border: string; text: string }> = {
    free: { bg: '#F7F3EE', border: nihongoTheme.colors.borderWarm, text: nihongoTheme.colors.textSecondary },
    plus: { bg: '#FFF7ED', border: '#F59E0B', text: '#C25E00' },
    pro: { bg: '#FFF0DF', border: nihongoTheme.colors.accent, text: nihongoTheme.colors.accentHover },
  };

  const activePlanDef = summary.plans.find((p) => p.tier === tier);
  const activePlanPrice =
    tier === 'free' || !activePlanDef
      ? '0đ'
      : summary.subscription.billingCycle === 'yearly'
        ? `${formatVnd(activePlanDef.yearlyPriceVnd)}/năm`
        : `${formatVnd(activePlanDef.monthlyPriceVnd)}/tháng`;
  const subExpiryDate = summary.subscription.expiresAt
    ? new Date(summary.subscription.expiresAt)
    : null;
  const isLifetimeSub =
    !subExpiryDate || Number.isNaN(subExpiryDate.getTime()) || subExpiryDate.getUTCFullYear() >= 2090;
  const remainingDays =
    subExpiryDate && !isLifetimeSub
      ? Math.max(0, Math.ceil((subExpiryDate.getTime() - Date.now()) / 86_400_000))
      : null;

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Gói sử dụng & Xu Kanji Smart"
        subtitle={isPhone ? undefined : 'Gói học & Cửa hàng đổi Xu Kanji Smart'}
      />

      {/* Top Account Membership + Wallet Strip */}
      <View style={[styles.summaryStrip, isPhone && styles.summaryStripPhone]}>
        <View style={[styles.summaryLeft, !isPhone && styles.summaryLeftWide]}>
          <View style={styles.tierRow}>
            <View
              style={[
                styles.tierPill,
                {
                  backgroundColor: tierColors[tier].bg,
                  borderColor: tierColors[tier].border,
                },
              ]}
            >
              <CrownIcon size={14} color={tierColors[tier].text} />
              <Text style={[styles.tierPillText, { color: tierColors[tier].text }]}>
                {summary.subscription.planName}
              </Text>
            </View>
            <View style={styles.multPill}>
              <Text style={styles.multPillText}>Hệ số Xu: ×{summary.subscription.multiplier}</Text>
            </View>
          </View>
          <Text style={styles.summaryMeta}>
            {tier === 'free'
              ? 'Nâng cấp gói Plus hoặc Pro AI để mở Luyện nói 3D & tăng tốc tích Xu KS.'
              : [
                  `Giá ${activePlanPrice}`,
                  summary.subscription.startedAt
                    ? `ĐK ${new Date(summary.subscription.startedAt).toLocaleDateString('vi-VN')}`
                    : null,
                  isLifetimeSub
                    ? 'Hạn: Không giới hạn'
                    : `Hạn ${subExpiryDate.toLocaleDateString('vi-VN')} (còn ${remainingDays} ngày)`,
                  summary.subscription.demoOrderCode
                    ? `Mã ${summary.subscription.demoOrderCode}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </Text>
        </View>

        <View style={[styles.walletBox, isPhone && styles.walletBoxPhone]}>
          <View style={styles.walletValRow}>
            <CoinKsIcon size={20} color={nihongoTheme.colors.accentHover} />
            <Text style={styles.walletValue}>{ksBalance.toLocaleString('vi-VN')} KS</Text>
          </View>
          <Text style={styles.walletLabel}>Xu Kanji Smart</Text>
        </View>
      </View>

      {notice ? (
        <View style={styles.noticeBox}>
          <ShieldCheckIcon size={16} color={nihongoTheme.colors.successText} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Main Switch Tabs */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'plans' && styles.tabBtnActive]}
          onPress={() => setActiveTab('plans')}
        >
          <Text style={[styles.tabText, activeTab === 'plans' && styles.tabTextActive]}>
            Gói sử dụng (Free · Plus · Pro)
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'shop' && styles.tabBtnActive]}
          onPress={() => setActiveTab('shop')}
        >
          <Text style={[styles.tabText, activeTab === 'shop' && styles.tabTextActive]}>
            Kiếm &amp; Đổi Xu KS ({ksBalance.toLocaleString('vi-VN')} KS)
          </Text>
        </Pressable>
      </View>

      {activeTab === 'plans' ? (
        <View style={styles.sectionGap}>
          {/* Billing Cycle Toggle */}
          <View style={styles.cycleRow}>
            <Pressable
              style={[styles.cycleBtn, cycle === 'monthly' && styles.cycleBtnActive]}
              onPress={() => setCycle('monthly')}
            >
              <Text style={[styles.cycleText, cycle === 'monthly' && styles.cycleTextActive]}>
                Theo tháng
              </Text>
            </Pressable>
            <Pressable
              style={[styles.cycleBtn, cycle === 'yearly' && styles.cycleBtnActive]}
              onPress={() => setCycle('yearly')}
            >
              <Text style={[styles.cycleText, cycle === 'yearly' && styles.cycleTextActive]}>
                Theo năm (Tiết kiệm 25%)
              </Text>
            </Pressable>
          </View>

          {/* 3 Plan Cards */}
          <View style={[styles.plansGrid, isWide && styles.plansGridWide]}>
            {summary.plans.map((plan) => {
              const isCurrent = plan.tier === tier;
              const isPro = plan.tier === 'pro';
              const displayPrice =
                plan.tier === 'free'
                  ? '0đ'
                  : cycle === 'yearly'
                    ? `${formatVnd(plan.yearlyPerMonthVnd)}/tháng`
                    : `${formatVnd(plan.monthlyPriceVnd)}/tháng`;
              const subPrice =
                plan.tier === 'free'
                  ? 'Miễn phí trọn đời'
                  : cycle === 'yearly'
                    ? `Thanh toán ${formatVnd(plan.yearlyPriceVnd)} / 12 tháng`
                    : 'Gia hạn linh hoạt từng tháng';
              const isIncluded =
                (tier === 'pro' && plan.tier === 'plus') ||
                (plan.tier === 'free' && tier !== 'free');
              const isLifetimeCurrent = isCurrent && isLifetimeSub;
              const canRenewCurrent = isCurrent && !isLifetimeSub && plan.tier !== 'free';
              const btnDisabled =
                isLifetimeCurrent || isIncluded || plan.tier === 'free' || busyAction;

              return (
                <View
                  key={plan.tier}
                  style={[
                    styles.planCard,
                    isWide && styles.planCardWide,
                    isPro && styles.planCardPro,
                    isCurrent && styles.planCardCurrent,
                  ]}
                >
                  <View style={styles.planTopRow}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {isPro ? (
                      <View style={styles.proTag}>
                        <Text style={styles.proTagText}>Full AI Speaking</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.planTagline}>{plan.tagline}</Text>

                  <View style={styles.priceBox}>
                    <Text style={styles.priceMain}>{displayPrice}</Text>
                    <Text style={styles.priceSub}>{subPrice}</Text>
                  </View>

                  <View style={[styles.highlightsList, isWide && styles.highlightsListWide]}>
                    {plan.highlights.map((line) => (
                      <View key={line} style={styles.highlightRow}>
                        <Text style={styles.highlightBullet}>•</Text>
                        <Text style={styles.highlightText}>{line}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    style={[
                      styles.planBtn,
                      isPro && styles.planBtnPro,
                      btnDisabled && styles.planBtnDisabled,
                    ]}
                    disabled={btnDisabled}
                    onPress={() => {
                      if (plan.tier !== 'free') {
                        setErrorMsg(null);
                        setCheckoutTarget(plan);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.planBtnText,
                        btnDisabled && styles.planBtnTextDisabled,
                      ]}
                    >
                      {isLifetimeCurrent || (plan.tier === 'free' && tier === 'free')
                        ? 'Đang sử dụng gói này'
                        : canRenewCurrent
                          ? 'Gia hạn thêm gói này'
                          : isIncluded
                            ? 'Đã bao gồm trong gói hiện tại'
                            : tier === 'plus' && plan.tier === 'pro'
                              ? `Nâng cấp ${plan.name}`
                              : `Đăng ký ${plan.name}`}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.sectionGap}>
          {/* Earn KS Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cách kiếm Xu Kanji Smart (KS)</Text>
            <Text style={styles.cardDesc}>
              Hoàn thành mục tiêu học mỗi ngày để tích lũy Xu KS.
            </Text>

            <View style={[styles.earnGrid, isWide && styles.earnGridWide]}>
              <View style={[styles.earnBox, isWide && styles.earnBoxWide]}>
                <Text style={styles.earnHeading}>Mục tiêu hôm nay ({summary.todayGoalStatus.goalMinutes} phút)</Text>
                <Text style={styles.earnProgress}>
                  Hôm nay: {Math.floor(summary.todayGoalStatus.todaySeconds / 60)}/{summary.todayGoalStatus.goalMinutes} phút · Thưởng: +{summary.todayGoalStatus.rewardKs} KS
                </Text>
                <Pressable
                  style={[
                    styles.claimSmallBtn,
                    (!summary.todayGoalStatus.eligible || summary.todayGoalStatus.claimed) &&
                      styles.claimSmallBtnDisabled,
                  ]}
                  disabled={!summary.todayGoalStatus.eligible || summary.todayGoalStatus.claimed || busyAction}
                  onPress={() => void handleClaimGoal()}
                >
                  <Text
                    style={[
                      styles.claimSmallBtnText,
                      (!summary.todayGoalStatus.eligible || summary.todayGoalStatus.claimed) &&
                        styles.claimSmallBtnTextDisabled,
                    ]}
                  >
                    {summary.todayGoalStatus.claimed
                      ? '✓ Đã nhận thưởng hôm nay'
                      : summary.todayGoalStatus.eligible
                        ? `Nhận ngay +${summary.todayGoalStatus.rewardKs} KS`
                        : 'Chưa đủ 100% thời gian học'}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.earnBox, isWide && styles.earnBoxWide]}>
                <Text style={styles.earnHeading}>Thử thách hôm nay (5 câu)</Text>
                <Text style={styles.earnRule}>
                  Hoàn thành 5 câu hỏi nhanh mỗi ngày (tới +{Math.round(30 * summary.subscription.multiplier)} KS).
                </Text>
                <Text style={styles.earnProgress}>
                  Hôm nay: {summary.todayChallengeClaimed ? '✓ Đã hoàn thành & nhận Xu' : 'Chưa làm hôm nay'}
                </Text>
                <Pressable
                  style={[
                    styles.outlineSmallBtn,
                    summary.todayChallengeClaimed && styles.claimSmallBtnDisabled,
                  ]}
                  disabled={summary.todayChallengeClaimed}
                  onPress={() => router.push('/app')}
                >
                  <Text
                    style={[
                      styles.outlineSmallBtnText,
                      summary.todayChallengeClaimed && styles.claimSmallBtnTextDisabled,
                    ]}
                  >
                    {summary.todayChallengeClaimed ? '✓ Đã hoàn thành hôm nay' : 'Về Trang chủ làm Thử thách →'}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.earnBox, isWide && styles.earnBoxWide]}>
                <Text style={styles.earnHeading}>Game học tập (Tối đa 3 game/ngày)</Text>
                <Text style={styles.earnRule}>
                  Thắng mỗi lượt game nhận +{Math.round(5 * summary.subscription.multiplier)} KS (tối đa{' '}
                  {summary.dailyGameRewardCap ?? 3} lượt/ngày).
                </Text>
                <Text style={styles.earnProgress}>
                  Đã nhận hôm nay: {summary.todayGameRewardsClaimed ?? 0}/{summary.dailyGameRewardCap ?? 3} lượt game
                </Text>
                <Pressable style={styles.outlineSmallBtn} onPress={() => router.push('/games')}>
                  <Text style={styles.outlineSmallBtnText}>Vào Trung tâm Game →</Text>
                </Pressable>
              </View>
            </View>

            {/* Streak Milestones */}
            <Text style={[styles.earnHeading, { marginTop: 8 }]}>
              Mốc chuỗi liên tiếp (Hiện tại: {summary.streakStatus.currentStreak} ngày)
            </Text>
            <View style={[styles.milestoneRow, isWide && styles.milestoneRowWide]}>
              {summary.streakStatus.milestones.map((m) => (
                <Pressable
                  key={m.days}
                  style={[
                    styles.milestoneCard,
                    isWide ? styles.milestoneCardWide : styles.milestoneCardCompact,
                    m.status === 'claimable' && styles.milestoneClaimable,
                    m.status === 'claimed' && styles.milestoneClaimed,
                  ]}
                  disabled={m.status !== 'claimable' || busyAction}
                  onPress={() => void handleClaimStreak(m.days as 3 | 7 | 14 | 30)}
                >
                  <Text style={styles.milestoneDays}>{m.days} ngày</Text>
                  <Text style={styles.milestoneReward}>+{m.rewardKs} KS</Text>
                  <Text style={styles.milestoneState}>
                    {m.status === 'claimed'
                      ? '✓ Đã nhận'
                      : m.status === 'claimable'
                        ? 'Bấm nhận!'
                        : 'Chưa đạt'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.antiAfkNote}>
              <View style={styles.antiAfkLeft}>
                <ShieldCheckIcon size={15} color={nihongoTheme.colors.successText} />
                <Text style={styles.antiAfkNoteText} numberOfLines={1}>
                  Chỉ tính giờ học thực trên hệ thống (Anti-AFK)
                </Text>
              </View>
              <Pressable style={styles.antiAfkInfoBtn} onPress={() => setAntiAfkModalOpen(true)}>
                <InfoCircleIcon size={14} color={nihongoTheme.colors.successText} />
                <Text style={styles.antiAfkInfoText}>Chi tiết</Text>
              </Pressable>
            </View>
          </View>

          {/* Redeem Shop Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cửa hàng đổi Xu KS</Text>
            <Text style={styles.cardDesc}>
              Dùng Xu KS tích lũy để đổi vé Luyện nói 3D hoặc dùng thử gói Plus 7 ngày.
            </Text>

            <View style={[styles.shopGrid, isWide && styles.shopGridWide]}>
              {summary.shopItems.map((item) => {
                const hasScenarios = item.allowedScenarios.length > 0;
                const selectedScenario =
                  selectedScenarios[item.code] ?? item.allowedScenarios[0] ?? 'roleplay_restaurant';
                const canAfford = ksBalance >= item.costKs;
                const isTrial = item.code === 'trial_plus_7d';
                const trialBlockedReason = isTrial
                  ? summary.trialPlusClaimed
                    ? '✓ Đã dùng suất 1 lần/tài khoản'
                    : tier !== 'free'
                      ? 'Bạn đang dùng gói Plus / Pro'
                      : null
                  : null;
                const isDisabled = !canAfford || busyAction || Boolean(trialBlockedReason);
                return (
                  <View key={item.code} style={[styles.shopCard, isWide && styles.shopCardWide]}>
                    <View style={styles.shopTop}>
                      <Text style={styles.shopTitle}>{item.title}</Text>
                      <View style={styles.costBadge}>
                        <CoinKsIcon size={13} color={nihongoTheme.colors.accentHover} />
                        <Text style={styles.costText}>{item.costKs.toLocaleString('vi-VN')} KS</Text>
                      </View>
                    </View>
                    <Text style={styles.shopDesc}>{item.description}</Text>

                    {hasScenarios ? (
                      <>
                        <Text style={styles.chooseLabel}>Chọn kịch bản áp dụng:</Text>
                        <View style={styles.scenarioPickRow}>
                          {item.allowedScenarios.map((sid) => {
                            const active = selectedScenario === sid;
                            return (
                              <Pressable
                                key={sid}
                                style={[styles.pickChip, active && styles.pickChipActive]}
                                onPress={() =>
                                  setSelectedScenarios((prev) => ({ ...prev, [item.code]: sid }))
                                }
                              >
                                <Text style={[styles.pickChipText, active && styles.pickChipTextActive]}>
                                  {SCENARIO_LABELS[sid] || sid}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    ) : null}

                    <Pressable
                      style={[
                        styles.redeemBtn,
                        isDisabled && styles.redeemBtnDisabled,
                      ]}
                      disabled={isDisabled}
                      onPress={() => void handleRedeem(item)}
                    >
                      <Text style={styles.redeemBtnText}>
                        {trialBlockedReason
                          ? trialBlockedReason
                          : canAfford
                            ? `Đổi ${item.costKs.toLocaleString('vi-VN')} KS ngay`
                            : `Thiếu ${(item.costKs - ksBalance).toLocaleString('vi-VN')} KS`}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}

              {/* Pro Exclusive Card */}
              <View style={[styles.shopCard, isWide && styles.shopCardWide, styles.proLockedShopCard]}>
                <View style={styles.shopTop}>
                  <Text style={styles.shopTitle}>Phỏng vấn Kỹ sư IT 3D (6 chặng) + Upload CV thật</Text>
                  <LockClosedIcon size={18} color={nihongoTheme.colors.accentHover} />
                </View>
                <Text style={styles.shopDesc}>
                  Hội đồng hỏi xoáy CV PDF/Ảnh thật, chấm theo chuẩn PREP/STAR, bắt lỗi từ đệm tiếng Nhật &amp; mở không giới hạn mọi tình huống.
                </Text>
                <Text style={styles.proOnlyWarn}>
                  Không mở bằng Xu KS — Độc quyền dành riêng cho thành viên gói Pro AI.
                </Text>
                <Pressable style={styles.proJumpBtn} onPress={() => setActiveTab('plans')}>
                  <Text style={styles.proJumpBtnText}>Xem gói Pro AI →</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Active Unlocks + Ledger History */}
          {summary.unlocks.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Vé &amp; Quyền Nói 3D đang có</Text>
              <View style={styles.listGap}>
                {summary.unlocks.map((u) => (
                  <View key={u.id} style={styles.txRow}>
                    <Text style={styles.txTitle}>{SCENARIO_LABELS[u.scenarioId] || u.scenarioId}</Text>
                    <Text style={styles.txMeta}>
                      {u.unlockType === 'single_ticket'
                        ? `Vé lẻ (${u.remainingUses ?? 1} lượt)`
                        : u.unlockType === 'pass_7d'
                          ? `Thẻ 7 ngày (đến ${u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('vi-VN') : ''})`
                          : 'Mở vĩnh viễn (1 lượt/tuần)'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lịch sử Xu Kanji Smart gần đây</Text>
            {summary.recentTransactions.length === 0 ? (
              <Text style={styles.cardDesc}>
                Chưa có giao dịch Xu KS nào. Hoàn thành mục tiêu ngày, Thử thách hôm nay hoặc mốc Streak để nhận Xu đầu tiên!
              </Text>
            ) : (
              <View style={styles.listGap}>
                {summary.recentTransactions.map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={styles.txLeft}>
                      <Text style={styles.txTitle}>{tx.description}</Text>
                      <Text style={styles.txMeta}>
                        {new Date(tx.createdAt).toLocaleString('vi-VN')} · Số dư sau:{' '}
                        {tx.balanceAfter.toLocaleString('vi-VN')} KS
                      </Text>
                    </View>
                    <Text style={[styles.txDelta, tx.delta >= 0 ? styles.txPlus : styles.txMinus]}>
                      {tx.delta >= 0 ? `+${tx.delta}` : tx.delta} KS
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      <CheckoutFlowModal
        visible={Boolean(checkoutTarget)}
        plan={checkoutTarget}
        initialCycle={cycle}
        currentTier={tier}
        onClose={() => setCheckoutTarget(null)}
        onCompleted={(_updatedSummary, receipt) => {
          setNotice(
            `Thanh toán thành công gói ${receipt.planName} (Mã đơn: ${receipt.orderCode})!`,
          );
        }}
      />

      {/* Anti-AFK Rules Detail Modal */}
      <Modal
        visible={antiAfkModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAntiAfkModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAntiAfkModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalBadge}>CHỐNG TREO MÁY (ANTI-AFK)</Text>
            <Text style={styles.modalTitle}>Cách hệ thống tính giờ học thực</Text>
            <View style={styles.afkBulletList}>
              <Text style={styles.afkBullet}>
                • Chỉ tính thời gian khi bạn đang học trực tiếp trên các màn hình Flashcard, Bài học, Tra cứu, Nghe/Đọc/Viết/Nói hoặc Game.
              </Text>
              <Text style={styles.afkBullet}>
                • Tự động tạm dừng nếu màn hình không có tương tác hoặc bạn rời khỏi bài học.
              </Text>
              <Text style={styles.afkBullet}>
                • Xác nhận tỉnh táo định kỳ để đảm bảo tiến độ và Xu KS được ghi nhận công bằng.
              </Text>
            </View>
            <Pressable style={styles.modalConfirmBtn} onPress={() => setAntiAfkModalOpen(false)}>
              <Text style={styles.modalConfirmText}>Đã hiểu</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summaryStrip: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    ...nihongoTheme.shadow.card,
  },
  summaryStripPhone: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  summaryLeft: {
    gap: 8,
  },
  summaryLeftWide: {
    flex: 1,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tierPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  multPill: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  multPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  summaryMeta: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 19,
  },
  walletBox: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-end',
    gap: 3,
  },
  walletBoxPhone: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  walletValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletValue: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.successText,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabBtnActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sectionGap: {
    gap: 14,
  },
  cycleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  cycleBtnActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderColor: nihongoTheme.colors.accent,
  },
  cycleText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  cycleTextActive: {
    color: nihongoTheme.colors.accentHover,
  },
  plansGrid: {
    gap: 14,
  },
  plansGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  planCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  planCardWide: {
    flex: 1,
  },
  planCardPro: {
    borderColor: nihongoTheme.colors.accent,
    borderWidth: 2,
  },
  planCardCurrent: {
    backgroundColor: '#FFFCF8',
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  proTag: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  proTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  planTagline: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  priceBox: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
  },
  priceMain: {
    fontSize: 22,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  priceSub: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
    marginTop: 2,
  },
  highlightsList: {
    gap: 6,
  },
  highlightsListWide: {
    flexGrow: 1,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  highlightBullet: {
    color: nihongoTheme.colors.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: nihongoTheme.colors.textPrimary,
  },
  planBtn: {
    marginTop: 8,
    backgroundColor: nihongoTheme.colors.textPrimary,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  planBtnPro: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  planBtnDisabled: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  planBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  planBtnTextDisabled: {
    color: nihongoTheme.colors.textMuted,
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: nihongoTheme.colors.textSecondary,
  },
  earnGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  earnGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  earnBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    gap: 7,
  },
  earnBoxWide: {
    flex: 1,
    justifyContent: 'space-between',
  },
  earnHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  earnRule: {
    fontSize: 12,
    lineHeight: 18,
    color: nihongoTheme.colors.textSecondary,
  },
  earnProgress: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  claimSmallBtn: {
    marginTop: 4,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  claimSmallBtnDisabled: {
    backgroundColor: '#E8E0D8',
  },
  claimSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  claimSmallBtnTextDisabled: {
    color: '#6E6055',
  },
  outlineSmallBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  outlineSmallBtnText: {
    color: nihongoTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  milestoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  milestoneRowWide: {
    flexWrap: 'nowrap',
    gap: 10,
  },
  milestoneCard: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  milestoneCardCompact: {
    width: '48.2%',
  },
  milestoneCardWide: {
    flex: 1,
  },
  milestoneClaimable: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderColor: nihongoTheme.colors.accent,
  },
  milestoneClaimed: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderColor: nihongoTheme.colors.successText,
  },
  milestoneDays: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  milestoneReward: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  milestoneState: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  antiAfkNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  antiAfkLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  antiAfkNoteText: {
    flexShrink: 1,
    fontSize: 12,
    color: nihongoTheme.colors.successText,
    fontWeight: '700',
  },
  antiAfkInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  antiAfkInfoText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: nihongoTheme.colors.successText,
  },
  afkBulletList: {
    gap: 8,
  },
  afkBullet: {
    fontSize: 13,
    lineHeight: 19,
    color: nihongoTheme.colors.textSecondary,
  },
  shopGrid: {
    gap: 12,
  },
  shopGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  shopCard: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  shopCardWide: {
    width: '48.8%',
  },
  proLockedShopCard: {
    backgroundColor: '#FFF7ED',
    borderColor: nihongoTheme.colors.accent,
  },
  shopTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  shopTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  costText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  shopDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: nihongoTheme.colors.textSecondary,
  },
  effortText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  chooseLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    marginTop: 2,
  },
  scenarioPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pickChipActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  pickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  pickChipTextActive: {
    color: '#FFFFFF',
  },
  redeemBtn: {
    marginTop: 4,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  redeemBtnDisabled: {
    backgroundColor: '#D6CFC7',
  },
  redeemBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  proOnlyWarn: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  proJumpBtn: {
    marginTop: 'auto',
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  proJumpBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  listGap: {
    gap: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
  },
  txLeft: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  txMeta: {
    fontSize: 11,
    color: nihongoTheme.colors.textMuted,
  },
  txDelta: {
    fontSize: 14,
    fontWeight: '800',
  },
  txPlus: {
    color: nihongoTheme.colors.successText,
  },
  txMinus: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 30, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 22,
    gap: 12,
    ...nihongoTheme.shadow.dock,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: nihongoTheme.colors.accentSoft,
    color: nihongoTheme.colors.accentHover,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: nihongoTheme.colors.textSecondary,
  },
  qrMockBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  qrMockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    letterSpacing: 0.4,
  },
  qrMockCode: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  qrMockNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: nihongoTheme.colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: nihongoTheme.radius.button,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: '#FFFFFF',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
