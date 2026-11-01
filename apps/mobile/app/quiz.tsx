import {
  applyAnswer,
  applyHint,
  applyScope,
  buildQuestions,
  gradeAnswer,
  initialAttemptState,
  orderQuestions,
  remainingAttempts,
  selectFeedbackContent,
  selectWordsInScope,
  toCreateSessionInput,
  toOutcome,
  type AttemptState,
  type FolderDto,
  type GradedQuizItem,
  type QuizMode,
  type QuizResult,
  type VocabularyDto,
} from '@kanji-nest/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { request } from '../src/api/http';
import { ScopePicker } from '../src/components/ScopePicker';
import { useStoragePort } from '../src/db/DbProvider';
import { useScope } from '../src/scope/ScopeProvider';
import { useTheme, type AppTheme } from '../src/theme/ThemeProvider';

const MODES: { id: QuizMode; label: string; icon: string }[] = [
  { id: 'random', label: 'Ngẫu nhiên', icon: '🎲' },
  { id: 'reading', label: 'Dạng 1: Đọc', icon: '🗣️' },
  { id: 'meaning', label: 'Dạng 2: Dịch', icon: '📝' },
];

const TYPE_TITLE: Record<string, string> = {
  reading: 'DẠNG 1 · NHÌN CHỮ, NHẬP CÁCH ĐỌC',
  meaning: 'DẠNG 2 · NHÌN NGHĨA, DỊCH TIẾNG NHẬT',
};

const TYPE_HINT: Record<string, string> = {
  reading: 'Nhập cách đọc bằng Hiragana',
  meaning: 'Nhập Kanji hoặc Hiragana tương ứng',
};

