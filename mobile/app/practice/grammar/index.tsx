import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { CoinKsIcon, VolumeIcon } from '../../../src/components/AppIcons';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import {
  CONJUGATION_BLITZ_QUESTIONS,
  GRAMMAR_POINTS,
  PARTICLE_BLITZ_QUESTIONS,
  STAR_SENTENCES,
  type GrammarBlitzQuestion,
  type JlptLevelFilter,
  type StarSentenceQuestion,
} from '../../../src/features/grammar/grammar-data';
import { getUserScopedKey } from '../../../src/features/auth/auth-store';
import { claimDailyGameReward } from '../../../src/features/membership/membership-store';
import { recordMeaningfulStudyAction } from '../../../src/features/study-tracker/use-study-tracker';
import { speakJapanese } from '../../../src/utils/speak-japanese';

type GrammarTab = 'library' | 'star' | 'blitz';
type ProgressMark = 'new' | 'learning' | 'mastered';

const PROGRESS_KEY = 'kanji_smart_grammar_progress_v1';
const BLITZ_BEST_KEY = 'kanji_smart_grammar_blitz_best_v1';
const LEVELS: JlptLevelFilter[] = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'];

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

export default function GrammarPracticeScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<GrammarTab>(
    params.tab === 'star' ? 'star' : params.tab === 'blitz' ? 'blitz' : 'library',
  );
  const [levelFilter, setLevelFilter] = useState<JlptLevelFilter>('ALL');

  // Tab 1: Library + per-user progress
  const [search, setSearch] = useState('');
  const [progressMap, setProgressMap] = useState<Record<string, ProgressMark>>({});

  // Tab 2: Star Sentence Builder
  const [starRoundQuestions, setStarRoundQuestions] = useState<StarSentenceQuestion[]>([]);
  const [starIdx, setStarIdx] = useState(0);
  const [starOptions, setStarOptions] = useState<Array<{ id: number; text: string }>>([]);
  const [starSlots, setStarSlots] = useState<Array<{ id: number; text: string } | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [starChecked, setStarChecked] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [starScore, setStarScore] = useState(0);
  const [starCorrectCount, setStarCorrectCount] = useState(0);
  const [starRoundDone, setStarRoundDone] = useState(false);
  const [starKsMsg, setStarKsMsg] = useState<string | null>(null);

  // Tab 3: Grammar Blitz 60s
  const [blitzMode, setBlitzMode] = useState<'mixed' | 'particle' | 'conjugation'>('mixed');
  const [blitzPhase, setBlitzPhase] = useState<'setup' | 'playing' | 'summary'>('setup');
  const [blitzDeck, setBlitzDeck] = useState<GrammarBlitzQuestion[]>([]);
  const [blitzIdx, setBlitzIdx] = useState(0);
  const [blitzChoices, setBlitzChoices] = useState<string[]>([]);
  const [blitzTimeLeft, setBlitzTimeLeft] = useState(60);
  const [blitzHearts, setBlitzHearts] = useState(3);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzCombo, setBlitzCombo] = useState(0);
  const [blitzBest, setBlitzBest] = useState(0);
  const [blitzPicked, setBlitzPicked] = useState<string | null>(null);
  const [blitzTip, setBlitzTip] = useState<string | null>(null);
  const [blitzMissed, setBlitzMissed] = useState<GrammarBlitzQuestion[]>([]);
  const [blitzKsMsg, setBlitzKsMsg] = useState<string | null>(null);
  const blitzFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (params.tab === 'star' || params.tab === 'blitz' || params.tab === 'library') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    void getUserScopedKey(PROGRESS_KEY)
      .then((k) => AsyncStorage.getItem(k))
      .then((raw) => {
        if (!raw) return;
        try {
          setProgressMap(JSON.parse(raw) as Record<string, ProgressMark>);
        } catch {
          // ignore
        }
      });
    void getUserScopedKey(BLITZ_BEST_KEY)
      .then((k) => AsyncStorage.getItem(k))
      .then((raw) => {
        if (raw) {
          const n = Number(raw);
          if (Number.isFinite(n)) setBlitzBest(n);
        }
      });
    return () => {
      if (blitzFeedbackTimer.current) clearTimeout(blitzFeedbackTimer.current);
    };
  }, []);

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GRAMMAR_POINTS.filter((g) => {
      if (levelFilter !== 'ALL' && g.level !== levelFilter) return false;
      if (!q) return true;
      return (
        g.pattern.toLowerCase().includes(q) ||
        g.meaningVi.toLowerCase().includes(q) ||
        g.structure.toLowerCase().includes(q)
      );
    });
  }, [levelFilter, search]);

  const masteredCount = useMemo(
    () => Object.values(progressMap).filter((v) => v === 'mastered').length,
    [progressMap],
  );

  const setPointProgress = (id: string, status: ProgressMark) => {
    recordMeaningfulStudyAction('grammar_mark');
    setProgressMap((prev) => {
      const next = { ...prev, [id]: status };
      void getUserScopedKey(PROGRESS_KEY)
        .then((k) => AsyncStorage.setItem(k, JSON.stringify(next)))
        .catch(() => undefined);
      return next;
    });
  };

  // ── Star Sentence Builder Helpers ──
  const prepareStarQuestion = (q: StarSentenceQuestion) => {
    const tokens = shuffleArray(q.parts.map((text, idx) => ({ id: idx, text })));
    setStarOptions(tokens);
    setStarSlots([null, null, null, null]);
    setStarChecked('idle');
  };

  const startStarRound = (lv: JlptLevelFilter = levelFilter) => {
    recordMeaningfulStudyAction('grammar_star_start');
    const pool =
      lv === 'ALL'
        ? STAR_SENTENCES
        : STAR_SENTENCES.filter((s) => s.level === lv);
    const chosen = shuffleArray(pool.length > 0 ? pool : STAR_SENTENCES).slice(0, 5);
    setStarRoundQuestions(chosen);
    setStarIdx(0);
    setStarScore(0);
    setStarCorrectCount(0);
    setStarRoundDone(false);
    setStarKsMsg(null);
    if (chosen[0]) prepareStarQuestion(chosen[0]);
  };

  useEffect(() => {
    if (activeTab === 'star' && starRoundQuestions.length === 0) {
      startStarRound(levelFilter);
    }
  }, [activeTab]);

  const currentStar = starRoundQuestions[starIdx] ?? null;

  const handlePickStarChip = (chip: { id: number; text: string }) => {
    if (!currentStar || starChecked !== 'idle') return;
    recordMeaningfulStudyAction('grammar_star_pick');
    const emptySlotIdx = starSlots.findIndex((s) => s === null);
    if (emptySlotIdx < 0) return;
    const nextSlots = [...starSlots];
    nextSlots[emptySlotIdx] = chip;
    setStarSlots(nextSlots);
    setStarOptions((prev) => prev.filter((o) => o.id !== chip.id));
  };

  const handleRemoveStarSlot = (slotIdx: number) => {
    if (starChecked !== 'idle') return;
    const item = starSlots[slotIdx];
    if (!item) return;
    const nextSlots = [...starSlots];
    nextSlots[slotIdx] = null;
    setStarSlots(nextSlots);
    setStarOptions((prev) => [...prev, item]);
  };

  const handleCheckStar = () => {
    if (!currentStar || starChecked !== 'idle') return;
    if (starSlots.some((s) => s === null)) return;
    recordMeaningfulStudyAction('grammar_star_check');
    const userBuilt = starSlots.map((s) => s!.text).join('');
    const expected = currentStar.parts.join('');
    const ok = userBuilt === expected;
    setStarChecked(ok ? 'correct' : 'wrong');
    if (ok) {
      setStarScore((s) => s + 20);
      setStarCorrectCount((c) => c + 1);
    }
    const fullJa = `${currentStar.prefixJa}${expected}${currentStar.suffixJa}`;
    void speakJapanese(fullJa);
  };

  const handleNextStar = () => {
    if (starIdx + 1 >= starRoundQuestions.length) {
      setStarRoundDone(true);
      if (starScore >= 20) {
        void claimDailyGameReward('grammar_star', starScore)
          .then((res) => {
            if (res.applied) {
              setStarKsMsg(`Nhận thưởng lần đầu hôm nay: +${res.delta} Xu KS!`);
            } else {
              setStarKsMsg('Đã nhận thưởng Xu KS cho Game Xếp câu ★ hôm nay rồi.');
            }
          })
          .catch(() => undefined);
      }
      return;
    }
    const nextIdx = starIdx + 1;
    setStarIdx(nextIdx);
    const nextQ = starRoundQuestions[nextIdx];
    if (nextQ) prepareStarQuestion(nextQ);
  };

  // ── Grammar Blitz 60s Helpers ──
  const buildBlitzQuestion = (q: GrammarBlitzQuestion) => {
    setBlitzChoices(shuffleArray(q.choices));
    setBlitzPicked(null);
    setBlitzTip(null);
  };

  const startBlitz = () => {
    recordMeaningfulStudyAction('grammar_blitz_start');
    const basePool =
      blitzMode === 'particle'
        ? PARTICLE_BLITZ_QUESTIONS
        : blitzMode === 'conjugation'
          ? CONJUGATION_BLITZ_QUESTIONS
          : [...PARTICLE_BLITZ_QUESTIONS, ...CONJUGATION_BLITZ_QUESTIONS];
    const filtered =
      levelFilter === 'ALL' ? basePool : basePool.filter((q) => q.level === levelFilter);
    const deck = shuffleArray(filtered.length >= 4 ? filtered : basePool);
    setBlitzDeck(deck);
    setBlitzIdx(0);
    setBlitzTimeLeft(60);
    setBlitzHearts(3);
    setBlitzScore(0);
    setBlitzCombo(0);
    setBlitzMissed([]);
    setBlitzKsMsg(null);
    setBlitzPhase('playing');
    if (deck[0]) buildBlitzQuestion(deck[0]);
  };

  const finishBlitz = (finalScore: number) => {
    if (blitzFeedbackTimer.current) {
      clearTimeout(blitzFeedbackTimer.current);
      blitzFeedbackTimer.current = null;
    }
    setBlitzPhase('summary');
    if (finalScore > blitzBest) {
      setBlitzBest(finalScore);
      void getUserScopedKey(BLITZ_BEST_KEY)
        .then((k) => AsyncStorage.setItem(k, String(finalScore)))
        .catch(() => undefined);
    }
    if (finalScore >= 30) {
      void claimDailyGameReward('grammar_blitz', finalScore)
        .then((res) => {
          if (res.applied) {
            setBlitzKsMsg(`Nhận thưởng lần đầu hôm nay: +${res.delta} Xu KS!`);
          } else {
            setBlitzKsMsg('Đã nhận thưởng Xu KS cho Game Trợ từ & Chia thể hôm nay rồi.');
          }
        })
        .catch(() => undefined);
    }
  };

  useEffect(() => {
    if (blitzPhase !== 'playing') return;
    const timer = setInterval(() => {
      setBlitzTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [blitzPhase]);

  useEffect(() => {
    if (blitzPhase === 'playing' && blitzTimeLeft === 0) {
      finishBlitz(blitzScore);
    }
  }, [blitzPhase, blitzTimeLeft]);

  const currentBlitz = blitzDeck[blitzIdx] ?? null;

  const handleBlitzAnswer = (choice: string) => {
    if (blitzPhase !== 'playing' || !currentBlitz || blitzPicked !== null) return;
    recordMeaningfulStudyAction('grammar_blitz_answer');
    setBlitzPicked(choice);
    const ok = choice === currentBlitz.correct;

    let nextScore = blitzScore;
    let nextHearts = blitzHearts;
    if (ok) {
      const nextCombo = blitzCombo + 1;
      const mult = nextCombo >= 6 ? 3 : nextCombo >= 3 ? 2 : 1;
      nextScore = blitzScore + 10 * mult;
      setBlitzScore(nextScore);
      setBlitzCombo(nextCombo);
      setBlitzTip(`Chính xác! ${currentBlitz.tipVi}`);
    } else {
      nextHearts = blitzHearts - 1;
      setBlitzHearts(nextHearts);
      setBlitzCombo(0);
      setBlitzMissed((prev) =>
        prev.some((m) => m.id === currentBlitz.id) ? prev : [...prev, currentBlitz],
      );
      setBlitzTip(`Đáp án đúng: "${currentBlitz.correct}" — ${currentBlitz.tipVi}`);
    }

    blitzFeedbackTimer.current = setTimeout(() => {
      if (nextHearts <= 0) {
        finishBlitz(nextScore);
        return;
      }
      const nextIdx = (blitzIdx + 1) % Math.max(1, blitzDeck.length);
      setBlitzIdx(nextIdx);
      const nextQ = blitzDeck[nextIdx];
      if (nextQ) buildBlitzQuestion(nextQ);
    }, ok ? 750 : 1350);
  };

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Ngữ pháp JLPT & Game Thực chiến"
        subtitle="Tổng hợp N5–N1, Game Xếp câu Dấu Sao ★ & Bắn Trợ từ / Chia thể 60s"
      />

      {/* Mode Tabs */}
      <View style={styles.tabsRow}>
        {(
          [
            ['library', 'Kho Ngữ pháp N5–N1'],
            ['star', '⭐ Xếp Câu Dấu Sao (★)'],
            ['blitz', '⚡ Trợ Từ & Chia Thể 60s'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tabPill, activeTab === key && styles.tabPillActive]}
            onPress={() => {
              recordMeaningfulStudyAction(`grammar_tab_${key}`);
              setActiveTab(key);
            }}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Level Filter Strip */}
      <View style={styles.levelRow}>
        {LEVELS.map((lv) => {
          const active = levelFilter === lv;
          return (
            <Pressable
              key={lv}
              style={[styles.lvChip, active && styles.lvChipActive]}
              onPress={() => {
                setLevelFilter(lv);
                if (activeTab === 'star') startStarRound(lv);
              }}
            >
              <Text style={[styles.lvText, active && styles.lvTextActive]}>
                {lv === 'ALL' ? 'Tất cả JLPT' : lv}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'library' ? (
        <View style={styles.sectionGap}>
          <View style={styles.summaryCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.summaryTitle}>
                  Đã thuộc {masteredCount} / {GRAMMAR_POINTS.length} mẫu ngữ pháp
                </Text>
                <Text style={styles.summarySub}>
                  Bấm nút nghe ví dụ và đánh dấu tiến độ để luyện lại hiệu quả cùng 2 mini-game.
                </Text>
              </View>
              <Pressable style={styles.quickGameBtn} onPress={() => setActiveTab('star')}>
                <Text style={styles.quickGameText}>Chơi Xếp câu ★ →</Text>
              </Pressable>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm mẫu ngữ pháp (vd: ために, はずだ, てみる, Ứng dụng)..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.searchInput}
            />
          </View>

          {filteredPoints.map((g) => {
            const mark = progressMap[g.id] ?? 'new';
            return (
              <View key={g.id} style={styles.grammarCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.levelTag}>
                    <Text style={styles.levelTagText}>{g.level}</Text>
                  </View>
                  <View style={styles.markRow}>
                    {(
                      [
                        ['new', 'Mới'],
                        ['learning', 'Đang ôn'],
                        ['mastered', 'Đã thuộc'],
                      ] as const
                    ).map(([mKey, mLabel]) => (
                      <Pressable
                        key={mKey}
                        style={[
                          styles.markBtn,
                          mark === mKey &&
                            (mKey === 'mastered' ? styles.markBtnMastered : styles.markBtnActive),
                        ]}
                        onPress={() => setPointProgress(g.id, mKey)}
                      >
                        <Text
                          style={[
                            styles.markBtnText,
                            mark === mKey &&
                              (mKey === 'mastered'
                                ? styles.markTextMastered
                                : styles.markTextActive),
                          ]}
                        >
                          {mLabel}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Text style={styles.patternTitle}>{g.pattern}</Text>
                <Text style={styles.structureBadge}>Công thức: {g.structure}</Text>
                <Text style={styles.meaningVi}>{g.meaningVi}</Text>
                <Text style={styles.nuanceVi}>💡 Lưu ý: {g.nuanceVi}</Text>

                <View style={styles.examplesBox}>
                  {g.examples.map((ex, idx) => (
                    <View key={idx} style={styles.exRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.exJa}>{ex.ja}</Text>
                        <Text style={styles.exReading}>{ex.reading}</Text>
                        <Text style={styles.exVi}>{ex.vi}</Text>
                      </View>
                      <Pressable
                        style={styles.ttsBtn}
                        onPress={() => {
                          recordMeaningfulStudyAction('grammar_listen');
                          void speakJapanese(ex.ja);
                        }}
                      >
                        <VolumeIcon size={15} color={nihongoTheme.colors.accentHover} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ) : activeTab === 'star' ? (
        <View style={styles.sectionGap}>
          {starRoundDone ? (
            <View style={styles.card}>
              <Text style={styles.doneTitle}>🎉 Hoàn thành vòng Xếp Câu Dấu Sao!</Text>
              <Text style={styles.doneScore}>
                Đúng {starCorrectCount} / {starRoundQuestions.length} câu · {starScore} điểm
              </Text>
              {starKsMsg ? (
                <View style={styles.ksBanner}>
                  <CoinKsIcon size={15} color={nihongoTheme.colors.accentHover} />
                  <Text style={styles.ksBannerText}>{starKsMsg}</Text>
                </View>
              ) : null}
              <Pressable style={styles.primaryBtn} onPress={() => startStarRound(levelFilter)}>
                <Text style={styles.primaryBtnText}>Chơi vòng mới (5 câu khác) →</Text>
              </Pressable>
            </View>
          ) : currentStar ? (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>
                    {currentStar.level} · Câu {starIdx + 1}/{starRoundQuestions.length}
                  </Text>
                </View>
                <Text style={styles.scoreLabel}>Điểm: {starScore}</Text>
              </View>

              <Text style={styles.starMeaning}>{currentStar.meaningVi}</Text>
              <Text style={styles.starInstruction}>
                Chạm lần lượt 4 mảnh bên dưới để xếp thành câu đúng (ô ★ là vị trí dấu sao JLPT):
              </Text>

              <View style={styles.sentenceFrame}>
                <Text style={styles.frameEdge}>{currentStar.prefixJa}</Text>
                {starSlots.map((slot, sIdx) => {
                  const isStarSlot = sIdx === currentStar.starIndex;
                  return (
                    <Pressable
                      key={sIdx}
                      style={[
                        styles.slotBox,
                        isStarSlot && styles.slotBoxStar,
                        slot && styles.slotBoxFilled,
                        starChecked === 'correct' && styles.slotCorrect,
                        starChecked === 'wrong' && styles.slotWrong,
                      ]}
                      onPress={() => handleRemoveStarSlot(sIdx)}
                    >
                      <Text style={styles.slotText}>
                        {slot ? slot.text : isStarSlot ? '★' : `(${sIdx + 1})`}
                      </Text>
                    </Pressable>
                  );
                })}
                <Text style={styles.frameEdge}>{currentStar.suffixJa}</Text>
              </View>

              <View style={styles.bankWrap}>
                {starOptions.map((chip) => (
                  <Pressable
                    key={chip.id}
                    style={styles.bankChip}
                    onPress={() => handlePickStarChip(chip)}
                  >
                    <Text style={styles.bankChipText}>{chip.text}</Text>
                  </Pressable>
                ))}
              </View>

              {starChecked !== 'idle' ? (
                <View
                  style={[
                    styles.feedbackCard,
                    starChecked === 'correct' ? styles.feedbackOk : styles.feedbackBad,
                  ]}
                >
                  <Text style={styles.feedbackTitle}>
                    {starChecked === 'correct'
                      ? '✓ Chính xác! Vị trí ★ là: ' + currentStar.parts[currentStar.starIndex]
                      : `✗ Thứ tự đúng: ${currentStar.prefixJa} ${currentStar.parts.join(' | ')} ${currentStar.suffixJa}`}
                  </Text>
                  <Text style={styles.feedbackBody}>{currentStar.explanationVi}</Text>
                </View>
              ) : null}

              <View style={styles.actionsRow}>
                {starChecked === 'idle' ? (
                  <>
                    <Pressable
                      style={styles.outlineBtn}
                      onPress={() => prepareStarQuestion(currentStar)}
                    >
                      <Text style={styles.outlineBtnText}>Xếp lại</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.primaryBtn,
                        { flex: 1 },
                        starSlots.some((s) => s === null) && styles.btnDisabled,
                      ]}
                      disabled={starSlots.some((s) => s === null)}
                      onPress={handleCheckStar}
                    >
                      <Text style={styles.primaryBtnText}>Kiểm tra đáp án</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={handleNextStar}>
                    <Text style={styles.primaryBtnText}>
                      {starIdx + 1 >= starRoundQuestions.length
                        ? 'Xem tổng kết & Nhận Xu KS →'
                        : 'Câu tiếp theo →'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.sectionGap}>
          {blitzPhase === 'setup' ? (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>⚡ Bắn Trợ Từ &amp; Chia Thể 60s</Text>
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>Kỷ lục: {blitzBest}đ</Text>
                </View>
              </View>
              <Text style={styles.summarySub}>
                Phản xạ nhanh trong 60 giây · 3 tim · Combo liên tiếp nhân ×2 / ×3 điểm. Đạt từ 30đ trở lên nhận thưởng Xu KS lần đầu mỗi ngày!
              </Text>

              <Text style={styles.label}>Chọn nội dung luyện</Text>
              <View style={styles.tabsRow}>
                {(
                  [
                    ['mixed', 'Trộn cả 2'],
                    ['particle', 'Trợ từ (は/が/で/に...)'],
                    ['conjugation', 'Chia thể động từ/tính từ'],
                  ] as const
                ).map(([mKey, mLabel]) => (
                  <Pressable
                    key={mKey}
                    style={[styles.lvChip, blitzMode === mKey && styles.lvChipActive]}
                    onPress={() => setBlitzMode(mKey)}
                  >
                    <Text style={[styles.lvText, blitzMode === mKey && styles.lvTextActive]}>
                      {mLabel}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.primaryBtn} onPress={startBlitz}>
                <Text style={styles.primaryBtnText}>Bắt đầu 60 giây ⚡</Text>
              </Pressable>
            </View>
          ) : blitzPhase === 'playing' && currentBlitz ? (
            <View style={styles.card}>
              <View style={styles.hudRow}>
                <View style={styles.hudPill}>
                  <Text style={styles.hudText}>⏱️ {blitzTimeLeft}s</Text>
                </View>
                <View style={styles.hudPill}>
                  <Text style={styles.hudText}>{'❤️'.repeat(Math.max(0, blitzHearts)) || '💔'}</Text>
                </View>
                <View style={[styles.hudPill, blitzCombo >= 3 && styles.hudFever]}>
                  <Text style={styles.hudText}>
                    {blitzScore}đ {blitzCombo >= 2 ? `· Combo ×${blitzCombo}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => finishBlitz(blitzScore)}>
                  <Text style={styles.stopText}>Kết thúc</Text>
                </Pressable>
              </View>

              <View style={styles.levelTag}>
                <Text style={styles.levelTagText}>
                  {currentBlitz.level} · {currentBlitz.kind === 'particle' ? 'Trợ từ' : 'Chia thể'}
                </Text>
              </View>
              <Text style={styles.blitzPrompt}>{currentBlitz.promptMain}</Text>
              <Text style={styles.blitzSub}>{currentBlitz.promptSub}</Text>
              <Text style={styles.blitzMeaning}>Nghĩa: {currentBlitz.meaningVi}</Text>

              <View style={styles.choicesGrid}>
                {blitzChoices.map((ch) => {
                  const picked = blitzPicked === ch;
                  const isCorrect = ch === currentBlitz.correct;
                  const showOk = blitzPicked !== null && isCorrect;
                  const showWrong = blitzPicked !== null && picked && !isCorrect;
                  return (
                    <Pressable
                      key={ch}
                      style={[
                        styles.blitzChoiceBtn,
                        showOk && styles.blitzChoiceOk,
                        showWrong && styles.blitzChoiceBad,
                      ]}
                      disabled={blitzPicked !== null}
                      onPress={() => handleBlitzAnswer(ch)}
                    >
                      <Text style={styles.blitzChoiceText}>{ch}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {blitzTip ? (
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>{blitzTip}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.doneTitle}>⚡ Hết giờ! Tổng điểm: {blitzScore}</Text>
              <Text style={styles.doneScore}>Kỷ lục cá nhân: {blitzBest} điểm</Text>
              {blitzKsMsg ? (
                <View style={styles.ksBanner}>
                  <CoinKsIcon size={15} color={nihongoTheme.colors.accentHover} />
                  <Text style={styles.ksBannerText}>{blitzKsMsg}</Text>
                </View>
              ) : null}

              {blitzMissed.length > 0 ? (
                <View style={styles.missedSection}>
                  <Text style={styles.label}>Ôn lại các câu vừa sai ({blitzMissed.length})</Text>
                  {blitzMissed.map((m) => (
                    <View key={m.id} style={styles.missedRow}>
                      <Text style={styles.missedPrompt}>{m.promptMain}</Text>
                      <Text style={styles.missedAns}>
                        Đúng: {m.correct} — {m.tipVi}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.summarySub}>Tuyệt vời! Bạn không sai câu nào trong lượt vừa rồi.</Text>
              )}

              <View style={styles.actionsRow}>
                <Pressable style={styles.outlineBtn} onPress={() => setBlitzPhase('setup')}>
                  <Text style={styles.outlineBtnText}>Đổi chế độ</Text>
                </Pressable>
                <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={startBlitz}>
                  <Text style={styles.primaryBtnText}>Chơi lại 60s ⚡</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tabPill: {
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tabPillActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  lvChip: {
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lvChipActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderColor: nihongoTheme.colors.accent,
  },
  lvText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  lvTextActive: {
    color: nihongoTheme.colors.accentHover,
  },
  sectionGap: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  summarySub: {
    fontSize: 13,
    lineHeight: 19,
    color: nihongoTheme.colors.textSecondary,
  },
  quickGameBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickGameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchInput: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: nihongoTheme.colors.textPrimary,
  },
  grammarCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 8,
    ...nihongoTheme.shadow.card,
  },
  levelTag: {
    alignSelf: 'flex-start',
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  markRow: {
    flexDirection: 'row',
    gap: 5,
  },
  markBtn: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  markBtnActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  markBtnMastered: {
    backgroundColor: nihongoTheme.colors.successBg,
  },
  markBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  markTextActive: {
    color: nihongoTheme.colors.accentHover,
  },
  markTextMastered: {
    color: nihongoTheme.colors.successText,
  },
  patternTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  structureBadge: {
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  meaningVi: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  nuanceVi: {
    fontSize: 12.5,
    lineHeight: 18,
    color: nihongoTheme.colors.textSecondary,
  },
  examplesBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exJa: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  exReading: {
    fontSize: 11.5,
    color: nihongoTheme.colors.accentHover,
  },
  exVi: {
    fontSize: 12.5,
    color: nihongoTheme.colors.textSecondary,
  },
  ttsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  starMeaning: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  starInstruction: {
    fontSize: 12.5,
    color: nihongoTheme.colors.textSecondary,
  },
  sentenceFrame: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
  },
  frameEdge: {
    fontSize: 16,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  slotBox: {
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  slotBoxStar: {
    borderColor: nihongoTheme.colors.accent,
    backgroundColor: '#FFF7ED',
  },
  slotBoxFilled: {
    borderStyle: 'solid',
    borderColor: nihongoTheme.colors.textPrimary,
  },
  slotCorrect: {
    borderColor: nihongoTheme.colors.successText,
    backgroundColor: nihongoTheme.colors.successBg,
  },
  slotWrong: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  bankWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankChip: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bankChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  feedbackCard: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  feedbackOk: {
    backgroundColor: nihongoTheme.colors.successBg,
  },
  feedbackBad: {
    backgroundColor: '#FEF2F2',
  },
  feedbackTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  feedbackBody: {
    fontSize: 12.5,
    lineHeight: 18,
    color: nihongoTheme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  doneTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  doneScore: {
    fontSize: 15,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  ksBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  ksBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  hudPill: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hudFever: {
    backgroundColor: '#FFF7ED',
    borderColor: nihongoTheme.colors.accent,
  },
  hudText: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  stopText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  blitzPrompt: {
    fontSize: 22,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    marginTop: 4,
  },
  blitzSub: {
    fontSize: 13,
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
  },
  blitzMeaning: {
    fontSize: 14,
    color: nihongoTheme.colors.textSecondary,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  blitzChoiceBtn: {
    width: '48%',
    flexGrow: 1,
    minWidth: 135,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  blitzChoiceOk: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderColor: nihongoTheme.colors.successText,
  },
  blitzChoiceBad: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  blitzChoiceText: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
  },
  tipBox: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: 12,
    padding: 11,
  },
  tipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 18,
  },
  missedSection: {
    gap: 8,
  },
  missedRow: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  missedPrompt: {
    fontSize: 13.5,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  missedAns: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
});
