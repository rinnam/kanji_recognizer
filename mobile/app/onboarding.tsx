import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../src/components/AppShell';
import { TopHeader } from '../src/components/TopHeader';
import { nihongoTheme } from '../src/theme/nihongo-theme';

const LEVELS = [
  { key: 'BEGINNER', label: 'Mới bắt đầu', desc: 'Chưa biết hoặc mới học Hiragana/Katakana' },
  { key: 'N5', label: 'N5 · Sơ cấp', desc: 'Hiểu các câu đơn giản hằng ngày' },
  { key: 'N4', label: 'N4 · Cơ bản', desc: 'Đọc và nghe hội thoại cơ bản' },
  { key: 'N3', label: 'N3 · Trung cấp', desc: 'Hiểu tiếng Nhật đời sống ở mức khá' },
  { key: 'N2', label: 'N2 · Trung cao cấp', desc: 'Đọc báo, làm việc trong môi trường Nhật' },
  { key: 'N1', label: 'N1 · Cao cấp', desc: 'Thành thạo nội dung chuyên sâu' },
];

const GOALS = [
  'Giao tiếp hằng ngày',
  'Ôn thi JLPT',
  'Du lịch Nhật Bản',
  'Công việc',
  'Văn hóa & sở thích',
];

const MINUTES = [5, 10, 15, 30, 60];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [level, setLevel] = useState('N3');
  const [goal, setGoal] = useState('Ôn thi JLPT');
  const [minutes, setMinutes] = useState(30);

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Thiết lập lộ trình" subtitle={`Bước ${step}/3`} />

      {/* Stepper */}
      <View style={styles.stepper}>
        {(['Trình độ', 'Mục tiêu', 'Xác nhận'] as const).map((label, idx) => {
          const num = idx + 1;
          const active = step >= num;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
                <Text style={[styles.stepNum, active && styles.stepNumActive]}>{num}</Text>
              </View>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>

      {step === 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trình độ hiện tại của bạn</Text>
          {LEVELS.map((item) => {
            const selected = level === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.optionCard, selected && styles.optionCardActive]}
                onPress={() => setLevel(item.key)}
              >
                <Text style={styles.optionTitle}>{item.label}</Text>
                <Text style={styles.optionDesc}>{item.desc}</Text>
              </Pressable>
            );
          })}
          <Text style={styles.note}>Đây là tự đánh giá, không phải kết quả kiểm tra.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
            <Text style={styles.primaryBtnText}>Tiếp tục →</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mục tiêu chính</Text>
          {GOALS.map((g) => {
            const selected = goal === g;
            return (
              <Pressable
                key={g}
                style={[styles.optionCard, selected && styles.optionCardActive]}
                onPress={() => setGoal(g)}
              >
                <Text style={styles.optionTitle}>{g}</Text>
              </Pressable>
            );
          })}

          <Text style={[styles.cardTitle, { marginTop: 8 }]}>Thời gian học mỗi ngày</Text>
          <View style={styles.chipsRow}>
            {MINUTES.map((m) => {
              const selected = minutes === m;
              return (
                <Pressable
                  key={m}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => setMinutes(m)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{m} phút</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footerRow}>
            <Pressable style={styles.outlineBtn} onPress={() => setStep(1)}>
              <Text style={styles.outlineBtnText}>Quay lại</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, styles.flexBtn]} onPress={() => setStep(3)}>
              <Text style={styles.primaryBtnText}>Tiếp tục →</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Xác nhận kế hoạch học tập</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trình độ</Text>
            <Text style={styles.summaryValue}>{level}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mục tiêu</Text>
            <Text style={styles.summaryValue}>{goal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mỗi ngày</Text>
            <Text style={styles.summaryValue}>{minutes} phút</Text>
          </View>

          <View style={styles.footerRow}>
            <Pressable style={styles.outlineBtn} onPress={() => setStep(2)}>
              <Text style={styles.outlineBtnText}>Quay lại</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, styles.flexBtn]} onPress={() => router.replace('/app')}>
              <Text style={styles.primaryBtnText}>Xác nhận và bắt đầu ✓</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  stepNum: {
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.md,
    padding: 14,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    gap: 2,
  },
  optionCardActive: {
    borderColor: nihongoTheme.colors.accent,
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  optionDesc: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
  },
  note: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
  },
  chipActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  chipText: {
    fontWeight: '700',
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
  },
  summaryLabel: {
    color: nihongoTheme.colors.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  flexBtn: {
    flex: 1,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
