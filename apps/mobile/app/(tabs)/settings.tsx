import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useStoragePort } from '../../src/db/DbProvider';
import { runSync, type SyncRunSummary } from '../../src/sync/sync-client';
import { useTheme, type AppTheme } from '../../src/theme/ThemeProvider';

/** Tab "Cài đặt": chuyển theme, đồng bộ thủ công, thông tin app. */
export default function Settings(): ReactElement {
  const port = useStoragePort();
  const { theme, name, toggle } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const syncNow = useCallback(async (): Promise<void> => {
    setSyncState('syncing');
    setSyncMessage(null);
    try {
      const summary: SyncRunSummary = await runSync(port);
      setSyncState('done');
      setSyncMessage(
        `Đã gửi ${summary.pushed.folders.applied + summary.pushed.vocabularies.applied} · ` +
          `nhận ${summary.merged.folders + summary.merged.vocabularies}`,
      );
    } catch (err) {
      setSyncState('error');
      setSyncMessage(err instanceof Error ? err.message : String(err));
    }
  }, [port]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Giao diện */}
      <Text style={styles.sectionTitle}>Giao diện</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Chế độ tối</Text>
            <Text style={styles.rowCaption}>
              {name === 'dark' ? 'Đang bật · nhấn để chuyển sáng' : 'Đang tắt · nhấn để chuyển tối'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: name === 'dark' }}
            accessibilityLabel={`Bật giao diện ${name === 'dark' ? 'sáng' : 'tối'}`}
            onPress={toggle}
            style={({ pressed }) => [
              styles.toggle,
              name === 'dark' && styles.toggleOn,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                name === 'dark' && styles.toggleThumbOn,
              ]}
            />
          </Pressable>
        </View>
      </View>

      {/* Đồng bộ */}
      <Text style={styles.sectionTitle}>Đồng bộ dữ liệu</Text>
      <View style={styles.card}>
        <Text style={styles.rowCaption}>
          Dữ liệu được lưu trên thiết bị. Nhấn đồng bộ để gửi lên máy chủ và nhận dữ liệu mới.
        </Text>
        {syncMessage !== null ? (
          <Text
            accessibilityRole={syncState === 'error' ? 'alert' : 'text'}
            style={syncState === 'error' ? styles.syncError : styles.syncSuccess}
          >
            {syncState === 'error' ? `Chưa đồng bộ: ${syncMessage}` : syncMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={syncState === 'syncing' ? 'Đang đồng bộ dữ liệu' : 'Đồng bộ dữ liệu'}
          accessibilityHint="Gửi thay đổi lên máy chủ và nhận dữ liệu mới"
          disabled={syncState === 'syncing'}
          onPress={() => void syncNow()}
          style={({ pressed }) => [
            styles.syncButton,
            pressed && styles.syncButtonPressed,
            syncState === 'syncing' && styles.syncButtonDisabled,
          ]}
        >
          {syncState === 'syncing' ? (
            <ActivityIndicator color={theme.primaryContrast} />
          ) : (
            <Text style={styles.syncButtonText}>Đồng bộ ngay</Text>
          )}
        </Pressable>
      </View>

      {/* Thông tin */}
      <Text style={styles.sectionTitle}>Thông tin</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ứng dụng</Text>
          <Text style={styles.infoValue}>Kanji Nest</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phiên bản</Text>
          <Text style={styles.infoValue}>0.1.0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Giấy phép</Text>
          <Text style={styles.infoValue}>MIT</Text>
        </View>
      </View>

      <Text style={styles.footer}>HỌC CHẬM MÀ CHẮC · 一歩ずつ</Text>
    </ScrollView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
      gap: 12,
    },
    sectionTitle: {
      color: t.muted,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 8,
    },
    card: {
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    rowCopy: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      color: t.text,
      fontSize: 16,
      fontWeight: '700',
    },
    rowCaption: {
      color: t.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    toggle: {
      width: 52,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.border,
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    toggleOn: {
      backgroundColor: t.primary,
      borderColor: t.primary,
    },
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: t.surface,
    },
    toggleThumbOn: {
      alignSelf: 'flex-end',
      backgroundColor: t.primaryContrast,
    },
    pressed: {
      opacity: 0.72,
    },
    syncError: {
      color: t.danger,
      fontSize: 13,
    },
    syncSuccess: {
      color: t.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    syncButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: t.primary,
    },
    syncButtonPressed: {
      opacity: 0.75,
    },
    syncButtonDisabled: {
      opacity: 0.7,
    },
    syncButtonText: {
      color: t.primaryContrast,
      fontSize: 15,
      fontWeight: '800',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      color: t.muted,
      fontSize: 14,
    },
    infoValue: {
      color: t.text,
      fontSize: 14,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: t.border,
    },
    footer: {
      color: t.muted,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginTop: 16,
    },
  });
