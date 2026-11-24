import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Cá nhân"
        subtitle="Chế độ 1 người dùng (Local-First)"
        rightSlot={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>N</Text>
          </View>
        }
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin người học</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tên hiển thị</Text>
          <Text style={styles.infoValue}>Người học (Chưa thiết lập)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Chế độ lưu trữ</Text>
          <View style={styles.greenBadge}>
            <Text style={styles.greenBadgeText}>Local-First · 1 người dùng</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thiết lập học tập</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trình độ hiện tại</Text>
          <Text style={styles.infoValue}>N3 · Trung cấp</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mục tiêu chính</Text>
          <Text style={styles.infoValue}>Ôn thi JLPT</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Thời gian mỗi ngày</Text>
          <Text style={styles.infoValue}>30 phút</Text>
        </View>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/profile/learning')}>
          <Text style={styles.primaryBtnText}>Chỉnh sửa trình độ và mục tiêu</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lộ trình & Hướng dẫn</Text>
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/onboarding')}>
          <Text style={styles.outlineBtnText}>Mở lại màn hình Onboarding 3 bước</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: nihongoTheme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    marginBottom: 14,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  greenBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  greenBadgeText: {
    color: nihongoTheme.colors.successText,
    fontWeight: '700',
    fontSize: 12,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
});
