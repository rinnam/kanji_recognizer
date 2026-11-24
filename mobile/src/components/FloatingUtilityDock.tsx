import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { nihongoTheme } from '../theme/nihongo-theme';

export function FloatingUtilityDock() {
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  if (collapsed) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.collapsedBtn} onPress={() => setCollapsed(false)} accessibilityLabel="Mở tiện ích">
          <Text style={styles.collapsedText}>⋯</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.pill}>
          <Pressable style={styles.iconBtn} onPress={() => setHelpOpen(true)} accessibilityLabel="Hướng dẫn">
            <Text style={styles.iconText}>?</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={() => setCollapsed(true)} accessibilityLabel="Ẩn tiện ích">
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.stepBadge}>Hướng dẫn nhanh</Text>
            <Text style={styles.modalTitle}>Khám phá NihonGO Clone</Text>
            <Text style={styles.modalBody}>
              Giao diện đang ở chế độ khung rỗng (chưa đổ dữ liệu) để kiểm tra bố cục, màu sắc và luồng điều hướng đa nền tảng.
            </Text>
            <Text style={styles.modalHint}>Mở nút ? để xem lại hướng dẫn bất cứ lúc nào.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => setHelpOpen(false)}>
              <Text style={styles.primaryBtnText}>Mình hiểu rồi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 84,
    zIndex: 30,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 4,
    ...nihongoTheme.shadow.dock,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: nihongoTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
    fontSize: 14,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: nihongoTheme.colors.textSecondary,
    fontSize: 18,
    lineHeight: 20,
  },
  collapsedBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    alignItems: 'center',
    justifyContent: 'center',
    ...nihongoTheme.shadow.dock,
  },
  collapsedText: {
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 12, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 22,
    gap: 10,
    ...nihongoTheme.shadow.dock,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: nihongoTheme.colors.accentSoft,
    color: nihongoTheme.colors.accentHover,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
    fontSize: 12,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 21,
    color: nihongoTheme.colors.textSecondary,
  },
  modalHint: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
  },
  primaryBtn: {
    marginTop: 6,
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
});
