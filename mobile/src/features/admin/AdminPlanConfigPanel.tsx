import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { SubscriptionTier } from '../lessons/lessons-api';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminSwitch } from './AdminSwitch';
import { adminTheme, formatVnd } from './admin-theme';
import {
  fetchAdminPlans,
  resetAdminPlan,
  updateAdminPlan,
  type AdminPlanDefinition,
} from './admin-api';

type QuotaKey =
  | 'shadowingCustomPerDay'
  | 'readingPerWeek'
  | 'writingPerWeek'
  | 'speakingLifePerDay'
  | 'speakingWorkPerDay';

const QUOTA_FIELDS: readonly { key: QuotaKey; label: string }[] = [
  { key: 'shadowingCustomPerDay', label: 'Shadowing link tự dán / ngày' },
  { key: 'readingPerWeek', label: 'Luyện đọc AI / tuần' },
  { key: 'writingPerWeek', label: 'Luyện viết AI / tuần' },
  { key: 'speakingLifePerDay', label: 'Nói 3D Đời sống / ngày' },
  { key: 'speakingWorkPerDay', label: 'Nói 3D Công sở & PV / ngày' },
];

const FEATURE_FLAGS: readonly {
  key: 'itEngineerAllowed' | 'uploadCvAllowed' | 'fullRubricAllowed';
  label: string;
}[] = [
  { key: 'itEngineerAllowed', label: 'Phỏng vấn Kỹ sư IT 3D (6 chặng)' },
  { key: 'uploadCvAllowed', label: 'Upload CV (PDF / Ảnh)' },
  { key: 'fullRubricAllowed', label: 'Chấm điểm chuẩn Nhật (PREP / STAR / HORENSO)' },
];

interface PlanFormDraft {
  name: string;
  tagline: string;
  monthlyPriceInput: string;
  yearlyPriceInput: string;
  multiplierInput: string;
  quotas: Record<QuotaKey, number | null>;
  flags: {
    itEngineerAllowed: boolean;
    uploadCvAllowed: boolean;
    fullRubricAllowed: boolean;
  };
  highlightsText: string;
}

function planToDraft(plan: AdminPlanDefinition): PlanFormDraft {
  return {
    name: plan.name,
    tagline: plan.tagline,
    monthlyPriceInput: String(plan.monthlyPriceVnd),
    yearlyPriceInput: String(plan.yearlyPriceVnd),
    multiplierInput: String(plan.multiplier),
    quotas: {
      shadowingCustomPerDay: plan.shadowingCustomPerDay,
      readingPerWeek: plan.readingPerWeek,
      writingPerWeek: plan.writingPerWeek,
      speakingLifePerDay: plan.speakingLifePerDay,
      speakingWorkPerDay: plan.speakingWorkPerDay,
    },
    flags: {
      itEngineerAllowed: plan.itEngineerAllowed,
      uploadCvAllowed: plan.uploadCvAllowed,
      fullRubricAllowed: plan.fullRubricAllowed,
    },
    highlightsText: plan.highlights.join('\n'),
  };
}

interface AdminPlanConfigPanelProps {
  refreshSignal?: number;
  onPlanSaved?: () => void;
}

