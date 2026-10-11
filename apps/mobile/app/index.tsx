import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoragePort } from '../src/db/DbProvider';
import { runSync, type SyncRunSummary } from '../src/sync/sync-client';
import { useTheme, type AppTheme } from '../src/theme/ThemeProvider';

/** Trang chính: số lượng local + điều hướng + đồng bộ tay với BE. */
export default function Home(): ReactElement {
  const port = useStoragePort();
  const { theme, name, toggle } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [counts, setCounts] = useState({ folders: 0, vocabs: 0 });
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshCounts = useCallback(async () => {
    const [folders, vocabs] = await Promise.all([port.folders.all(), port.vocabs.all()]);
    setCounts({
      folders: folders.filter((f) => f.deletedAt === null).length,
      vocabs: vocabs.filter((v) => v.deletedAt === null).length,
    });
  }, [port]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          await refreshCounts();
          if (active) setError(null);
        } catch (err) {
          if (active) setError(err instanceof Error ? err.message : String(err));
        }
      })();
      return () => {
        active = false;
      };
    }, [port, refreshCounts]),
  );

  const syncNow = async (): Promise<void> => {
    setSyncState('syncing');
    setSyncMessage(null);
    try {
      const summary: SyncRunSummary = await runSync(port);
      await refreshCounts();
      setSyncState('done');
      setSyncMessage(
        `Đẩy ${summary.pushed.folders.applied + summary.pushed.vocabularies.applied} · ` +
          `Nhận ${summary.merged.folders + summary.merged.vocabularies}`,
      );
    } catch (err) {
      setSyncState('error');
      setSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>KanjiSmart</Text>
      {error !== null ? (
        <Text style={styles.error}>Lỗi tải DB: {error}</Text>
      ) : (
        <Text style={styles.counts}>
          {counts.folders} thư mục · {counts.vocabs} từ vựng
        </Text>
      )}
      <Link href="/overview" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Tổng quan từ vựng</Text>
        </Pressable>
      </Link>
      <Link href="/flashcard" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Học Flashcard</Text>
        </Pressable>
      </Link>
      <Link href="/quiz" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Quiz</Text>
        </Pressable>
      </Link>
      <Link href="/import" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Nhập từ file / dán</Text>
        </Pressable>
      </Link>
      <Pressable
        style={[styles.button, styles.syncButton]}
        onPress={() => void syncNow()}
        disabled={syncState === 'syncing'}
      >
        <Text style={styles.syncText}>
          {syncState === 'syncing' ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}
        </Text>
      </Pressable>
      {syncMessage !== null ? (
        <Text style={syncState === 'error' ? styles.error : styles.counts}>
          {syncState === 'error' ? `Lỗi đồng bộ: ${syncMessage}` : syncMessage}
        </Text>
      ) : null}
      <Pressable style={styles.themeButton} onPress={toggle} accessibilityLabel="Đổi giao diện">
        <Text style={styles.syncText}>Giao diện: {name === 'dark' ? 'tối' : 'sáng'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 24,
      backgroundColor: t.bg,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: t.text,
    },
    counts: {
      fontSize: 16,
      opacity: 0.7,
      color: t.text,
    },
    error: {
      fontSize: 14,
      color: t.danger,
    },
    button: {
      minWidth: 220,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: t.primary,
      alignItems: 'center',
    },
    syncButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.primary,
    },
    buttonText: {
      color: t.primaryContrast,
      fontSize: 16,
      fontWeight: '700',
    },
    syncText: {
      color: t.primary,
      fontSize: 16,
      fontWeight: '700',
    },
    themeButton: {
      marginTop: 8,
    },
  });
