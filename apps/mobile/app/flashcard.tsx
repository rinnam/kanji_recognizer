import {
  applyReview,
  applyScope,
  buildQueue,
  selectWordsInScope,
  summarize,
  type FlashcardMode,
  type FolderDto,
  type SrsRating,
  type VocabularyDto,
} from '@kanji-nest/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScopePicker } from '../src/components/ScopePicker';
import { useStoragePort } from '../src/db/DbProvider';
import { useScope } from '../src/scope/ScopeProvider';
import { useTheme, type AppTheme } from '../src/theme/ThemeProvider';

const MODES: { id: FlashcardMode; label: string }[] = [
  { id: 'normal', label: 'Bình thường' },
  { id: 'progress', label: 'Tiến độ' },
  { id: 'anki', label: 'Anki SRS' },
];

const RATINGS: { id: SrsRating; label: string }[] = [
  { id: 'again', label: 'Again' },
  { id: 'hard', label: 'Hard' },
  { id: 'good', label: 'Good' },
  { id: 'easy', label: 'Easy' },
];

/**
 * Flashcard mobile (M3): 3 chế độ qua core (buildQueue/summarize), lật thẻ
 * chạm, Anki chấm SM-2 qua applyReview rồi putMany (updatedAt nâng sẵn để
 * sync đẩy). Phạm vi thư mục + đồng bộ lên BE làm ở M4/M5.
 */
export default function Flashcard(): ReactElement {
  const port = useStoragePort();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { folderId, selection } = useScope();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState<VocabularyDto[]>([]);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [mode, setMode] = useState<FlashcardMode>('normal');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  const reload = useCallback(async () => {
    try {
      const [vocabs, folderRows] = await Promise.all([
        port.vocabs.all(),
        port.folders.all(),
      ]);
      setAll(vocabs);
      setFolders(folderRows);
      setNow(new Date());
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [port]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const scopeBase = useMemo(
    () => selectWordsInScope(all, folders, folderId),
    [all, folders, folderId],
  );
  const deck = useMemo(() => {
    const modeDeck = buildQueue(scopeBase, mode, now);
    return selection.mode === 'all' ? modeDeck : applyScope(modeDeck, selection);
  }, [scopeBase, mode, now, selection]);
  const summary = useMemo(() => summarize(scopeBase, now), [scopeBase, now]);
  const total = deck.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = total === 0 ? null : deck[safeIndex];

  const changeMode = useCallback((next: FlashcardMode) => {
    setMode(next);
    setIndex(0);
    setRevealed(false);
  }, []);

  const rate = useCallback(
    async (rating: SrsRating) => {
      if (current === null) return;
      const next = applyReview(current, rating, new Date());
      await port.vocabs.putMany([next]);
      setRevealed(false);
      await reload();
    },
    [current, port, reload],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScopePicker />
      <View style={styles.modes}>
        {MODES.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.modeButton, item.id === mode && styles.modeActive]}
            onPress={() => changeMode(item.id)}
          >
            <Text style={[styles.modeText, item.id === mode && styles.modeTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.summary}>
        Tổng {summary.total} · Tới hạn {summary.due} · Mới {summary.fresh}
      </Text>
      {status === 'loading' ? (
        <ActivityIndicator size="large" />
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text>Lỗi: {error}</Text>
          <Pressable style={styles.primaryButton} onPress={() => void reload()}>
            <Text style={styles.primaryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : current === null ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Chưa có thẻ — thêm từ ở tab Tổng quan.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.counter}>
            {safeIndex + 1}/{total}
          </Text>
          <Pressable
            style={styles.card}
            onPress={() => setRevealed((v) => !v)}
            accessibilityLabel="Lật thẻ"
          >
            {!revealed ? (
              <Text style={styles.cardWord}>{current.word}</Text>
            ) : (
              <View style={styles.cardBack}>
                {current.reading !== null && current.reading.trim() !== '' ? (
                  <Text style={styles.cardReading}>{current.reading}</Text>
                ) : null}
                <Text style={styles.cardMeaning}>{current.meaning}</Text>
              </View>
            )}
            <Text style={styles.flipHint}>BẤM ĐỂ LẬT</Text>
          </Pressable>
          {mode === 'anki' ? (
            !revealed ? (
              <Pressable style={styles.primaryButton} onPress={() => setRevealed(true)}>
                <Text style={styles.primaryText}>Hiện đáp án</Text>
              </Pressable>
            ) : (
              <View style={styles.ratings}>
                {RATINGS.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.rateButton}
                    onPress={() => void rate(item.id)}
                  >
                    <Text style={styles.rateText}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            )
          ) : (
            <View style={styles.nav}>
              <Pressable
                style={[styles.navButton, safeIndex === 0 && styles.disabled]}
                disabled={safeIndex === 0}
                onPress={() => {
                  setIndex(safeIndex - 1);
                  setRevealed(false);
                }}
              >
                <Text style={styles.navText}>Trước</Text>
              </Pressable>
              <Pressable
                style={[styles.navButton, safeIndex >= total - 1 && styles.disabled]}
                disabled={safeIndex >= total - 1}
                onPress={() => {
                  setIndex(safeIndex + 1);
                  setRevealed(false);
                }}
              >
                <Text style={styles.navText}>Tiếp theo</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      gap: 10,
      backgroundColor: t.bg,
    },
    modes: {
      flexDirection: 'row',
      gap: 8,
    },
    modeButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
      alignItems: 'center',
    },
    modeActive: {
      backgroundColor: t.primary,
      borderColor: t.primary,
    },
    modeText: {
      fontWeight: '600',
      color: t.btnFg,
    },
    modeTextActive: {
      color: t.primaryContrast,
    },
    summary: {
      textAlign: 'right',
      opacity: 0.7,
      color: t.text,
    },
    counter: {
      fontWeight: '700',
      color: t.text,
    },
    card: {
      height: 320,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    cardWord: {
      fontSize: 44,
      fontWeight: '800',
      color: t.text,
    },
    cardBack: {
      alignItems: 'center',
      gap: 8,
    },
    cardReading: {
      fontSize: 20,
      opacity: 0.7,
      color: t.text,
    },
    cardMeaning: {
      fontSize: 32,
      fontWeight: '700',
      textAlign: 'center',
      color: t.text,
    },
    flipHint: {
      position: 'absolute',
      top: 12,
      left: 16,
      fontSize: 11,
      letterSpacing: 1,
      opacity: 0.6,
      color: t.text,
    },
    nav: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
    },
    navButton: {
      minWidth: 140,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: t.primary,
      alignItems: 'center',
    },
    navText: {
      color: t.primaryContrast,
      fontWeight: '700',
      fontSize: 16,
    },
    primaryButton: {
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: t.primary,
      alignItems: 'center',
    },
    primaryText: {
      color: t.primaryContrast,
      fontWeight: '700',
      fontSize: 16,
    },
    ratings: {
      flexDirection: 'row',
      gap: 8,
    },
    rateButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.primary,
      alignItems: 'center',
    },
    rateText: {
      fontWeight: '700',
      color: t.text,
    },
    disabled: {
      opacity: 0.4,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    centerText: {
      color: t.text,
    },
  });
