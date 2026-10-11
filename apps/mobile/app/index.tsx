import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoragePort } from '../src/db/DbProvider';

/** Trang chính M3: số lượng local + đường dẫn tới 2 màn hình học. */
export default function Home(): ReactElement {
  const port = useStoragePort();
  const [counts, setCounts] = useState({ folders: 0, vocabs: 0 });
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const [folders, vocabs] = await Promise.all([
            port.folders.all(),
            port.vocabs.all(),
          ]);
          if (!active) return;
          setCounts({
            folders: folders.filter((f) => f.deletedAt === null).length,
            vocabs: vocabs.filter((v) => v.deletedAt === null).length,
          });
          setError(null);
        } catch (err) {
          if (active) setError(err instanceof Error ? err.message : String(err));
        }
      })();
      return () => {
        active = false;
      };
    }, [port]),
  );

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
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
