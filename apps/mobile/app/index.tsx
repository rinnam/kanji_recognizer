import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoragePort } from '../src/db/DbProvider';
import { runSync, type SyncRunSummary } from '../src/sync/sync-client';
import { useTheme, type AppTheme } from '../src/theme/ThemeProvider';

interface HomeCounts {
  folders: number;
  vocabularies: number;
  due: number;
}

const SHORTCUTS = [
  { href: '/overview', glyph: '語', title: 'Từ vựng', caption: 'Bộ sưu tập của bạn' },
  { href: '/flashcard', glyph: '記', title: 'Flashcard', caption: 'Ôn tập mỗi ngày' },
  { href: '/quiz', glyph: '問', title: 'Luyện tập', caption: 'Kiểm tra ghi nhớ' },
  { href: '/import', glyph: '＋', title: 'Thêm từ mới', caption: 'Nhập hoặc dán từ' },
] as const;

/** Trang chủ mobile: lối tắt học tập, tiến độ local và đồng bộ thủ công. */
export default function Home(): ReactElement {
  const port = useStoragePort();
  const { theme, name, toggle } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [counts, setCounts] = useState<HomeCounts>({ folders: 0, vocabularies: 0, due: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshCounts = useCallback(async () => {
    const [folders, vocabularies] = await Promise.all([port.folders.all(), port.vocabs.all()]);
    const activeFolders = folders.filter((folder) => folder.deletedAt === null);
    const activeVocabularies = vocabularies.filter((vocabulary) => vocabulary.deletedAt === null);
    const due = activeVocabularies.filter(
      (vocabulary) =>
        vocabulary.srsNextReview !== null &&
        new Date(vocabulary.srsNextReview).getTime() <= Date.now(),
    ).length;

    setCounts({
      folders: activeFolders.length,
      vocabularies: activeVocabularies.length,
      due,
    });
  }, [port]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void (async () => {
        try {
          await refreshCounts();
          if (active) setError(null);
        } catch (err) {
          if (active) setError(err instanceof Error ? err.message : String(err));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [refreshCounts]),
  );

  const syncNow = async (): Promise<void> => {
    setSyncState('syncing');
    setSyncMessage(null);
    try {
      const summary: SyncRunSummary = await runSync(port);
      await refreshCounts();
      setSyncState('done');
      setSyncMessage(
        `Đã gửi ${summary.pushed.folders.applied + summary.pushed.vocabularies.applied} · ` +
          `nhận ${summary.merged.folders + summary.merged.vocabularies}`,
      );
    } catch (err) {
      setSyncState('error');
      setSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.brandMark} accessible={false}>
              <Text style={styles.brandGlyph}>漢</Text>
            </View>
            <View>
              <Text style={styles.brandName}>KANJI NEST</Text>
              <Text style={styles.brandCaption}>GÓC HỌC TIẾNG NHẬT</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bật giao diện ${name === 'dark' ? 'sáng' : 'tối'}`}
            accessibilityHint="Chuyển đổi giao diện sáng và tối"
            onPress={toggle}
            style={({ pressed }) => [styles.themeButton, pressed && styles.pressed]}
          >
            <Text style={styles.themeGlyph} accessible={false}>
              {name === 'dark' ? '☼' : '◐'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>MỖI NGÀY MỘT CHÚT</Text>
          <Text style={styles.heading}>こんにちは!</Text>
          <Text style={styles.intro}>Sẵn sàng mở rộng vốn từ tiếng Nhật hôm nay?</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>GỢI Ý HÔM NAY</Text>
            <Text style={styles.heroTitle}>Ôn tập để nhớ lâu hơn</Text>
            <Text style={styles.heroDescription}>
              {loading
                ? 'Đang xem lại lịch học của bạn…'
                : counts.due > 0
                  ? `${counts.due} từ đang chờ bạn ôn tập.`
                  : 'Một phiên học ngắn cũng tạo nên khác biệt.'}
            </Text>
          </View>
          <View style={styles.heroStamp} accessible={false}>
            <Text style={styles.heroKanji}>学</Text>
            <Text style={styles.heroStampCaption}>HỌC MỖI NGÀY</Text>
          </View>
          <Link href="/flashcard" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bắt đầu học flashcard"
              accessibilityHint="Mở bộ thẻ ôn tập"
              style={({ pressed }) => [styles.heroButton, pressed && styles.heroButtonPressed]}
            >
              <Text style={styles.heroButtonText}>Bắt đầu học</Text>
              <Text style={styles.heroArrow} accessible={false}>→</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Thư viện của bạn</Text>
          <Text style={styles.sectionNote}>Lưu trữ trên thiết bị</Text>
        </View>
        {error !== null ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tải lại dữ liệu"
              onPress={() => {
                setLoading(true);
                void refreshCounts()
                  .then(() => setError(null))
                  .catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : String(err)),
                  )
                  .finally(() => setLoading(false));
              }}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.stats}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TỪ VỰNG</Text>
              {loading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={styles.statValue}>{counts.vocabularies}</Text>
              )}
              <Text style={styles.statFoot}>từ đã lưu</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>THƯ MỤC</Text>
              {loading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={styles.statValue}>{counts.folders}</Text>
              )}
              <Text style={styles.statFoot}>bộ sưu tập</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Khám phá</Text>
          <Text style={styles.sectionNote}>Chọn cách học phù hợp</Text>
        </View>
        <View style={styles.shortcutGrid}>
          {SHORTCUTS.map((shortcut) => (
            <Link key={shortcut.href} href={shortcut.href} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${shortcut.title}. ${shortcut.caption}`}
                style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
              >
                <View style={styles.shortcutGlyphBox} accessible={false}>
                  <Text style={styles.shortcutGlyph}>{shortcut.glyph}</Text>
                </View>
                <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
                <Text style={styles.shortcutCaption}>{shortcut.caption}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        <View style={styles.syncCard}>
          <View style={styles.syncCopy}>
            <Text style={styles.syncTitle}>Dữ liệu của bạn</Text>
            <Text style={styles.syncDescription}>
              Học offline, đồng bộ khi bạn sẵn sàng.
            </Text>
            {syncMessage !== null ? (
              <Text
                accessibilityRole={syncState === 'error' ? 'alert' : 'text'}
                style={syncState === 'error' ? styles.syncError : styles.syncSuccess}
              >
                {syncState === 'error' ? `Chưa đồng bộ: ${syncMessage}` : syncMessage}
              </Text>
            ) : null}
          </View>
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
              <Text style={styles.syncButtonText}>Đồng bộ</Text>
            )}
          </Pressable>
        </View>
        <Text style={styles.footer}>HỌC CHẬM MÀ CHẮC · 一歩ずつ</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: t.bg,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 32,
      gap: 22,
    },
    topBar: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    brandMark: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.primary,
    },
    brandGlyph: {
      color: t.primaryContrast,
      fontSize: 24,
      fontWeight: '700',
    },
    brandName: {
      color: t.text,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 1.3,
    },
    brandCaption: {
      marginTop: 2,
      color: t.muted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
    },
    themeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 15,
      backgroundColor: t.surface,
    },
    themeGlyph: {
      color: t.text,
      fontSize: 22,
    },
    welcome: {
      gap: 5,
    },
    eyebrow: {
      color: t.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.6,
    },
    heading: {
      color: t.text,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    intro: {
      color: t.muted,
      fontSize: 15,
      lineHeight: 22,
    },
    hero: {
      overflow: 'hidden',
      minHeight: 220,
      padding: 20,
      borderRadius: 26,
      backgroundColor: t.primary,
      gap: 18,
    },
    heroCopy: {
      maxWidth: '68%',
      gap: 8,
    },
    heroEyebrow: {
      color: t.primaryContrast,
      opacity: 0.85,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.4,
    },
    heroTitle: {
      color: t.primaryContrast,
      fontSize: 23,
      lineHeight: 29,
      fontWeight: '800',
    },
    heroDescription: {
      color: t.primaryContrast,
      opacity: 0.9,
      fontSize: 14,
      lineHeight: 20,
    },
    heroStamp: {
      position: 'absolute',
      top: 22,
      right: 18,
      alignItems: 'center',
      opacity: 0.75,
    },
    heroKanji: {
      color: t.primaryContrast,
      fontSize: 54,
      fontWeight: '700',
    },
    heroStampCaption: {
      color: t.primaryContrast,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.7,
    },
    heroButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      paddingHorizontal: 16,
      borderRadius: 15,
      backgroundColor: t.surface,
      alignSelf: 'flex-start',
    },
    heroButtonPressed: {
      opacity: 0.8,
    },
    heroButtonText: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
    },
    heroArrow: {
      color: t.primary,
      fontSize: 19,
      fontWeight: '700',
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionTitle: {
      color: t.text,
      fontSize: 18,
      fontWeight: '800',
    },
    sectionNote: {
      color: t.muted,
      fontSize: 12,
    },
    stats: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      minHeight: 116,
      justifyContent: 'center',
      gap: 4,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    statLabel: {
      color: t.muted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
    },
    statValue: {
      color: t.text,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '800',
    },
    statFoot: {
      color: t.muted,
      fontSize: 12,
    },
    errorCard: {
      gap: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: t.danger,
      borderRadius: 18,
      backgroundColor: t.surface,
    },
    errorTitle: {
      color: t.danger,
      fontSize: 15,
      fontWeight: '800',
    },
    errorMessage: {
      color: t.text,
      fontSize: 13,
    },
    retryButton: {
      minHeight: 44,
      justifyContent: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.btnBorder,
      borderRadius: 12,
    },
    retryText: {
      color: t.text,
      fontWeight: '700',
    },
    shortcutGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    shortcut: {
      width: '47%',
      minHeight: 142,
      justifyContent: 'center',
      gap: 6,
      padding: 15,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 20,
      backgroundColor: t.surface,
    },
    shortcutPressed: {
      opacity: 0.75,
      borderColor: t.primary,
    },
    shortcutGlyphBox: {
      width: 38,
      height: 38,
      marginBottom: 3,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: t.btnBg,
    },
    shortcutGlyph: {
      color: t.primary,
      fontSize: 20,
      fontWeight: '800',
    },
    shortcutTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
    },
    shortcutCaption: {
      color: t.muted,
      fontSize: 12,
      lineHeight: 15,
    },
    syncCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 20,
      backgroundColor: t.surface,
    },
    syncCopy: {
      flex: 1,
      gap: 4,
    },
    syncTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
    },
    syncDescription: {
      color: t.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    syncError: {
      color: t.danger,
      fontSize: 12,
    },
    syncSuccess: {
      color: t.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    syncButton: {
      minWidth: 92,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
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
      fontSize: 13,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.7,
    },
    footer: {
      color: t.muted,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.2,
    },
  });
