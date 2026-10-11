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
import { useCallback, useMemo, useState, type ReactElement } from 'react';
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

const MODES: { id: QuizMode; label: string }[] = [
  { id: 'random', label: 'Ngẫu nhiên' },
  { id: 'reading', label: 'Dạng 1' },
  { id: 'meaning', label: 'Dạng 2' },
];

const TYPE_TITLE: Record<string, string> = {
  reading: 'DẠNG 1: NHÌN CHỮ, NHẬP CÁCH ĐỌC',
  meaning: 'DẠNG 2: NHÌN NGHĨA, DỊCH SANG TIẾNG NHẬT',
};

/**
 * Quiz mobile (M4): chọn bộ theo phạm vi → sinh câu (core) → trả lời tối đa
 * 3 lần + gợi ý → phản hồi → kết quả + lưu BE (POST /quiz/sessions, lỗi mạng
 * vẫn giữ kết quả cục bộ). Chưa có đếm ngược tự chuyển (M5).
 */
export default function Quiz(): ReactElement {
  const port = useStoragePort();
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
    if (next.status !== 'answering') pushItem(next);
  };

  const hint = (): void => {
    if (resolved) return;
    const next = applyHint(attempt);
    setAttempt(next);
    pushItem(next);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScopePicker />
      <View style={styles.modes}>
        {MODES.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.modeButton, item.id === mode && styles.modeActive]}
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
          style={[styles.toolButton, shuffled && styles.modeActive]}
          onPress={() => {
            setShuffled((v) => !v);
            setSeed(Date.now());
            resetRound();
          }}
          accessibilityLabel="Xáo trộn câu"
        >
          <Text style={[styles.modeText, shuffled && styles.modeTextActive]}>Xáo trộn</Text>
        </Pressable>
        <Pressable
          style={styles.toolButton}
          onPress={() => {
            setSeed(Date.now());
            resetRound();
          }}
          accessibilityLabel="Làm lại từ câu đầu"
        >
          <Text style={styles.modeText}>Làm lại</Text>
        </Pressable>
        <Text style={styles.counter}>
          {total === 0 ? '0/0' : `${Math.min(index + 1, total)}/${total}`}
        </Text>
      </View>
      {status === 'loading' ? (
        <ActivityIndicator size="large" />
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text>Lỗi: {error}</Text>
          <Pressable style={styles.primaryButton} onPress={() => void reload()}>
            <Text style={styles.primaryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : result !== null ? (
        <ScrollView style={styles.result}>
          <Text style={styles.score}>
            Điểm: {result.score} / {result.total}
          </Text>
          {saveMessage !== null ? <Text>{saveMessage}</Text> : null}
          {result.items.map((item, i) => (
            <View key={`${item.vocabularyId}-${i}`} style={styles.reviewRow}>
              <Text style={styles.reviewPrompt}>{item.prompt}</Text>
              <Text>
                Bạn gõ: {item.userAnswer ?? '—'} {item.isCorrect ? '✓' : '✗'}
              </Text>
              {!item.isCorrect ? (
                <Text>Đáp án: {item.acceptedAnswers.join(' / ')}</Text>
              ) : null}
            </View>
          ))}
          <Pressable
            style={styles.primaryButton}
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
          <Text>Chưa có câu hỏi — thêm từ ở tab Tổng quan.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{TYPE_TITLE[current.type]}</Text>
          <Text style={styles.question}>{current.prompt}</Text>
          {resolved && feedback !== null ? (
            <View style={styles.feedback}>
              <Text style={feedback.isCorrect ? styles.ok : styles.no}>
                {feedback.isCorrect ? '✓ Chính xác!' : '✗ Chưa đúng — đáp án đúng'}
              </Text>
              <Text style={styles.meaning}>{feedback.meaning}</Text>
              {feedback.chips.map((chip) => (
                <Text key={chip.label}>
                  {chip.label}: {chip.value}
                </Text>
              ))}
              {feedback.example !== null ? <Text>{feedback.example}</Text> : null}
            </View>
          ) : null}
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            editable={!resolved}
            placeholder="Nhập câu trả lời…"
            aria-label="Câu trả lời"
            onSubmitEditing={submit}
          />
          {!resolved && attempt.attempts > 0 ? (
            <Text style={styles.retry}>Chưa đúng. Còn {remainingAttempts(attempt)} lần.</Text>
          ) : null}
          {!resolved ? (
            <View style={styles.actions}>
              <Pressable style={styles.actionButton} onPress={hint}>
                <Text style={styles.modeText}>Gợi ý</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.primaryButtonInline]}
                onPress={submit}
                disabled={input.trim() === ''}
              >
                <Text style={styles.primaryText}>Kiểm tra</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.primaryButton} onPress={advance}>
              <Text style={styles.primaryText}>
                {index >= total - 1 ? 'Nộp bài' : 'Tiếp'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 10,
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
    borderColor: '#8a7f6e',
    alignItems: 'center',
  },
  modeActive: {
    backgroundColor: '#b4532a',
    borderColor: '#b4532a',
  },
  modeText: {
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#ffffff',
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8a7f6e',
  },
  counter: {
    marginLeft: 'auto',
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8cfbe',
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 12,
    letterSpacing: 1,
    opacity: 0.6,
    textAlign: 'center',
  },
  question: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  feedback: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#d8cfbe',
    paddingTop: 8,
  },
  ok: {
    fontWeight: '700',
    color: '#b4532a',
  },
  no: {
    fontWeight: '700',
    color: '#a3301f',
  },
  meaning: {
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    borderWidth: 2,
    borderColor: '#b4532a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
  },
  retry: {
    color: '#a3301f',
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  actionButton: {
    minWidth: 140,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8a7f6e',
    alignItems: 'center',
  },
  primaryButtonInline: {
    backgroundColor: '#b4532a',
    borderColor: '#b4532a',
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#b4532a',
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
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
  },
  reviewRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d8cfbe',
    gap: 2,
  },
  reviewPrompt: {
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
