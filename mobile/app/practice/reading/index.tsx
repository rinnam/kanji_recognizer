import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../../src/library-source';
import { getUserScopedKey, readAuthSession } from '../../../src/features/auth/auth-store';
import { useMembership } from '../../../src/features/membership/membership-store';
import { recordMeaningfulStudyAction } from '../../../src/features/study-tracker/use-study-tracker';
import { speakJapanese } from '../../../src/utils/speak-japanese';
import { useIsMobilePhone } from '../../../src/utils/device';

const READING_PROGRESS_KEY = 'kanji_smart_reading_progress_v1';

interface ReadingQuestion {
  questionJa: string;
  options: string[];
  correctIndex: number;
  explanationVi: string;
}

interface GeneratedReading {
  titleJa: string;
  titleVi: string;
  level: string;
  genre: string;
  passageJa: string;
  readingKana: string;
  translationVi: string;
  targetWords: Array<{ id?: string; word: string; reading: string; meaning: string }>;
  questions: ReadingQuestion[];
}

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
const GENRES = ['Đoản văn', 'Email công sở', 'Tin tức ngắn', 'Hội thoại đời sống'] as const;

export default function ReadingScreen() {
  const router = useRouter();
  const isPhone = useIsMobilePhone();
  const { summary, tier, refresh: refreshMembership } = useMembership();
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('N3');
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('Đoản văn');
  const [loading, setLoading] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [reading, setReading] = useState<GeneratedReading | null>(null);
  const [configOpen, setConfigOpen] = useState(true);

  const [showKana, setShowKana] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [srsUpdating, setSrsUpdating] = useState(false);
  const [srsDoneCount, setSrsDoneCount] = useState<number | null>(null);
  const [srsUpdatedWords, setSrsUpdatedWords] = useState<
    Array<{ id: string; word: string; nextIntervalDays: number }>
  >([]);
  const [srsError, setSrsError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const applyRestoredReading = async (data: GeneratedReading) => {
    setReading(data);
    setConfigOpen(false);
    try {
      const pKey = await getUserScopedKey(READING_PROGRESS_KEY);
      const raw = await AsyncStorage.getItem(pKey);
      if (raw) {
        const saved = JSON.parse(raw) as {
          titleJa?: string;
          selectedAnswers?: Record<number, number>;
          checked?: boolean;
        };
        if (saved.titleJa === data.titleJa) {
          setSelectedAnswers(saved.selectedAnswers ?? {});
          setChecked(Boolean(saved.checked));
          return;
        }
      }
    } catch {
      // ignore local cache read error
    }
    setSelectedAnswers({});
    setChecked(false);
  };

  const startPollingLatest = () => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      void (async () => {
        try {
          const session = await readAuthSession();
          if (!session?.accessToken) return;
          const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
          const res = await fetch(`${base}/ai/reading/latest`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          });
          if (!res.ok) return;
          const job = (await res.json()) as {
            status: 'none' | 'running' | 'ready' | 'failed';
            result?: GeneratedReading | null;
            errorMessage?: string | null;
          };
          if (job.status === 'ready' && job.result) {
            stopPolling();
            await applyRestoredReading(job.result);
            setRecoveryNotice(null);
            setLoading(false);
            void refreshMembership();
          } else if (job.status === 'failed') {
            stopPolling();
            setRecoveryNotice(null);
            setLoading(false);
            setErrorMsg(job.errorMessage || 'Không tạo được bài đọc AI (bạn không bị trừ lượt).');
          }
        } catch {
          // retry on next tick
        }
      })();
    }, 2000);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await readAuthSession();
        if (!session?.accessToken || !active) return;
        const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
        const res = await fetch(`${base}/ai/reading/latest`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (!res.ok || !active) return;
        const job = (await res.json()) as {
          status: 'none' | 'running' | 'ready' | 'failed';
          result?: GeneratedReading | null;
          errorMessage?: string | null;
        };
        if (!active) return;
        if (job.status === 'running') {
          setLoading(true);
          setRecoveryNotice(
            'AI đang tiếp tục hoàn tất bài đọc bạn vừa yêu cầu (F5 hoặc đổi tab sẽ không bị mất lượt)...',
          );
          startPollingLatest();
        } else if (job.status === 'ready' && job.result) {
          await applyRestoredReading(job.result);
        }
      } catch {
        // offline
      }
    })();
    return () => {
      active = false;
      stopPolling();
    };
  }, []);

  const markTargetWordsReviewed = async (targetReading: GeneratedReading) => {
    const vocabIds = targetReading.targetWords
      .map((w) => w.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (vocabIds.length === 0 || srsUpdating || srsDoneCount !== null) return;
    setSrsUpdating(true);
    setSrsError(null);
    try {
      const session = await readAuthSession();
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
      const res = await fetch(`${base}/ai/reading/complete-srs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vocabularyIds: vocabIds }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 120)}`);
      }
      const data = (await res.json()) as {
        updatedCount?: number;
        updatedWords?: Array<{ id: string; word: string; nextIntervalDays: number }>;
      };
      setSrsDoneCount(data.updatedCount ?? vocabIds.length);
      setSrsUpdatedWords(data.updatedWords ?? []);
    } catch {
      setSrsError('Không cập nhật được tiến độ ôn tập. Vui lòng thử lại.');
    } finally {
      setSrsUpdating(false);
    }
  };

  const persistReadingProgress = (
    titleJa: string,
    answers: Record<number, number>,
    isChecked: boolean,
  ) => {
    void getUserScopedKey(READING_PROGRESS_KEY)
      .then((pKey) =>
        AsyncStorage.setItem(
          pKey,
          JSON.stringify({ titleJa, selectedAnswers: answers, checked: isChecked }),
        ),
      )
      .catch(() => undefined);
  };

  const handleGenerate = async () => {
    if (loading) return;
    recordMeaningfulStudyAction('reading_generate');
    let keepPolling = false;
    setLoading(true);
    setRecoveryNotice(null);
    setErrorMsg(null);
    setQuotaBlocked(false);
    setSelectedAnswers({});
    setChecked(false);
    setSrsDoneCount(null);
    setSrsUpdatedWords([]);
    setSrsError(null);

    try {
      const session = await readAuthSession();
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

      const res = await fetch(`${base}/ai/reading/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ level, genre }),
      });
      if (res.status === 202) {
        const pending = (await res.json().catch(() => ({}))) as { message?: string };
        keepPolling = true;
        setRecoveryNotice(
          pending.message || 'AI đang hoàn tất bài đọc trước đó (không tốn thêm lượt)...',
        );
        startPollingLatest();
        return;
      }
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        if (res.status === 403) {
          setQuotaBlocked(true);
          setErrorMsg(errData.message || 'Bạn đã dùng hết lượt Luyện đọc AI tuần này.');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as GeneratedReading;
      setReading(data);
      persistReadingProgress(data.titleJa, {}, false);
      void refreshMembership();
    } catch {
      setErrorMsg('Hệ thống AI đang bận, vui lòng thử lại sau vài giây.');
    } finally {
      if (!keepPolling) setLoading(false);
    }
  };

  const correctCount =
    reading && checked
      ? reading.questions.reduce(
          (sum, q, idx) => sum + (selectedAnswers[idx] === q.correctIndex ? 1 : 0),
          0,
        )
      : 0;

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Luyện đọc AI"
      />

      <View style={styles.quotaStrip}>
        <Text style={styles.quotaText}>
          {summary.usage.readingLimitWeek === null
            ? `${summary.subscription.planName} · Không giới hạn bài đọc AI`
            : `${summary.subscription.planName} · Đã dùng ${summary.usage.readingUsedWeek}/${summary.usage.readingLimitWeek} bài tuần này`}
        </Text>
        {tier !== 'pro' ? (
          <Pressable style={styles.quotaUpgradeBtn} onPress={() => router.push('/billing?tab=plans')}>
            <Text style={styles.quotaUpgradeText}>Nâng cấp</Text>
          </Pressable>
        ) : null}
      </View>

      {recoveryNotice ? (
        <View style={styles.recoveryBanner}>
          <ActivityIndicator size="small" color={nihongoTheme.colors.accentHover} />
          <Text style={styles.recoveryText}>{recoveryNotice}</Text>
        </View>
      ) : null}

      {/* Config Panel (auto-collapses after passage loads so reading text sits above the fold) */}
      {reading && !configOpen ? (
        <View style={styles.configCollapsedBar}>
          <Text style={styles.configCollapsedText}>
            Đang đọc: {level} · {genre}
          </Text>
          <Pressable style={styles.configToggleBtn} onPress={() => setConfigOpen(true)}>
            <Text style={styles.configToggleBtnText}>Tạo bài mới</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Cấp độ JLPT</Text>
            {reading ? (
              <Pressable onPress={() => setConfigOpen(false)}>
                <Text style={styles.closeConfigText}>Thu gọn</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chipsRow}>
            {LEVELS.map((lv) => (
              <Pressable
                key={lv}
                style={[styles.chip, level === lv && styles.chipActive]}
                onPress={() => {
                  recordMeaningfulStudyAction('reading_level');
                  setLevel(lv);
                }}
              >
                <Text style={[styles.chipText, level === lv && styles.chipTextActive]}>{lv}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Thể loại bài đọc</Text>
          <View style={styles.chipsRow}>
            {GENRES.map((g) => (
              <Pressable
                key={g}
                style={[styles.chip, genre === g && styles.chipActive]}
                onPress={() => {
                  recordMeaningfulStudyAction('reading_genre');
                  setGenre(g);
                }}
              >
                <Text style={[styles.chipText, genre === g && styles.chipTextActive]}>{g}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={() => void handleGenerate()}
          >
            {loading ? (
              <View style={styles.loadingInline}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryBtnText}>Đang tạo bài đọc từ từ vựng SRS...</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>
                {reading ? 'Tạo bài đọc mới từ kho SRS →' : 'Tạo bài đọc từ kho SRS →'}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {errorMsg ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          {quotaBlocked ? (
            <Pressable
              style={[styles.primaryBtn, { marginTop: 10 }]}
              onPress={() => router.push('/billing?tab=plans')}
            >
              <Text style={styles.primaryBtnText}>Nâng cấp gói Plus / Pro →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {reading ? (
        <View style={styles.contentGap}>
          {/* Target SRS words embedded in the passage */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Từ vựng SRS đã lồng vào bài đọc ({reading.targetWords.length} từ)</Text>
            <View style={styles.wordsWrap}>
              {reading.targetWords.map((w, idx) => {
                const updated = srsUpdatedWords.find((u) => u.id === w.id);
                return (
                  <Pressable
                    key={`${w.word}-${idx}`}
                    style={[styles.wordPill, updated && styles.wordPillReviewed]}
                    onPress={() => void speakJapanese(w.reading || w.word)}
                  >
                    {updated ? <Text style={styles.wordPillCheck}>✓</Text> : null}
                    <Text style={styles.wordPillMain}>{w.word}</Text>
                    {w.reading ? <Text style={styles.wordPillSub}>({w.reading})</Text> : null}
                    <Text style={styles.wordPillMean}>
                      {updated ? `· Đã ôn (+${updated.nextIntervalDays} ngày)` : `· ${w.meaning}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Main Passage */}
          <View style={styles.passageCard}>
            <View style={[styles.passageHeader, isPhone && styles.passageHeaderPhone]}>
              <View style={[styles.passageTitleWrap, !isPhone && styles.passageTitleWrapWide]}>
                <View style={styles.badgeRow}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>{reading.level}</Text>
                  </View>
                  <View style={styles.genreBadge}>
                    <Text style={styles.genreBadgeText}>{reading.genre}</Text>
                  </View>
                </View>
                <Text style={styles.passageTitle}>{reading.titleJa}</Text>
                {showVi ? <Text style={styles.passageTitleVi}>{reading.titleVi}</Text> : null}
              </View>

              <View style={styles.toolbarRow}>
                <Pressable style={styles.toolBtn} onPress={() => void speakJapanese(reading.passageJa)}>
                  <Text style={styles.toolBtnText}>Nghe cả bài</Text>
                </Pressable>
                <Pressable
                  style={[styles.toolBtn, showKana && styles.toolBtnActive]}
                  onPress={() => setShowKana((v) => !v)}
                >
                  <Text style={[styles.toolBtnText, showKana && styles.toolBtnTextActive]}>Kana</Text>
                </Pressable>
                <Pressable
                  style={[styles.toolBtn, showVi && styles.toolBtnActive]}
                  onPress={() => setShowVi((v) => !v)}
                >
                  <Text style={[styles.toolBtnText, showVi && styles.toolBtnTextActive]}>Dịch Việt</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.passageBody}>{reading.passageJa}</Text>

            {showKana && reading.readingKana ? (
              <View style={styles.auxBox}>
                <Text style={styles.auxLabel}>Phiên âm Kana:</Text>
                <Text style={styles.auxKana}>{reading.readingKana}</Text>
              </View>
            ) : null}

            {showVi && reading.translationVi ? (
              <View style={styles.auxBox}>
                <Text style={styles.auxLabel}>Bản dịch tiếng Việt:</Text>
                <Text style={styles.auxVi}>{reading.translationVi}</Text>
              </View>
            ) : null}
          </View>

          {/* 3 JLPT Comprehension Questions */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Câu hỏi đọc hiểu ({reading.questions.length} câu)</Text>
              {checked ? (
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>
                    Đúng {correctCount}/{reading.questions.length}
                  </Text>
                </View>
              ) : null}
            </View>

            {reading.questions.map((q, qIdx) => {
              const picked = selectedAnswers[qIdx];
              return (
                <View key={qIdx} style={styles.questionBox}>
                  <Text style={styles.questionText}>
                    Câu {qIdx + 1}: {q.questionJa}
                  </Text>
                  <View style={styles.optionsList}>
                    {q.options.map((opt, oIdx) => {
                      const isPicked = picked === oIdx;
                      const isCorrect = oIdx === q.correctIndex;
                      const showRight = checked && isCorrect;
                      const showWrong = checked && isPicked && !isCorrect;
                      return (
                        <Pressable
                          key={oIdx}
                          style={[
                            styles.optionBtn,
                            isPicked && !checked && styles.optionPicked,
                            showRight && styles.optionCorrect,
                            showWrong && styles.optionWrong,
                          ]}
                          onPress={() => {
                            if (checked) return;
                            recordMeaningfulStudyAction('reading_answer');
                            setSelectedAnswers((prev) => {
                              const next = { ...prev, [qIdx]: oIdx };
                              if (reading) persistReadingProgress(reading.titleJa, next, false);
                              return next;
                            });
                          }}
                        >
                          <Text style={styles.optionText}>
                            {String.fromCharCode(65 + oIdx)}. {opt.replace(/^[A-D][.)]\s*/i, '')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {checked ? (
                    <Text style={styles.explainText}>Giải thích: {q.explanationVi}</Text>
                  ) : null}
                </View>
              );
            })}

            {!checked ? (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  recordMeaningfulStudyAction('reading_grade');
                  setChecked(true);
                  if (reading) persistReadingProgress(reading.titleJa, selectedAnswers, true);
                  const score = reading.questions.reduce(
                    (sum, q, idx) => sum + (selectedAnswers[idx] === q.correctIndex ? 1 : 0),
                    0,
                  );
                  if (reading.questions.length > 0 && score === reading.questions.length) {
                    void markTargetWordsReviewed(reading);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Chấm điểm đọc hiểu</Text>
              </Pressable>
            ) : srsDoneCount !== null ? (
              <View style={styles.srsDoneBox}>
                <Text style={styles.srsDoneText}>
                  ✓ Đã đánh dấu ôn xong &amp; đẩy lịch SRS cho {srsDoneCount} từ vựng!
                </Text>
                {srsUpdatedWords.length > 0 ? (
                  <Text style={styles.srsScheduleDetail}>
                    {srsUpdatedWords.map((u) => `${u.word} (+${u.nextIntervalDays} ngày)`).join(' · ')}
                  </Text>
                ) : null}
                <Pressable
                  style={[styles.primaryBtn, { marginTop: 8 }]}
                  disabled={loading}
                  onPress={() => void handleGenerate()}
                >
                  <Text style={styles.primaryBtnText}>Tạo bài đọc mới với 6 từ cần ôn tiếp theo →</Text>
                </Pressable>
              </View>
            ) : reading.targetWords.some((w) => w.id) ? (
              <View style={{ gap: 8 }}>
                {srsError ? <Text style={styles.errorText}>{srsError}</Text> : null}
                <Pressable
                  style={styles.srsManualBtn}
                  disabled={srsUpdating}
                  onPress={() => void markTargetWordsReviewed(reading)}
                >
                  <Text style={styles.srsManualText}>
                    {srsUpdating
                      ? 'Đang cập nhật SRS...'
                      : `Đánh dấu ${reading.targetWords.filter((w) => w.id).length} từ này đã ôn (SRS)`}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Bài đọc theo cấp độ JLPT</Text>
          <Text style={styles.emptyDesc}>
            Chọn cấp độ và thể loại phía trên để tạo bài đọc kèm câu hỏi từ kho từ của bạn.
          </Text>
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 12,
    marginBottom: 14,
    ...nihongoTheme.shadow.card,
  },
  contentGap: {
    gap: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  chipActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  wordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDF8F0',
    borderWidth: 1,
    borderColor: '#E5D5C3',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  wordPillReviewed: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderColor: '#86EFAC',
  },
  wordPillCheck: {
    fontSize: 12,
    fontWeight: '900',
    color: '#15803D',
  },
  wordPillMain: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  wordPillSub: {
    fontSize: 11,
    color: nihongoTheme.colors.accentHover,
    fontWeight: '600',
  },
  wordPillMean: {
    fontSize: 11,
    color: nihongoTheme.colors.textSecondary,
  },
  passageCard: {
    backgroundColor: '#FDF8F0',
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.2,
    borderColor: '#C87D55',
    padding: 18,
    gap: 14,
    marginBottom: 14,
  },
  passageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  passageHeaderPhone: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
  },
  passageTitleWrap: {
    gap: 4,
  },
  passageTitleWrapWide: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  levelBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  genreBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5D5C3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  genreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A5B37',
  },
  passageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  passageTitleVi: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '600',
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toolBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5D5C3',
  },
  toolBtnActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  toolBtnTextActive: {
    color: '#FFFFFF',
  },
  passageBody: {
    fontSize: 16,
    lineHeight: 29,
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '600',
  },
  auxBox: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    gap: 4,
  },
  auxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A5B37',
  },
  auxKana: {
    fontSize: 13,
    lineHeight: 22,
    color: nihongoTheme.colors.accentHover,
  },
  auxVi: {
    fontSize: 13,
    lineHeight: 21,
    color: nihongoTheme.colors.textSecondary,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  scoreBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  questionBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    gap: 8,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  optionsList: {
    gap: 6,
  },
  optionBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  optionPicked: {
    borderColor: nihongoTheme.colors.accent,
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  optionCorrect: {
    borderColor: '#22C55E',
    backgroundColor: nihongoTheme.colors.successBg,
  },
  optionWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: nihongoTheme.colors.textPrimary,
  },
  explainText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    lineHeight: 18,
  },
  srsDoneBox: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
  },
  srsDoneText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
    lineHeight: 19,
  },
  srsScheduleDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginTop: 4,
    lineHeight: 18,
  },
  srsManualBtn: {
    backgroundColor: '#FDF8F0',
    borderWidth: 1,
    borderColor: '#C87D55',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  srsManualText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A5B37',
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 20,
  },
  quotaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  quotaText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  quotaUpgradeBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quotaUpgradeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  configCollapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  configCollapsedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  configToggleBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  configToggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  closeConfigText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  recoveryText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
    lineHeight: 18,
  },
});
