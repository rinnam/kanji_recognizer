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

const MODES: { id: QuizMode; label: string }[] = [
  { id: 'random', label: 'Ngẫu nhiên' },
  { id: 'reading', label: 'Dạng 1' },
  { id: 'meaning', label: 'Dạng 2' },
];

const TYPE_TITLE: Record<string, string> = {
  reading: 'DẠNG 1: NHÌN CHỮ, NHẬP CÁCH ĐỌC',
  meaning: 'DẠNG 2: NHÌN NGHĨA, DỊCH SANG TIẾNG NHẬT',
};

const TYPE_HINT: Record<string, string> = {
  reading: 'Nhập cách đọc bằng Hiragana',
  meaning: 'Nhập Hiragana hoặc Kanji tương ứng',
};

/**
 * Quiz mobile (M4): chọn bộ theo phạm vi → sinh câu (core) → trả lời tối đa
 * 3 lần + gợi ý → phản hồi → kết quả + lưu BE (POST /quiz/sessions, lỗi mạng
 * vẫn giữ kết quả cục bộ). Chưa có đếm ngược tự chuyển (M5).
 */
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
  const [seconds, setSeconds] = useState(5);
  const [remaining, setRemaining] = useState<number | null>(null);

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

  const saveResult = async (result: QuizResult): Promise<void> => {
    try {
      await request('/quiz/sessions', {
        method: 'POST',
        body: toCreateSessionInput(result, { mode }),
      });
      setSaveMessage('Đã lưu phiên lên máy chủ.');
    } catch (err) {
      setSaveMessage(
        `Không lưu được phiên (vẫn giữ kết quả): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const advance = (): void => {
    setRemaining(null);
    if (index >= total - 1) {
      const result: QuizResult = {
        score: items.filter((i) => i.isCorrect).length,
        total: items.length,
        items,
      };
      setFinished(true);
      void saveResult(result);
    } else {
      setIndex(index + 1);
      setInput('');
      setAttempt(initialAttemptState());
    }
  };

  const result: QuizResult | null = finished
    ? { score: items.filter((i) => i.isCorrect).length, total: items.length, items }
    : null;

  // Đếm ngược tự chuyển sau khi chốt câu (setState chỉ trong callback interval).
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
            onPress={() => chooseMode(item.id)}
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
          accessibilityState={{ selected: shuffled }}
          style={({ pressed }) => [
            styles.iconButton,
            shuffled && styles.iconButtonActive,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setShuffled((v) => !v);
            setSeed(Date.now());
            resetRound();
          }}
          accessibilityLabel="Xáo trộn câu"
        >
          <Text style={[styles.iconGlyph, shuffled && styles.iconGlyphActive]} accessible={false}>
            ⤨
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={() => {
            setSeed(Date.now());
            resetRound();
          }}
          accessibilityLabel="Làm lại từ câu đầu"
        >
          <Text style={styles.iconGlyph} accessible={false}>↺</Text>
        </Pressable>
        <View style={styles.timer}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.timerButton, pressed && styles.pressed]}
            onPress={() => setSeconds((s) => Math.max(1, s - 1))}
            accessibilityLabel="Giảm giây tự chuyển"
          >
            <Text style={styles.timerText}>−</Text>
          </Pressable>
          <Text style={styles.timerText} accessibilityLabel={`Tự chuyển sau ${seconds} giây`}>
            {seconds}s
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.timerButton, pressed && styles.pressed]}
            onPress={() => setSeconds((s) => Math.min(10, s + 1))}
            accessibilityLabel="Tăng giây tự chuyển"
          >
            <Text style={styles.timerText}>+</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.progressPanel}>
        <View style={styles.progressHeading}>
          <Text style={styles.progressLabel}>TIẾN ĐỘ KIỂM TRA</Text>
          <Text style={styles.counter}>
            {total === 0 ? '0/0' : `${Math.min(index + 1, total)}/${total}`}
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Tiến độ kiểm tra"
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
          <Text style={styles.centerText}>Lỗi: {error}</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => void reload()}
          >
            <Text style={styles.primaryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : result !== null ? (
        <ScrollView style={styles.result}>
          <Text style={styles.score}>
            Điểm: {result.score} / {result.total}
          </Text>
          {saveMessage !== null ? <Text style={styles.bodyText}>{saveMessage}</Text> : null}
          {result.items.map((item, i) => (
            <View key={`${item.vocabularyId}-${i}`} style={styles.reviewRow}>
              <Text style={styles.reviewPrompt}>{item.prompt}</Text>
              <Text style={styles.bodyText}>
                Bạn gõ: {item.userAnswer ?? '—'} {item.isCorrect ? '✓' : '✗'}
              </Text>
              {!item.isCorrect ? (
                <Text style={styles.bodyText}>Đáp án: {item.acceptedAnswers.join(' / ')}</Text>
              ) : null}
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => {
              setSeed(Date.now());
              resetRound();
            }}
          >
            <Text style={styles.primaryText}>Làm lại</Text>
          </Pressable>
        </ScrollView>
      ) : current === null ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Chưa có câu hỏi — thêm từ ở tab Tổng quan.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.questionHeader}>
            <View style={styles.questionIcon} accessible={false}>
              <Text style={styles.questionIconText}>?</Text>
            </View>
            <Text style={styles.cardTitle}>{TYPE_TITLE[current.type]}</Text>
          </View>
          <View style={styles.questionZone}>
            <Text style={styles.question}>{current.prompt}</Text>
            <Text style={styles.questionHint}>{TYPE_HINT[current.type]}</Text>
          </View>
          {resolved && feedback !== null ? (
            <View style={styles.feedback}>
              <Text style={feedback.isCorrect ? styles.ok : styles.no}>
                {feedback.isCorrect ? '✓ Chính xác!' : '✗ Chưa đúng — đáp án đúng'}
              </Text>
              <Text style={styles.meaning}>{feedback.meaning}</Text>
              {feedback.chips.map((chip) => (
                <Text key={chip.label} style={styles.bodyText}>
                  {chip.label}: {chip.value}
                </Text>
              ))}
              {feedback.example !== null ? (
                <Text style={styles.bodyText}>{feedback.example}</Text>
              ) : null}
            </View>
          ) : null}
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            editable={!resolved}
            placeholder="Nhập câu trả lời…"
            placeholderTextColor={theme.muted}
            aria-label="Câu trả lời"
            onSubmitEditing={submit}
          />
          {!resolved && attempt.attempts > 0 ? (
            <Text style={styles.retry}>Chưa đúng. Còn {remainingAttempts(attempt)} lần.</Text>
          ) : null}
          {!resolved ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                onPress={hint}
              >
                <Text style={styles.modeText}>Gợi ý</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.primaryButtonInline,
                  pressed && styles.pressed,
                ]}
                onPress={submit}
                disabled={input.trim() === ''}
              >
                <Text style={styles.primaryText}>Kiểm tra</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={advance}
            >
              <Text style={styles.primaryText}>
                {index >= total - 1 ? 'Nộp bài' : `Tiếp (${remaining ?? seconds}s)`}
              </Text>
            </Pressable>
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
      paddingTop: 4,
      paddingBottom: 12,
      gap: 10,
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
      paddingHorizontal: 3,
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
      fontSize: 13,
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
    counter: {
      marginLeft: 'auto',
      fontWeight: '700',
      color: t.text,
    },
    timer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timerButton: {
      minWidth: 44,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerText: {
      color: t.text,
      fontWeight: '700',
    },
    progressPanel: {
      gap: 8,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    progressHeading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    card: {
      flex: 1,
      minHeight: 240,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: 18,
      gap: 14,
    },
    questionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    questionIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: t.btnBg,
    },
    questionIconText: {
      color: t.primary,
      fontSize: 18,
      fontWeight: '800',
    },
    cardTitle: {
      flex: 1,
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 0.6,
      fontWeight: '800',
      color: t.text,
    },
    questionZone: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    question: {
      fontSize: 36,
      fontWeight: '800',
      textAlign: 'center',
      color: t.text,
    },
    questionHint: {
      color: t.muted,
      fontSize: 13,
      textAlign: 'center',
    },
    feedback: {
      gap: 4,
      borderTopWidth: 1,
      borderTopColor: t.border,
      paddingTop: 8,
    },
    ok: {
      fontWeight: '700',
      color: t.primary,
    },
    no: {
      fontWeight: '700',
      color: t.danger,
    },
    meaning: {
      fontSize: 18,
      fontWeight: '700',
      color: t.text,
    },
    bodyText: {
      color: t.text,
    },
    input: {
      minHeight: 52,
      borderWidth: 2,
      borderColor: t.primary,
      backgroundColor: t.btnBg,
      color: t.text,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      textAlign: 'center',
    },
    retry: {
      color: t.danger,
      fontWeight: '600',
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    actionButton: {
      minHeight: 48,
      justifyContent: 'center',
      flex: 1,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
      alignItems: 'center',
    },
    primaryButtonInline: {
      backgroundColor: t.primary,
      borderColor: t.primary,
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
    result: {
      flex: 1,
    },
    score: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 8,
      color: t.text,
    },
    reviewRow: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      gap: 2,
    },
    reviewPrompt: {
      fontWeight: '700',
      color: t.text,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    pressed: {
      opacity: 0.72,
    },
    centerText: {
      color: t.text,
    },
  });