export default function Quiz(): ReactElement {
  const port = useStoragePort();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { folderId, selection } = useScope();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState<VocabularyDto[]>([]);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [mode, setMode] = useState<QuizMode>('random');
  const [shuffled, setShuffled] = useState(true);
  const [seed, setSeed] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [attempt, setAttempt] = useState<AttemptState>(() => initialAttemptState());
  const [items, setItems] = useState<GradedQuizItem[]>([]);
  const [finished, setFinished] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(4);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showScopeConfig, setShowScopeConfig] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [vocabs, folderRows] = await Promise.all([
        port.vocabs.all(),
        port.folders.all(),
      ]);
      setAll(vocabs);
      setFolders(folderRows.filter((f) => f.deletedAt === null));
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

  const pool = useMemo(() => {
    const base = selectWordsInScope(all, folders, folderId);
    return selection.mode === 'all' ? base : applyScope(base, selection);
  }, [all, folders, folderId, selection]);

  const questions = useMemo(
    () => orderQuestions(buildQuestions(pool, mode), shuffled, seed),
    [pool, mode, shuffled, seed],
  );

  const total = questions.length;
  const current = total === 0 ? null : questions[Math.min(index, total - 1)];
  const progressPct =
    total === 0 ? 0 : Math.round((Math.min(index + 1, total) / total) * 100);
  const resolved = attempt.status !== 'answering';
  const currentVocab =
    current === null ? null : (pool.find((v) => v.id === current.vocabularyId) ?? null);
  const feedback =
    resolved && current !== null && currentVocab !== null
      ? selectFeedbackContent(currentVocab, current.type, toOutcome(attempt), false)
      : null;

  const currentFolderName = useMemo(() => {
    if (folderId === null) return 'Tất cả từ vựng';
    return folders.find((f) => f.id === folderId)?.name ?? 'Thư mục đã chọn';
  }, [folderId, folders]);

  const resetRound = useCallback(() => {
    setIndex(0);
    setInput('');
    setAttempt(initialAttemptState());
    setItems([]);
    setFinished(false);
    setSaveMessage(null);
    setRemaining(null);
  }, []);

  const chooseMode = (next: QuizMode): void => {
    setMode(next);
    resetRound();
  };

  const pushItem = (state: AttemptState): void => {
    if (current === null) return;
    const outcome = toOutcome(state);
    setItems((prev) => [
      ...prev,
      {
        vocabularyId: current.vocabularyId,
        prompt: current.prompt,
        userAnswer: outcome.userAnswer,
        acceptedAnswers: current.acceptedAnswers,
        isCorrect: outcome.isCorrect,
        attemptNo: outcome.attemptNo,
        usedHint: state.usedHint,
      },
    ]);
  };

  const submit = (): void => {
    if (current === null || resolved || input.trim() === '') return;
    const next = applyAnswer(attempt, gradeAnswer(input, current.acceptedAnswers), input);
    setAttempt(next);
    if (next.status !== 'answering') {
      pushItem(next);
      setRemaining(seconds);
    }
  };

  const hint = (): void => {
    if (resolved) return;
    const next = applyHint(attempt);
    setAttempt(next);
    pushItem(next);
    setRemaining(seconds);
  };

  const saveResult = async (res: QuizResult): Promise<void> => {
    try {
      await request('/quiz/sessions', {
        method: 'POST',
        body: toCreateSessionInput(res, { mode }),
      });
      setSaveMessage('✓ Đã lưu kết quả lên hệ thống');
    } catch {
      setSaveMessage('Đã lưu kết quả cục bộ (ngoại tuyến)');
    }
  };

  const advance = (): void => {
    setRemaining(null);
    if (index >= total - 1) {
      const res: QuizResult = {
        score: items.filter((i) => i.isCorrect).length,
        total: items.length,
        items,
      };
      setFinished(true);
      void saveResult(res);
    } else {
      setIndex(index + 1);
      setInput('');
      setAttempt(initialAttemptState());
    }
  };

  const result: QuizResult | null = finished
    ? { score: items.filter((i) => i.isCorrect).length, total: items.length, items }
    : null;

  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });
  useEffect(() => {
    if (!resolved || finished) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(id);
          advanceRef.current();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resolved, finished, index]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Scope Selector Bar (collapsible) */}
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
                ? `${total} câu hỏi`
                : `${selection.mode === 'first' ? 'Top' : 'Random'} ${selection.n} · ${total} câu`}
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
              onPress={() => chooseMode(item.id)}
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
              accessibilityLabel="Xáo trộn câu hỏi"
              accessibilityState={{ selected: shuffled }}
              style={({ pressed }) => [
                styles.toolButton,
                shuffled && styles.toolButtonActive,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                setShuffled((v) => !v);
                setSeed(Date.now());
                resetRound();
              }}
            >
              <Text style={[styles.toolGlyph, shuffled && styles.toolGlyphActive]}>⤨</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Làm lại từ câu đầu"
              style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
              onPress={() => {
                setSeed(Date.now());
                resetRound();
              }}
            >
              <Text style={styles.toolGlyph}>↺</Text>
            </Pressable>
          </View>

          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {total === 0 ? '0 / 0' : `Câu ${Math.min(index + 1, total)} / ${total}`}
            </Text>
          </View>

          {/* Quick timer stepper */}
          <View style={styles.timerChip}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Giảm thời gian tự chuyển"
              style={({ pressed }) => [styles.timerStepBtn, pressed && styles.pressed]}
              onPress={() => setSeconds((s) => Math.max(2, s - 1))}
            >
              <Text style={styles.timerStepGlyph}>−</Text>
            </Pressable>
            <Text style={styles.timerChipLabel}>⏱ {seconds}s</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tăng thời gian tự chuyển"
              style={({ pressed }) => [styles.timerStepBtn, pressed && styles.pressed]}
              onPress={() => setSeconds((s) => Math.min(10, s + 1))}
            >
              <Text style={styles.timerStepGlyph}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Progress bar */}
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progressPct }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {/* Main Content Area */}
      {status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.centerText}>Đang tạo bộ câu hỏi…</Text>
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
      ) : result !== null ? (
        /* Results View */
        <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultScrollContent}>
          <View style={styles.resultHeroCard}>
            <Text style={styles.resultTrophy}>
              {result.score / Math.max(1, result.total) >= 0.8
                ? '🏆'
                : result.score / Math.max(1, result.total) >= 0.5
                ? '⭐'
                : '📖'}
            </Text>
            <Text style={styles.resultHeroTitle}>Kết quả Luyện tập</Text>
            <View style={styles.resultScoreBadge}>
              <Text style={styles.resultScoreBig}>
                {result.score} <Text style={styles.resultScoreSub}>/ {result.total}</Text>
              </Text>
            </View>
            <Text style={styles.resultPercent}>
              Đạt {Math.round((result.score / Math.max(1, result.total)) * 100)}% chính xác
            </Text>
            {saveMessage !== null ? (
              <Text style={styles.saveMessageText}>{saveMessage}</Text>
            ) : null}
          </View>

          <Text style={styles.sectionHeaderTitle}>Chi tiết câu hỏi</Text>

          <View style={styles.reviewList}>
            {result.items.map((item, i) => (
              <View
                key={`${item.vocabularyId}-${i}`}
                style={[styles.reviewCard, item.isCorrect ? styles.reviewCardOk : styles.reviewCardFail]}
              >
                <View style={styles.reviewCardTop}>
                  <Text style={styles.reviewCardPrompt}>{item.prompt}</Text>
                  <View
                    style={[
                      styles.reviewStatusPill,
                      item.isCorrect ? styles.reviewStatusPillOk : styles.reviewStatusPillFail,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reviewStatusText,
                        item.isCorrect ? styles.reviewStatusTextOk : styles.reviewStatusTextFail,
                      ]}
                    >
                      {item.isCorrect ? '✓ Đúng' : '✗ Sai'}
                    </Text>
                  </View>
                </View>

                <View style={styles.reviewAnswerRow}>
                  <Text style={styles.reviewLabel}>Bạn nhập:</Text>
                  <Text
                    style={[
                      styles.reviewUserAnswer,
                      item.isCorrect ? styles.reviewAnswerOk : styles.reviewAnswerFail,
                    ]}
                  >
                    {item.userAnswer ?? '—'}
                  </Text>
                </View>

                {!item.isCorrect ? (
                  <View style={styles.reviewAnswerRow}>
                    <Text style={styles.reviewLabel}>Đáp án đúng:</Text>
                    <Text style={styles.reviewCorrectAnswer}>
                      {item.acceptedAnswers.join(' / ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.restartActionBtn, pressed && styles.pressed]}
            onPress={() => {
              setSeed(Date.now());
              resetRound();
            }}
          >
            <Text style={styles.restartActionText}>Luyện tập vòng mới ↺</Text>
          </Pressable>
        </ScrollView>
      ) : current === null ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Chưa có câu hỏi</Text>
          <Text style={styles.centerText}>
            Không tìm thấy từ vựng trong phạm vi đã chọn. Hãy thêm từ vựng mới hoặc đổi thư mục.
          </Text>
        </View>
      ) : (
        /* Question Card */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            style={styles.cardScrollView}
            contentContainerStyle={styles.cardContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.questionCard}>
              {/* Type Badge */}
              <View style={styles.questionTypeBar}>
                <View style={styles.questionTypePill}>
                  <Text style={styles.questionTypeIcon}>
                    {current.type === 'reading' ? '🗣️' : '📝'}
                  </Text>
                  <Text style={styles.questionTypeTitle}>{TYPE_TITLE[current.type]}</Text>
                </View>
              </View>

              {/* Main Prompt Word */}
              <View style={styles.promptZone}>
                <Text style={styles.promptWord} numberOfLines={2} adjustsFontSizeToFit>
                  {current.prompt}
                </Text>
                <Text style={styles.promptHint}>{TYPE_HINT[current.type]}</Text>
              </View>

              {/* Feedback Banner (shown after answering) */}
              {resolved && feedback !== null ? (
                <View
                  style={[
                    styles.feedbackCard,
                    feedback.isCorrect ? styles.feedbackCardOk : styles.feedbackCardNo,
                  ]}
                >
                  <View style={styles.feedbackHead}>
                    <Text style={feedback.isCorrect ? styles.feedbackStatusOk : styles.feedbackStatusNo}>
                      {feedback.isCorrect ? '✓ Chính xác!' : '✗ Chưa chính xác'}
                    </Text>
                  </View>

                  <Text style={styles.feedbackMeaning}>{feedback.meaning}</Text>

                  {feedback.chips.length > 0 ? (
                    <View style={styles.feedbackChipsRow}>
                      {feedback.chips.map((chip) => (
                        <View key={chip.label} style={styles.feedbackChipPill}>
                          <Text style={styles.feedbackChipLabel}>{chip.label}: </Text>
                          <Text style={styles.feedbackChipVal}>{chip.value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {feedback.example !== null && feedback.example.trim() !== '' ? (
                    <View style={styles.feedbackExampleBox}>
                      <Text style={styles.feedbackExampleIcon}>💬</Text>
                      <Text style={styles.feedbackExampleText}>{feedback.example}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Input Zone */}
              <View style={styles.inputSection}>
                <TextInput
                  style={[
                    styles.textInput,
                    resolved && (feedback?.isCorrect ? styles.inputOk : styles.inputNo),
                  ]}
                  value={input}
                  onChangeText={setInput}
                  editable={!resolved}
                  placeholder="Nhập câu trả lời…"
                  placeholderTextColor={theme.muted}
                  aria-label="Câu trả lời"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={submit}
                />

                {!resolved && attempt.attempts > 0 ? (
                  <View style={styles.retryBadge}>
                    <Text style={styles.retryText}>
                      ⚠️ Chưa đúng. Bạn còn {remainingAttempts(attempt)} lần thử.
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons */}
              {!resolved ? (
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.hintBtn,
                      pressed && styles.pressed,
                    ]}
                    onPress={hint}
                  >
                    <Text style={styles.hintBtnText}>Gợi ý 💡</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.submitBtn,
                      input.trim() === '' && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                    onPress={submit}
                    disabled={input.trim() === ''}
                  >
                    <Text style={styles.submitBtnText}>Kiểm tra ✓</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.advanceBtn, pressed && styles.pressed]}
                  onPress={advance}
                >
                  <Text style={styles.advanceBtnText}>
                    {index >= total - 1
                      ? 'Nộp bài & Xem kết quả 🏁'
                      : `Câu tiếp theo › (${remaining ?? seconds}s)`}
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
      paddingHorizontal: 4,
    },
    modeTabActive: {
      backgroundColor: t.primary,
    },
    modeIcon: {
      fontSize: 13,
    },
    modeLabel: {
      fontSize: 12,
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
    timerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 4,
      paddingVertical: 2,
      gap: 4,
    },
    timerStepBtn: {
      width: 26,
      height: 26,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surface,
    },
    timerStepGlyph: {
      fontSize: 14,
      fontWeight: '800',
      color: t.text,
      lineHeight: 16,
    },
    timerChipLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: t.text,
      paddingHorizontal: 2,
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
    // Question Card
    keyboardAvoid: {
      flex: 1,
    },
    cardScrollView: {
      flex: 1,
    },
    cardContentContainer: {
      flexGrow: 1,
    },
    questionCard: {
      flex: 1,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: 20,
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    questionTypeBar: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    questionTypePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.btnBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      gap: 6,
      borderWidth: 1,
      borderColor: t.border,
    },
    questionTypeIcon: {
      fontSize: 13,
    },
    questionTypeTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: t.muted,
      letterSpacing: 0.6,
    },
    promptZone: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    promptWord: {
      fontSize: 42,
      fontWeight: '800',
      color: t.text,
      textAlign: 'center',
      letterSpacing: 1.2,
    },
    promptHint: {
      fontSize: 13,
      color: t.muted,
      textAlign: 'center',
    },
    // Feedback Banner
    feedbackCard: {
      borderRadius: 16,
      padding: 14,
      gap: 8,
      borderWidth: 1.5,
    },
    feedbackCardOk: {
      backgroundColor: '#f0fdf4',
      borderColor: '#86efac',
    },
    feedbackCardNo: {
      backgroundColor: '#fef2f2',
      borderColor: '#fca5a5',
    },
    feedbackHead: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    feedbackStatusOk: {
      fontSize: 15,
      fontWeight: '800',
      color: '#16a34a',
    },
    feedbackStatusNo: {
      fontSize: 15,
      fontWeight: '800',
      color: '#dc2626',
    },
    feedbackMeaning: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1e293b',
    },
    feedbackChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    feedbackChipPill: {
      flexDirection: 'row',
      backgroundColor: '#ffffff',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    feedbackChipLabel: {
      fontSize: 11,
      color: '#64748b',
      fontWeight: '600',
    },
    feedbackChipVal: {
      fontSize: 11,
      color: '#0f172a',
      fontWeight: '700',
    },
    feedbackExampleBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      padding: 8,
      borderRadius: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    feedbackExampleIcon: {
      fontSize: 12,
    },
    feedbackExampleText: {
      flex: 1,
      fontSize: 12,
      color: '#334155',
      fontStyle: 'italic',
    },
    // Input
    inputSection: {
      gap: 6,
      marginTop: 'auto',
    },
    textInput: {
      minHeight: 52,
      borderWidth: 1.5,
      borderColor: t.primary,
      backgroundColor: t.btnBg,
      color: t.text,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    inputOk: {
      borderColor: '#16a34a',
    },
    inputNo: {
      borderColor: '#dc2626',
    },
    retryBadge: {
      alignItems: 'center',
    },
    retryText: {
      fontSize: 12,
      fontWeight: '700',
      color: t.danger,
    },
    // Bottom Buttons
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    hintBtn: {
      flex: 1,
      minHeight: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hintBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: t.text,
    },
    submitBtn: {
      flex: 1.5,
      minHeight: 50,
      borderRadius: 16,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: t.primaryContrast,
    },
    advanceBtn: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    advanceBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: t.primaryContrast,
    },
    // Results Screen
    resultScroll: {
      flex: 1,
    },
    resultScrollContent: {
      paddingBottom: 20,
      gap: 16,
    },
    resultHeroCard: {
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: 24,
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    resultTrophy: {
      fontSize: 44,
      marginBottom: 2,
    },
    resultHeroTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: t.text,
    },
    resultScoreBadge: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.border,
    },
    resultScoreBig: {
      fontSize: 32,
      fontWeight: '800',
      color: t.primary,
    },
    resultScoreSub: {
      fontSize: 18,
      fontWeight: '600',
      color: t.muted,
    },
    resultPercent: {
      fontSize: 14,
      fontWeight: '700',
      color: t.text,
    },
    saveMessageText: {
      fontSize: 12,
      color: t.muted,
      marginTop: 4,
    },
    sectionHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: t.text,
      marginTop: 8,
    },
    reviewList: {
      gap: 10,
    },
    reviewCard: {
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: t.surface,
      padding: 14,
      gap: 8,
    },
    reviewCardOk: {
      borderColor: '#86efac',
    },
    reviewCardFail: {
      borderColor: '#fca5a5',
    },
    reviewCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reviewCardPrompt: {
      fontSize: 20,
      fontWeight: '800',
      color: t.text,
    },
    reviewStatusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    reviewStatusPillOk: {
      backgroundColor: '#dcfce7',
    },
    reviewStatusPillFail: {
      backgroundColor: '#fee2e2',
    },
    reviewStatusText: {
      fontSize: 11,
      fontWeight: '800',
    },
    reviewStatusTextOk: {
      color: '#16a34a',
    },
    reviewStatusTextFail: {
      color: '#dc2626',
    },
    reviewAnswerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    reviewLabel: {
      fontSize: 12,
      color: t.muted,
    },
    reviewUserAnswer: {
      fontSize: 14,
      fontWeight: '700',
    },
    reviewAnswerOk: {
      color: '#16a34a',
    },
    reviewAnswerFail: {
      color: '#dc2626',
    },
    reviewCorrectAnswer: {
      fontSize: 14,
      fontWeight: '700',
      color: t.primary,
    },
    restartActionBtn: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    restartActionText: {
      fontSize: 16,
      fontWeight: '700',
      color: t.primaryContrast,
    },
    // Center / Empty
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
