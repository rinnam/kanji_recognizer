import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoragePort } from '../src/db/DbProvider';
import { runSync, type SyncRunSummary } from '../src/sync/sync-client';

/** Trang chính: số lượng local + điều hướng + đồng bộ tay với BE. */
export default function Home(): ReactElement {
  const port = useStoragePort();
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  counts: {
    fontSize: 16,
    opacity: 0.7,
  },
  error: {
    fontSize: 14,
    color: '#a3301f',
  },
  button: {
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#b4532a',
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#b4532a',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  syncText: {
    color: '#b4532a',
    fontSize: 16,
    fontWeight: '700',
  },
});
