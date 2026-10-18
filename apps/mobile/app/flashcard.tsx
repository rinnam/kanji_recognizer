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
  { id: 'again', label: '1 · Lại' },
  { id: 'hard', label: '2 · Khó' },
  { id: 'good', label: '3 · Tốt' },
  { id: 'easy', label: '4 · Dễ' },
];

function shuffleIds(ids: readonly string[]): string[] {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[index]];
  }
  return shuffled;
}

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
  const [shuffled, setShuffled] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<string[] | null>(null);

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
  const baseDeck = useMemo(() => {
    const modeDeck = buildQueue(scopeBase, mode, now);
    return selection.mode === 'all' ? modeDeck : applyScope(modeDeck, selection);
  }, [scopeBase, mode, now, selection]);
  const deck = useMemo(() => {
    if (!shuffled || shuffleOrder === null) return baseDeck;
    const byId = new Map(baseDeck.map((vocabulary) => [vocabulary.id, vocabulary] as const));
    const ordered = shuffleOrder.flatMap((id) => {
      const vocabulary = byId.get(id);
      return vocabulary === undefined ? [] : [vocabulary];
    });
    const orderedIds = new Set(ordered.map((vocabulary) => vocabulary.id));
    return [...ordered, ...baseDeck.filter((vocabulary) => !orderedIds.has(vocabulary.id))];
  }, [baseDeck, shuffled, shuffleOrder]);
  const summary = useMemo(() => summarize(scopeBase, now), [scopeBase, now]);
  const total = deck.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = total === 0 ? null : deck[safeIndex];
  const progressPct = total === 0 ? 0 : Math.round(((safeIndex + 1) / total) * 100);

  const changeMode = useCallback((next: FlashcardMode) => {
    setMode(next);
    setIndex(0);
    setRevealed(false);
    setShuffled(false);
    setShuffleOrder(null);
  }, []);

  const toggleShuffle = (): void => {
    if (shuffled) {
      setShuffled(false);
      setShuffleOrder(null);
    } else {
      setShuffleOrder(shuffleIds(baseDeck.map((vocabulary) => vocabulary.id)));
      setShuffled(true);
    }
    setIndex(0);
    setRevealed(false);
  };

  const restart = (): void => {
    setIndex(0);
    setRevealed(false);
    setNow(new Date());
  };

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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScopePicker />
      <View style={styles.modes}>
        {MODES.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: item.id === mode }}
            style={({ pressed }) => [
              styles.modeButton,
              item.id === mode && styles.modeActive,
              pressed && styles.pressed,
            ]}
            onPress={() => changeMode(item.id)}
          >
            <Text style={[styles.modeText, item.id === mode && styles.modeTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.tools}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xáo trộn thẻ"
          accessibilityState={{ selected: shuffled }}
          style={({ pressed }) => [
            styles.iconButton,
            shuffled && styles.iconButtonActive,
            pressed && styles.pressed,
          ]}
          onPress={toggleShuffle}
        >
          <Text style={[styles.iconGlyph, shuffled && styles.iconGlyphActive]} accessible={false}>
            ⤨
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Làm lại từ thẻ đầu"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={restart}
        >
          <Text style={styles.iconGlyph} accessible={false}>↺</Text>
        </Pressable>
        <Text style={styles.counter} accessibilityRole="text">
          {total === 0 ? '0/0' : `${safeIndex + 1}/${total}`}
        </Text>
      </View>
      <View style={styles.progressPanel}>
        <View style={styles.progressHeading}>
          <Text style={styles.progressLabel}>TIẾN ĐỘ HỌC</Text>
          <Text style={styles.summary}>
            Tổng {summary.total} · Tới hạn {summary.due} · Mới {summary.fresh}
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Tiến độ học"
          accessibilityValue={{ min: 0, max: 100, now: progressPct }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>
      {status === 'loading' ? (
        <ActivityIndicator size="large" />
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Lỗi: {error}</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => void reload()}
          >
            <Text style={styles.primaryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : current === null ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Chưa có thẻ — thêm từ ở tab Tổng quan.</Text>
        </View>
      ) : (
        <>
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Lật thẻ"
            accessibilityHint={revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
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
            <Text style={styles.flipHint}>{revealed ? 'CHẠM ĐỂ ẨN' : 'CHẠM ĐỂ LẬT'}</Text>
          </Pressable>
          {mode === 'anki' ? (
            !revealed ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                onPress={() => setRevealed(true)}
              >
                <Text style={styles.primaryText}>Hiện đáp án <Text accessible={false}>⌄</Text></Text>
              </Pressable>
            ) : (
              <View style={styles.ratings}>
                {RATINGS.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.rateButton, pressed && styles.pressed]}
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
                accessibilityLabel="Thẻ trước"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.navButton,
                  safeIndex === 0 && styles.disabled,
                  pressed && styles.pressed,
                ]}
                disabled={safeIndex === 0}
                onPress={() => {
                  setIndex(safeIndex - 1);
                  setRevealed(false);
                }}
              >
                <Text style={styles.navText} accessible={false}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Thẻ tiếp theo"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.navButton,
                  safeIndex >= total - 1 && styles.disabled,
                  pressed && styles.pressed,
                ]}
                disabled={safeIndex >= total - 1}
                onPress={() => {
                  setIndex(safeIndex + 1);
                  setRevealed(false);
                }}
              >
                <Text style={styles.navText} accessible={false}>›</Text>
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
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 12,
      gap: 12,
      backgroundColor: t.bg,
    },
    modes: {
      flexDirection: 'row',
      gap: 8,
    },
    modeButton: {
      minHeight: 44,
      justifyContent: 'center',
      flex: 1,
      paddingHorizontal: 6,
      paddingVertical: 8,
      borderRadius: 13,
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
    tools: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.btnBorder,
      borderRadius: 13,
      backgroundColor: t.btnBg,
    },
    iconButtonActive: {
      borderColor: t.primary,
      backgroundColor: t.primary,
    },
    iconGlyph: {
      color: t.btnFg,
      fontSize: 24,
      fontWeight: '700',
    },
    iconGlyphActive: {
      color: t.primaryContrast,
    },
    progressPanel: {
      gap: 8,
      padding: 13,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    progressHeading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    progressLabel: {
      color: t.text,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    progressTrack: {
      height: 7,
      overflow: 'hidden',
      borderRadius: 99,
      backgroundColor: t.btnBg,
    },
    progressFill: {
      height: '100%',
      borderRadius: 99,
      backgroundColor: t.primary,
    },
    summary: {
      flexShrink: 1,
      color: t.muted,
      fontSize: 12,
      textAlign: 'right',
    },
    counter: {
      fontWeight: '700',
      color: t.text,
      fontSize: 14,
      marginLeft: 'auto',
    },
    card: {
      flex: 1,
      minHeight: 220,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    cardPressed: {
      borderColor: t.primary,
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
      fontSize: 12,
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
      minHeight: 52,
      justifyContent: 'center',
      minWidth: 64,
      paddingHorizontal: 22,
      borderRadius: 14,
      backgroundColor: t.primary,
      alignItems: 'center',
    },
    navText: {
      color: t.primaryContrast,
      fontWeight: '700',
      fontSize: 32,
      lineHeight: 36,
    },
    primaryButton: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: 14,
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
      minHeight: 48,
      justifyContent: 'center',
      flex: 1,
      paddingHorizontal: 4,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.primary,
      alignItems: 'center',
    },
    rateText: {
      fontWeight: '700',
      color: t.text,
      fontSize: 13,
    },
    disabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.72,
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
    errorText: {
      color: t.danger,
      textAlign: 'center',
    },
  });