export function AdminPlanConfigPanel({ refreshSignal = 0, onPlanSaved }: AdminPlanConfigPanelProps) {
  const [plans, setPlans] = useState<AdminPlanDefinition[]>([]);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('plus');
  const [draft, setDraft] = useState<PlanFormDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const loadPlans = useCallback(
    async (keepTier?: SubscriptionTier) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetchAdminPlans();
        setPlans(res.plans);
        const targetTier = keepTier ?? selectedTier;
        const found = res.plans.find((p) => p.tier === targetTier) ?? res.plans[0];
        if (found) {
          setSelectedTier(found.tier);
          setDraft(planToDraft(found));
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Không tải được cấu hình bảng giá.');
      } finally {
        setLoading(false);
      }
    },
    [selectedTier],
  );

  useEffect(() => {
    void loadPlans(selectedTier);
  }, [refreshSignal]);

  const handleSelectTier = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setErrorMsg(null);
    setNoticeMsg(null);
    const found = plans.find((p) => p.tier === tier);
    if (found) {
      setDraft(planToDraft(found));
    }
  };

  const handleSave = async () => {
    if (!draft || saving) return;
    if (draft.name.trim().length < 2 || draft.tagline.trim().length < 2) {
      setErrorMsg('Tên gói và mô tả ngắn cần tối thiểu 2 ký tự.');
      return;
    }
    const mult = Number(draft.multiplierInput.replace(',', '.'));
    if (!Number.isFinite(mult) || mult < 0.5 || mult > 10) {
      setErrorMsg('Hệ số Xu KS phải nằm trong khoảng 0.5 đến 10.');
      return;
    }

    const monthlyPriceVnd =
      selectedTier === 'free' ? 0 : Number(draft.monthlyPriceInput.replace(/[^0-9]/g, '')) || 0;
    const yearlyPriceVnd =
      selectedTier === 'free' ? 0 : Number(draft.yearlyPriceInput.replace(/[^0-9]/g, '')) || 0;
    const yearlyPerMonthVnd = selectedTier === 'free' ? 0 : Math.round(yearlyPriceVnd / 12);
    const highlights = draft.highlightsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    setSaving(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const res = await updateAdminPlan(selectedTier, {
        name: draft.name.trim(),
        tagline: draft.tagline.trim(),
        monthlyPriceVnd,
        yearlyPriceVnd,
        yearlyPerMonthVnd,
        multiplier: Math.round(mult * 100) / 100,
        shadowingCustomPerDay: draft.quotas.shadowingCustomPerDay,
        readingPerWeek: draft.quotas.readingPerWeek,
        writingPerWeek: draft.quotas.writingPerWeek,
        speakingLifePerDay: draft.quotas.speakingLifePerDay,
        speakingWorkPerDay: draft.quotas.speakingWorkPerDay,
        itEngineerAllowed: draft.flags.itEngineerAllowed,
        uploadCvAllowed: draft.flags.uploadCvAllowed,
        fullRubricAllowed: draft.flags.fullRubricAllowed,
        highlights,
      });

      setPlans((prev) => prev.map((p) => (p.tier === res.plan.tier ? res.plan : p)));
      setDraft(planToDraft(res.plan));
      setNoticeMsg(`Đã lưu cấu hình gói ${res.plan.name}.`);
      onPlanSaved?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không lưu được cấu hình gói.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    if (saving) return;
    setSaving(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const res = await resetAdminPlan(selectedTier);
      setPlans((prev) => prev.map((p) => (p.tier === res.plan.tier ? res.plan : p)));
      setDraft(planToDraft(res.plan));
      setResetConfirmOpen(false);
      setNoticeMsg(`Đã khôi phục mặc định gói ${res.plan.name}.`);
      onPlanSaved?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không khôi phục được gói mặc định.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !draft) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color={adminTheme.colors.accent} />
        <Text style={styles.mutedText}>Đang tải cấu hình bảng giá...</Text>
      </View>
    );
  }

  const parsedYearly =
    selectedTier === 'free'
      ? 0
      : Number((draft?.yearlyPriceInput ?? '0').replace(/[^0-9]/g, '')) || 0;

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

      <View style={styles.tierCardsRow}>
        {plans.map((p) => {
          const active = p.tier === selectedTier;
          return (
            <Pressable
              key={p.tier}
              style={[styles.tierSummaryCard, active && styles.tierSummaryCardActive]}
              onPress={() => handleSelectTier(p.tier)}
            >
              <Text style={[styles.tierSummaryTitle, active && styles.tierSummaryTitleActive]}>
                {p.name}
              </Text>
              <Text style={styles.tierSummaryMeta}>
                {p.tier === 'free'
                  ? `0đ · ×${p.multiplier} Xu KS`
                  : `${formatVnd(p.monthlyPriceVnd)}/tháng · ${formatVnd(p.yearlyPriceVnd)}/năm · ×${p.multiplier}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {draft ? (
        <View style={styles.card}>
          <View style={styles.rowBetweenWrap}>
            <Text style={styles.cardTitle}>Chỉnh sửa gói {selectedTier.toUpperCase()}</Text>
            <Pressable
              style={styles.resetBtn}
              disabled={saving}
              onPress={() => setResetConfirmOpen(true)}
            >
              <Text style={styles.resetBtnText}>Khôi phục mặc định</Text>
            </Pressable>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>Tên gọi, Giá bán &amp; Hệ số Xu</Text>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Tên hiển thị gói</Text>
              <TextInput
                value={draft.name}
                onChangeText={(v) => setDraft({ ...draft, name: v })}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Mô tả ngắn</Text>
              <TextInput
                value={draft.tagline}
                onChangeText={(v) => setDraft({ ...draft, tagline: v })}
                style={styles.input}
              />
            </View>

            {selectedTier === 'free' ? (
              <Text style={styles.mutedText}>Gói Miễn phí giữ mức 0đ.</Text>
            ) : (
              <View style={styles.priceGrid}>
                <View style={styles.priceCol}>
                  <Text style={styles.fieldLabel}>Giá theo tháng (VNĐ)</Text>
                  <TextInput
                    value={draft.monthlyPriceInput}
                    onChangeText={(v) =>
                      setDraft({ ...draft, monthlyPriceInput: v.replace(/[^0-9]/g, '') })
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={styles.priceCol}>
                  <Text style={styles.fieldLabel}>
                    Giá theo năm (VNĐ · ≈ {formatVnd(Math.round(parsedYearly / 12))}/tháng)
                  </Text>
                  <TextInput
                    value={draft.yearlyPriceInput}
                    onChangeText={(v) =>
                      setDraft({ ...draft, yearlyPriceInput: v.replace(/[^0-9]/g, '') })
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>
            )}

            <View style={styles.rowBetween}>
              <Text style={styles.fieldLabel}>Hệ số tích Xu KS (×)</Text>
              <TextInput
                value={draft.multiplierInput}
                onChangeText={(v) =>
                  setDraft({ ...draft, multiplierInput: v.replace(/[^0-9.,]/g, '') })
                }
                keyboardType="decimal-pad"
                style={[styles.input, { width: 110, textAlign: 'right' }]}
              />
            </View>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>Giới hạn lượt dùng chức năng AI</Text>
            {QUOTA_FIELDS.map((q) => {
              const val = draft.quotas[q.key];
              const isUnlimited = val === null;
              return (
                <View key={q.key} style={styles.quotaRow}>
                  <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
                    <Text style={styles.quotaLabel}>{q.label}</Text>
                    {val === 0 ? <Text style={styles.lockedHint}>Đang khóa (0 lượt)</Text> : null}
                  </View>

                  <View style={styles.quotaControls}>
                    <Pressable
                      style={[styles.chip, isUnlimited && styles.chipActive]}
                      onPress={() =>
                        setDraft({
                          ...draft,
                          quotas: { ...draft.quotas, [q.key]: isUnlimited ? 2 : null },
                        })
                      }
                    >
                      <Text style={[styles.chipText, isUnlimited && styles.chipTextActive]}>
                        Không giới hạn
                      </Text>
                    </Pressable>
                    {!isUnlimited ? (
                      <TextInput
                        value={String(val)}
                        onChangeText={(raw) => {
                          const n = Number(raw.replace(/[^0-9]/g, '')) || 0;
                          setDraft({
                            ...draft,
                            quotas: { ...draft.quotas, [q.key]: Math.min(10000, n) },
                          });
                        }}
                        keyboardType="numeric"
                        placeholder="0 = Khóa"
                        style={[styles.input, styles.quotaNumInput]}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>Quyền tính năng cao cấp</Text>
            {FEATURE_FLAGS.map((f) => (
              <View key={f.key} style={styles.rowBetween}>
                <Text style={styles.flagLabel}>{f.label}</Text>
                <AdminSwitch
                  value={draft.flags[f.key]}
                  onValueChange={(next) =>
                    setDraft({
                      ...draft,
                      flags: { ...draft.flags, [f.key]: next },
                    })
                  }
                  accessibilityLabel={f.label}
                />
              </View>
            ))}
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>Quyền lợi hiển thị trên Bảng giá (mỗi dòng 1 ý)</Text>
            <TextInput
              value={draft.highlightsText}
              onChangeText={(v) => setDraft({ ...draft, highlightsText: v })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={[styles.input, styles.highlightsInput]}
            />
          </View>

          <Pressable style={styles.saveBtn} disabled={saving} onPress={() => void handleSave()}>
            <Text style={styles.saveBtnText}>
              {saving ? 'Đang lưu...' : `Lưu cấu hình gói ${draft.name}`}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <AdminConfirmModal
        visible={resetConfirmOpen}
        title="Khôi phục cấu hình mặc định"
        message={`Đặt lại toàn bộ giá bán, hệ số Xu KS và hạn mức AI của gói ${draft?.name ?? selectedTier.toUpperCase()} về mặc định ban đầu?`}
        confirmLabel="Khôi phục"
        tone="danger"
        busy={saving}
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => void handleConfirmReset()}
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
    padding: 28,
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
  tierCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tierSummaryCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.md,
    padding: 14,
    gap: 4,
  },
  tierSummaryCardActive: {
    backgroundColor: adminTheme.colors.accentSoft,
    borderColor: adminTheme.colors.accent,
  },
  tierSummaryTitle: { fontSize: 14, fontWeight: '800', color: adminTheme.colors.textPrimary },
  tierSummaryTitleActive: { color: adminTheme.colors.accentHover },
  tierSummaryMeta: { fontSize: 12, color: adminTheme.colors.textSecondary },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 16,
    gap: 12,
  },
  rowBetweenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: adminTheme.colors.textPrimary },
  resetBtn: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: adminTheme.colors.surfaceSubtle,
  },
  resetBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  sectionBox: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.md,
    padding: 12,
    gap: 10,
  },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: adminTheme.colors.textPrimary },
  fieldRow: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  mutedText: { fontSize: 12, color: adminTheme.colors.textMuted },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priceCol: { flex: 1, minWidth: 200, gap: 4 },
  input: {
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
    color: adminTheme.colors.textPrimary,
  },
  quotaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: adminTheme.colors.border,
  },
  quotaLabel: { fontSize: 13, fontWeight: '700', color: adminTheme.colors.textPrimary },
  lockedHint: { fontSize: 11, fontWeight: '600', color: adminTheme.colors.dangerText },
  quotaControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quotaNumInput: { width: 84, textAlign: 'right' },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: adminTheme.radius.pill,
    backgroundColor: adminTheme.colors.border,
  },
  chipActive: { backgroundColor: adminTheme.colors.textPrimary },
  chipText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  flagLabel: { fontSize: 13, fontWeight: '600', color: adminTheme.colors.textPrimary, flex: 1 },
  highlightsInput: { minHeight: 112 },
  saveBtn: {
    backgroundColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
