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

const MODES: { id: FlashcardMode; label: string; icon: string }[] = [
  { id: 'normal', label: 'Thường', icon: '📖' },
  { id: 'progress', label: 'Tiến độ', icon: '📈' },
  { id: 'anki', label: 'Anki SRS', icon: '🧠' },
];

const RATINGS: {
  id: SrsRating;
  label: string;
  sub: string;
  color: string;
}[] = [
  { id: 'again', label: 'Lại', sub: '< 1 ngày', color: '#dc2626' },
  { id: 'hard', label: 'Khó', sub: '1-2 ngày', color: '#d97706' },
  { id: 'good', label: 'Tốt', sub: '3-5 ngày', color: '#2563eb' },
  { id: 'easy', label: 'Dễ', sub: '> 7 ngày', color: '#16a34a' },
];

function shuffleIds(ids: readonly string[]): string[] {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[index]];
  }
  return shuffled;
}

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
  const [showScopeConfig, setShowScopeConfig] = useState(false);

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

  const currentFolderName = useMemo(() => {
    if (folderId === null) return 'Tất cả từ vựng';
    return folders.find((f) => f.id === folderId)?.name ?? 'Thư mục đã chọn';
  }, [folderId, folders]);

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
      {/* Scope Selector Bar (collapsible to keep space clean) */}
      <View style={styles.scopeBarContainer}>
        <Pressable
          style={({ pressed }) => [styles.scopeSummaryBtn, pressed && styles.pressed]}
          onPress={() => setShowScopeConfig((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Chọn phạm vi từ vựng"
        >
          <View style={styles.scopeIconPill}>
            <Text style={styles.scopeIconText}>📁</Text>
          </View>
          <View style={styles.scopeInfo}>
            <Text style={styles.scopeTitle} numberOfLines={1}>
              {currentFolderName}
            </Text>
            <Text style={styles.scopeSubText}>
              {selection.mode === 'all'
                ? `${total} thẻ`
                : `${selection.mode === 'first' ? 'Top' : 'Random'} ${selection.n} · ${total} thẻ`}
            </Text>
          </View>
          <Text style={styles.scopeChevron}>{showScopeConfig ? '▲' : '▼'}</Text>
        </Pressable>

        {showScopeConfig ? (
          <View style={styles.scopeExpandedArea}>
            <ScopePicker />
          </View>
        ) : null}
      </View>

      {/* Mode Segmented Tabs */}
      <View style={styles.modesTrack}>
        {MODES.map((item) => {
          const isActive = item.id === mode;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.modeTab,
                isActive && styles.modeTabActive,
                pressed && styles.pressed,
              ]}
              onPress={() => changeMode(item.id)}
            >
              <Text style={styles.modeIcon}>{item.icon}</Text>
              <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Control Bar & Progress */}
      <View style={styles.metaPanel}>
        <View style={styles.metaRow}>
          <View style={styles.toolsGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xáo trộn thẻ"
              accessibilityState={{ selected: shuffled }}
              style={({ pressed }) => [
                styles.toolButton,
                shuffled && styles.toolButtonActive,
                pressed && styles.pressed,
              ]}
              onPress={toggleShuffle}
            >
              <Text style={[styles.toolGlyph, shuffled && styles.toolGlyphActive]}>⤨</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Làm lại từ thẻ đầu"
              style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
              onPress={restart}
            >
              <Text style={styles.toolGlyph}>↺</Text>
            </Pressable>
          </View>

          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {total === 0 ? '0 / 0' : `${safeIndex + 1} / ${total}`}
            </Text>
          </View>

          {mode === 'anki' ? (
            <View style={styles.ankiStatusBadge}>
              <Text style={styles.ankiStatusText}>
                Hạn {summary.due} · Mới {summary.fresh}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Progress track */}
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progressPct }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {/* Main Flashcard Card Body */}
      {status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.centerText}>Đang chuẩn bị bộ thẻ…</Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Lỗi: {error}</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.pressed]}
            onPress={() => void reload()}
          >
            <Text style={styles.primaryActionText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : current === null ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Chưa có thẻ nào</Text>
          <Text style={styles.centerText}>
            Không tìm thấy từ vựng trong phạm vi đã chọn. Hãy thêm từ vựng mới hoặc đổi thư mục.
          </Text>
        </View>
      ) : (
        <View style={styles.cardContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              revealed && styles.cardRevealed,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Lật thẻ flashcard"
            accessibilityHint={revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
          >
            {/* Card Header Tags */}
            <View style={styles.cardTopBar}>
              <View style={styles.sideBadge}>
                <Text style={styles.sideBadgeText}>
                  {revealed ? 'MẶT SAU · ĐÁP ÁN' : 'MẶT TRƯỚC · TỪ VỰNG'}
                </Text>
              </View>
              <View style={styles.flipIconPill}>
                <Text style={styles.flipIconGlyph}>🔄</Text>
              </View>
            </View>

            {/* Card Body */}
            {!revealed ? (
              <View style={styles.cardFrontContent}>
                <Text style={styles.cardWord} numberOfLines={2} adjustsFontSizeToFit>
                  {current.word}
                </Text>
                <View style={styles.flipHintContainer}>
                  <Text style={styles.flipHintText}>👆 Chạm thẻ để lật đáp án</Text>
                </View>
              </View>
            ) : (
              <View style={styles.cardBackContent}>
                <Text style={styles.backWordMini}>{current.word}</Text>

                {current.reading !== null && current.reading.trim() !== '' ? (
                  <View style={styles.readingPill}>
                    <Text style={styles.cardReading}>【 {current.reading} 】</Text>
                  </View>
                ) : null}

                <Text style={styles.cardMeaning}>{current.meaning}</Text>

                {current.example !== null && current.example.trim() !== '' ? (
                  <View style={styles.exampleBox}>
                    <Text style={styles.exampleIcon}>💬</Text>
                    <Text style={styles.exampleText} numberOfLines={3}>
                      {current.example}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.flipHintContainer}>
                  <Text style={styles.flipHintText}>👆 Chạm thẻ để quay lại mặt trước</Text>
                </View>
              </View>
            )}
          </Pressable>

          {/* Bottom Actions Bar */}
          {mode === 'anki' ? (
            !revealed ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.revealActionBtn, pressed && styles.pressed]}
                onPress={() => setRevealed(true)}
              >
                <Text style={styles.revealActionText}>Hiện đáp án 👁️</Text>
              </Pressable>
            ) : (
              <View style={styles.ankiRatingsRow}>
                {RATINGS.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.ankiRateBtn,
                      { borderColor: item.color },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => void rate(item.id)}
                  >
                    <Text style={[styles.ankiRateLabel, { color: item.color }]}>
                      {item.label}
                    </Text>
                    <Text style={styles.ankiRateSub}>{item.sub}</Text>
                  </Pressable>
                ))}
              </View>
            )
          ) : (
            <View style={styles.navRow}>
              <Pressable
                accessibilityLabel="Thẻ trước"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.navBtn,
                  styles.navBtnPrev,
                  safeIndex === 0 && styles.disabled,
                  pressed && styles.pressed,
                ]}
                disabled={safeIndex === 0}
                onPress={() => {
                  setIndex(safeIndex - 1);
                  setRevealed(false);
                }}
              >
                <Text style={styles.navBtnPrevText}>‹ Trước</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Thẻ tiếp theo"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.navBtn,
                  styles.navBtnNext,
                  safeIndex >= total - 1 && styles.disabled,
                  pressed && styles.pressed,
                ]}
                disabled={safeIndex >= total - 1}
                onPress={() => {
                  setIndex(safeIndex + 1);
                  setRevealed(false);
                }}
              >
                <Text style={styles.navBtnNextText}>Tiếp ›</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      gap: 10,
      backgroundColor: t.bg,
    },
    // Scope Bar Collapsible
    scopeBarContainer: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      overflow: 'hidden',
    },
    scopeSummaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 44,
      gap: 10,
    },
    scopeIconPill: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: t.btnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scopeIconText: {
      fontSize: 16,
    },
    scopeInfo: {
      flex: 1,
    },
    scopeTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: t.text,
    },
    scopeSubText: {
      fontSize: 11,
      color: t.muted,
      marginTop: 1,
    },
    scopeChevron: {
      fontSize: 12,
      color: t.muted,
      paddingRight: 4,
    },
    scopeExpandedArea: {
      borderTopWidth: 1,
      borderTopColor: t.border,
      padding: 12,
      backgroundColor: t.bg,
    },
    // Mode Segmented Bar
    modesTrack: {
      flexDirection: 'row',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: 4,
      gap: 4,
    },
    modeTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 38,
      borderRadius: 10,
      gap: 6,
      paddingHorizontal: 6,
    },
    modeTabActive: {
      backgroundColor: t.primary,
    },
    modeIcon: {
      fontSize: 14,
    },
    modeLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: t.text,
    },
    modeLabelActive: {
      color: t.primaryContrast,
      fontWeight: '700',
    },
    // Meta / Tools / Progress Panel
    metaPanel: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toolsGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    toolButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
    },
    toolButtonActive: {
      backgroundColor: t.primary,
      borderColor: t.primary,
    },
    toolGlyph: {
      fontSize: 18,
      fontWeight: '700',
      color: t.btnFg,
    },
    toolGlyphActive: {
      color: t.primaryContrast,
    },
    counterBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.border,
    },
    counterText: {
      fontSize: 13,
      fontWeight: '800',
      color: t.text,
      letterSpacing: 0.5,
    },
    ankiStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: t.btnBg,
    },
    ankiStatusText: {
      fontSize: 11,
      fontWeight: '600',
      color: t.muted,
    },
    progressTrack: {
      height: 6,
      borderRadius: 99,
      backgroundColor: t.btnBg,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 99,
      backgroundColor: t.primary,
    },
    // Flashcard Hero Card
    cardContainer: {
      flex: 1,
      gap: 12,
    },
    card: {
      flex: 1,
      minHeight: 280,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: 20,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    cardRevealed: {
      borderColor: t.primary,
    },
    cardPressed: {
      opacity: 0.96,
    },
    cardTopBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sideBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: t.btnBg,
    },
    sideBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: t.muted,
      letterSpacing: 0.8,
    },
    flipIconPill: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.btnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flipIconGlyph: {
      fontSize: 12,
    },
    cardFrontContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    cardWord: {
      fontSize: 46,
      fontWeight: '800',
      color: t.text,
      textAlign: 'center',
      letterSpacing: 1.2,
    },
    flipHintContainer: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: t.btnBg,
      marginTop: 'auto',
    },
    flipHintText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.muted,
    },
    cardBackContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    backWordMini: {
      fontSize: 18,
      color: t.muted,
      fontWeight: '600',
    },
    readingPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.border,
    },
    cardReading: {
      fontSize: 22,
      fontWeight: '700',
      color: t.primary,
    },
    cardMeaning: {
      fontSize: 28,
      fontWeight: '800',
      color: t.text,
      textAlign: 'center',
      marginHorizontal: 10,
    },
    exampleBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.btnBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      maxWidth: '95%',
      borderWidth: 1,
      borderColor: t.border,
    },
    exampleIcon: {
      fontSize: 14,
    },
    exampleText: {
      flex: 1,
      fontSize: 13,
      color: t.text,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    // Bottom Action Row (Normal Mode)
    navRow: {
      flexDirection: 'row',
      gap: 10,
    },
    navBtn: {
      minHeight: 50,
      flex: 1,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBtnPrev: {
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.surface,
    },
    navBtnPrevText: {
      fontSize: 16,
      fontWeight: '700',
      color: t.text,
    },
    navBtnNext: {
      backgroundColor: t.primary,
    },
    navBtnNextText: {
      fontSize: 16,
      fontWeight: '700',
      color: t.primaryContrast,
    },
    // Bottom Action Row (Anki SRS Mode)
    revealActionBtn: {
      minHeight: 50,
      borderRadius: 16,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    revealActionText: {
      fontSize: 16,
      fontWeight: '700',
      color: t.primaryContrast,
    },
    ankiRatingsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    ankiRateBtn: {
      flex: 1,
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    ankiRateLabel: {
      fontSize: 14,
      fontWeight: '800',
    },
    ankiRateSub: {
      fontSize: 10,
      color: t.muted,
      marginTop: 2,
    },
    // Empty & Loading State
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 12,
    },
    centerText: {
      fontSize: 14,
      color: t.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: t.text,
    },
    errorText: {
      fontSize: 15,
      color: t.danger,
      textAlign: 'center',
    },
    primaryActionBtn: {
      minHeight: 44,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryActionText: {
      fontSize: 15,
      fontWeight: '700',
      color: t.primaryContrast,
    },
    disabled: {
      opacity: 0.35,
    },
    pressed: {
      opacity: 0.72,
    },
  });
