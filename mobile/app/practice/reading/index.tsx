import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../../src/library-source';
import { readAuthSession } from '../../../src/features/auth/auth-store';
import { speakJapanese } from '../../../src/utils/speak-japanese';

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
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('N3');
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('Đoản văn');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reading, setReading] = useState<GeneratedReading | null>(null);

  const [showKana, setShowKana] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [srsUpdating, setSrsUpdating] = useState(false);
  const [srsDoneCount, setSrsDoneCount] = useState<number | null>(null);

  const markTargetWordsReviewed = async (targetReading: GeneratedReading) => {
    const vocabIds = targetReading.targetWords
      .map((w) => w.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (vocabIds.length === 0 || srsUpdating || srsDoneCount !== null) return;
    setSrsUpdating(true);
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
      if (res.ok) {
        const data = (await res.json()) as { updatedCount?: number };
        setSrsDoneCount(data.updatedCount ?? vocabIds.length);
      }
    } catch {
      // ignore transient error
    } finally {
      setSrsUpdating(false);
    }
  };

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    setSelectedAnswers({});
    setChecked(false);
    setSrsDoneCount(null);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as GeneratedReading;
      setReading(data);
    } catch {
      setErrorMsg('Không tạo được bài đọc AI (có thể Google AI đang bận). Hãy thử lại sau vài giây.');
    } finally {
      setLoading(false);
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
        title="Luyện đọc AI từ SRS"
        subtitle="AI tự lấy các từ bạn cần ôn trong Flashcard để sáng tác bài đọc hiểu JLPT kèm câu hỏi A–D"
      />

      {/* Config Panel */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>1. Chọn cấp độ JLPT</Text>
        <View style={styles.chipsRow}>
          {LEVELS.map((lv) => (
            <Pressable
              key={lv}
              style={[styles.chip, level === lv && styles.chipActive]}
              onPress={() => setLevel(lv)}
            >
              <Text style={[styles.chipText, level === lv && styles.chipTextActive]}>{lv}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>2. Chọn thể loại bài đọc</Text>
        <View style={styles.chipsRow}>
          {GENRES.map((g) => (
            <Pressable
              key={g}
              style={[styles.chip, genre === g && styles.chipActive]}
              onPress={() => setGenre(g)}
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
              <Text style={styles.primaryBtnText}>AI đang sáng tác bài đọc từ từ vựng SRS...</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>
              {reading ? 'Tạo bài đọc mới từ kho SRS →' : 'Tạo bài đọc cá nhân hóa từ SRS →'}
            </Text>
          )}
        </Pressable>
      </View>

      {errorMsg ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {reading ? (
        <View style={styles.contentGap}>
          {/* Target SRS words embedded in the passage */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Từ vựng SRS đã lồng vào bài đọc ({reading.targetWords.length} từ)</Text>
            <View style={styles.wordsWrap}>
              {reading.targetWords.map((w, idx) => (
                <Pressable
                  key={`${w.word}-${idx}`}
                  style={styles.wordPill}
                  onPress={() => void speakJapanese(w.reading || w.word)}
                >
                  <Text style={styles.wordPillMain}>{w.word}</Text>
                  {w.reading ? <Text style={styles.wordPillSub}>({w.reading})</Text> : null}
                  <Text style={styles.wordPillMean}>· {w.meaning}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Main Passage */}
          <View style={styles.passageCard}>
            <View style={styles.passageHeader}>
              <View style={styles.passageTitleWrap}>
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
                            setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
                          }}
                        >
                          <Text style={styles.optionText}>
                            {String.fromCharCode(65 + oIdx)}. {opt}
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
                  setChecked(true);
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
                  Đã cập nhật lịch ôn SRS cho {srsDoneCount} từ vựng trong bài! Bấm &quot;Tạo bài đọc mới&quot; để ôn 6 từ kế tiếp.
                </Text>
              </View>
            ) : reading.targetWords.some((w) => w.id) ? (
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
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Bài đọc cá nhân hóa theo kho từ của bạn</Text>
          <Text style={styles.emptyDesc}>
            Chọn cấp độ JLPT và thể loại phía trên rồi bấm nút tạo bài — AI sẽ lấy 6 từ bạn đang cần ôn nhất trong Flashcard để viết thành đoạn văn hoàn chỉnh kèm 3 câu hỏi đọc hiểu.
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
  passageTitleWrap: {
    flex: 1,
    gap: 4,
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
});
