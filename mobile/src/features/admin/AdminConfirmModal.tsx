import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { adminTheme } from './admin-theme';

interface AdminConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AdminConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  busy = false,
  onCancel,
  onConfirm,
}: AdminConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} disabled={busy} onPress={onCancel}>
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
            <Pressable
              style={[
                styles.confirmBtn,
                tone === 'danger' ? styles.confirmDanger : styles.confirmPrimary,
                busy && styles.btnDisabled,
              ]}
              disabled={busy}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{busy ? 'Đang xử lý...' : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface AdminConfirmBannerProps {
  visible: boolean;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AdminConfirmBanner({
  visible,
  message,
  confirmLabel,
  tone = 'danger',
  busy = false,
  onCancel,
  onConfirm,
}: AdminConfirmBannerProps) {
  if (!visible) return null;
  return (
    <View style={[styles.banner, tone === 'danger' ? styles.bannerDanger : styles.bannerPrimary]}>
      <Text style={styles.bannerMessage}>{message}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.cancelBtnSmall} disabled={busy} onPress={onCancel}>
          <Text style={styles.cancelText}>Hủy</Text>
        </Pressable>
        <Pressable
          style={[
            styles.confirmBtnSmall,
            tone === 'danger' ? styles.confirmDanger : styles.confirmPrimary,
            busy && styles.btnDisabled,
          ]}
          disabled={busy}
          onPress={onConfirm}
        >
          <Text style={styles.confirmText}>{busy ? 'Đang xử lý...' : confirmLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(24, 24, 27, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: adminTheme.colors.textPrimary,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    color: adminTheme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnSmall: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: adminTheme.colors.textPrimary,
  },
  confirmBtn: {
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmBtnSmall: {
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  confirmDanger: {
    backgroundColor: adminTheme.colors.dangerText,
  },
  confirmPrimary: {
    backgroundColor: adminTheme.colors.accent,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  banner: {
    borderRadius: adminTheme.radius.md,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  bannerDanger: {
    backgroundColor: adminTheme.colors.dangerBg,
    borderColor: adminTheme.colors.dangerBorder,
  },
  bannerPrimary: {
    backgroundColor: adminTheme.colors.accentSoft,
    borderColor: adminTheme.colors.accentBorder,
  },
  bannerMessage: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: adminTheme.colors.textPrimary,
  },
});
