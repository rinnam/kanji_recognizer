import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import {
  ClockIcon,
  CoinKsIcon,
  HeartIcon,
  LightningBoltIcon,
  ResetIcon,
  StarPuzzleIcon,
  VolumeIcon,
} from '../../../src/components/AppIcons';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import {
  CONJUGATION_BLITZ_QUESTIONS,
  GRAMMAR_CATEGORIES,
  GRAMMAR_POINTS,
  PARTICLE_BLITZ_QUESTIONS,
  STAR_SENTENCES,
  type GrammarBlitzQuestion,
  type GrammarCategory,
  type JlptLevelFilter,
  type StarSentenceQuestion,
} from '../../../src/features/grammar/grammar-data';
import { getUserScopedKey } from '../../../src/features/auth/auth-store';
import { claimDailyGameReward } from '../../../src/features/membership/membership-store';
import { recordMeaningfulStudyAction } from '../../../src/features/study-tracker/use-study-tracker';
import { speakJapanese } from '../../../src/utils/speak-japanese';

type GrammarTab = 'library' | 'star' | 'blitz';
type ProgressMark = 'new' | 'learning' | 'mastered';
type ProgressFilter = 'all' | ProgressMark;

const PROGRESS_KEY = 'kanji_smart_grammar_progress_v1';
const BLITZ_BEST_KEY = 'kanji_smart_grammar_blitz_best_v1';
const LEVELS: JlptLevelFilter[] = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'];
const STAR_LIMIT_SEC = 25;
const BLITZ_Q_LIMIT_SEC = 8;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const LEVEL_COLORS: Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1', { bg: string; text: string }> = {
  N5: { bg: '#E8F5E9', text: '#1B873F' },
  N4: { bg: '#E0F2FE', text: '#0369A1' },
  N3: { bg: '#FFF3E6', text: '#EA7A1E' },
  N2: { bg: '#EEF2FF', text: '#4F46E5' },
  N1: { bg: '#FEF2F2', text: '#DC2626' },
};

const CATEGORY_LABEL_MAP: Record<GrammarCategory, string> = Object.fromEntries(
  GRAMMAR_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<GrammarCategory, string>;

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

  // Tab 1: Library + per-user progress + category/progress filtering + incremental pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | GrammarCategory>('all');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [progressMap, setProgressMap] = useState<Record<string, ProgressMark>>({});
  const [visibleCount, setVisibleCount] = useState(18);

  // Tab 2: Star Sentence Builder + 25s reflex timer
  const [starReflexMode, setStarReflexMode] = useState(true);
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
  const [starCombo, setStarCombo] = useState(0);
  const [starCorrectCount, setStarCorrectCount] = useState(0);
  const [starRoundDone, setStarRoundDone] = useState(false);
  const [starTimedOut, setStarTimedOut] = useState(false);
  const [starKsMsg, setStarKsMsg] = useState<string | null>(null);
  const [starTimeLeftSec, setStarTimeLeftSec] = useState(STAR_LIMIT_SEC);
  const [starTimeRatio, setStarTimeRatio] = useState(1);
  const [starFloatText, setStarFloatText] = useState('');
  const [starFloatOk, setStarFloatOk] = useState(true);

  const starStartTsRef = useRef(0);
  const starRatioRef = useRef(1);
  const starTimeoutFiredRef = useRef(false);
  const starRafRef = useRef<number | null>(null);
  const starTimerAnim = useRef(new Animated.Value(1)).current;
  const starCardEnterAnim = useRef(new Animated.Value(1)).current;
  const starShakeAnim = useRef(new Animated.Value(0)).current;
  const starFloatOpacity = useRef(new Animated.Value(0)).current;
  const starFloatY = useRef(new Animated.Value(0)).current;

  // Tab 3: Grammar Blitz 60s + 8s per-question reflex timer
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
  const [blitzQTimeLeftSec, setBlitzQTimeLeftSec] = useState(BLITZ_Q_LIMIT_SEC);
  const [blitzQTimeRatio, setBlitzQTimeRatio] = useState(1);
  const [blitzFloatText, setBlitzFloatText] = useState('');
  const [blitzFloatTone, setBlitzFloatTone] = useState<'good' | 'fast' | 'miss'>('good');

  const blitzFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blitzStartTsRef = useRef(0);
  const blitzRatioRef = useRef(1);
  const blitzTimeoutFiredRef = useRef(false);
  const blitzRafRef = useRef<number | null>(null);
  const blitzQTimerAnim = useRef(new Animated.Value(1)).current;
  const blitzCardEnterAnim = useRef(new Animated.Value(1)).current;
  const blitzShakeAnim = useRef(new Animated.Value(0)).current;
  const blitzFloatOpacity = useRef(new Animated.Value(0)).current;
  const blitzFloatY = useRef(new Animated.Value(0)).current;

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
      if (starRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(starRafRef.current);
      }
      if (blitzRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(blitzRafRef.current);
      }
    };
  }, []);

  // Reset pagination whenever filters change
  useEffect(() => {
    setVisibleCount(18);
  }, [levelFilter, categoryFilter, progressFilter, search]);

  const levelCounts = useMemo(() => {
    const counts: Record<JlptLevelFilter, number> = {
      ALL: GRAMMAR_POINTS.length,
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
    };
    for (const g of GRAMMAR_POINTS) {
      counts[g.level] += 1;
    }
    return counts;
  }, []);

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GRAMMAR_POINTS.filter((g) => {
      if (levelFilter !== 'ALL' && g.level !== levelFilter) return false;
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
      const mark = progressMap[g.id] ?? 'new';
      if (progressFilter !== 'all' && mark !== progressFilter) return false;
      if (!q) return true;
      return (
        g.pattern.toLowerCase().includes(q) ||
        g.meaningVi.toLowerCase().includes(q) ||
        g.structure.toLowerCase().includes(q) ||
        g.nuanceVi.toLowerCase().includes(q)
      );
    });
  }, [levelFilter, categoryFilter, progressFilter, progressMap, search]);

  const displayedPoints = useMemo(
    () => filteredPoints.slice(0, visibleCount),
    [filteredPoints, visibleCount],
  );

  const filteredMasteredCount = useMemo(
    () => filteredPoints.filter((g) => (progressMap[g.id] ?? 'new') === 'mastered').length,
    [filteredPoints, progressMap],
  );

  const totalMasteredCount = useMemo(
    () => GRAMMAR_POINTS.filter((g) => progressMap[g.id] === 'mastered').length,
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

  // Animation Helpers
  const triggerShake = (anim: Animated.Value) => {
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 8, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(anim, { toValue: -8, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(anim, { toValue: 5, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(anim, { toValue: 0, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  };

  const triggerCardEnter = (anim: Animated.Value) => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 210,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const triggerFloat = (
    yAnim: Animated.Value,
    opAnim: Animated.Value,
  ) => {
    yAnim.setValue(0);
    opAnim.setValue(1);
    Animated.parallel([
      Animated.timing(yAnim, { toValue: -30, duration: 640, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(opAnim, { toValue: 0, duration: 640, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  };

  // ── Star Sentence Builder Helpers ──
  const resetStarTimer = () => {
    starStartTsRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    starRatioRef.current = 1;
    starTimeoutFiredRef.current = false;
    starTimerAnim.setValue(1);
    setStarTimeRatio(1);
    setStarTimeLeftSec(STAR_LIMIT_SEC);
  };

  const prepareStarQuestion = (q: StarSentenceQuestion) => {
    const tokens = shuffleArray(q.parts.map((text, idx) => ({ id: idx, text })));
    setStarOptions(tokens);
    setStarSlots([null, null, null, null]);
    setStarChecked('idle');
    setStarTimedOut(false);
    resetStarTimer();
    triggerCardEnter(starCardEnterAnim);
  };

  const startStarRound = (lv: JlptLevelFilter = levelFilter) => {
    recordMeaningfulStudyAction('grammar_star_start');
    const pool = lv === 'ALL' ? STAR_SENTENCES : STAR_SENTENCES.filter((s) => s.level === lv);
    const chosen = shuffleArray(pool.length > 0 ? pool : STAR_SENTENCES).slice(0, 5);
    setStarRoundQuestions(chosen);
    setStarIdx(0);
    setStarScore(0);
    setStarCombo(0);
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

  // Star 25s reflex rAF loop
  const handleStarTimeout = () => {
    if (!currentStar || starChecked !== 'idle') return;
    setStarTimedOut(true);
    setStarChecked('wrong');
    setStarCombo(0);
    setStarFloatText('⏱️ Hết giờ!');
    setStarFloatOk(false);
    triggerShake(starShakeAnim);
    triggerFloat(starFloatY, starFloatOpacity);
    const fullJa = `${currentStar.prefixJa}${currentStar.parts.join('')}${currentStar.suffixJa}`;
    void speakJapanese(fullJa);
  };

  const starTimeoutRef = useRef(handleStarTimeout);
  starTimeoutRef.current = handleStarTimeout;

  useEffect(() => {
    if (activeTab !== 'star' || !starReflexMode || starRoundDone || !currentStar || starChecked !== 'idle') {
      if (starRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(starRafRef.current);
        starRafRef.current = null;
      }
      return;
    }
    if (typeof requestAnimationFrame === 'undefined') return;

    const limitMs = STAR_LIMIT_SEC * 1000;
    let lastHud = 0;

    const tick = (now: number) => {
      const elapsed = now - starStartTsRef.current;
      const ratio = Math.max(0, Math.min(1, 1 - elapsed / limitMs));
      starRatioRef.current = ratio;
      starTimerAnim.setValue(ratio);

      if (now - lastHud >= 100 || ratio === 0) {
        lastHud = now;
        setStarTimeRatio(ratio);
        setStarTimeLeftSec(Math.max(0, Math.ceil((limitMs - elapsed) / 1000)));
      }

      if (ratio <= 0) {
        if (!starTimeoutFiredRef.current) {
          starTimeoutFiredRef.current = true;
          starTimeoutRef.current();
        }
        return;
      }
      starRafRef.current = requestAnimationFrame(tick);
    };

    starRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (starRafRef.current !== null) {
        cancelAnimationFrame(starRafRef.current);
        starRafRef.current = null;
      }
    };
  }, [activeTab, starReflexMode, starRoundDone, starIdx, starChecked, currentStar]);

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
    setStarTimedOut(false);

    if (ok) {
      const fastBonus = starReflexMode && starRatioRef.current > 0.5 ? 10 : 0;
      const pts = 20 + fastBonus;
      setStarScore((s) => s + pts);
      setStarCombo((c) => c + 1);
      setStarCorrectCount((c) => c + 1);
      setStarFloatText(fastBonus > 0 ? `+${pts}đ ⚡ PHẢN XẠ!` : `+${pts}đ`);
      setStarFloatOk(true);
      triggerFloat(starFloatY, starFloatOpacity);
    } else {
      setStarCombo(0);
      setStarFloatText('✗ Chưa đúng');
      setStarFloatOk(false);
      triggerShake(starShakeAnim);
      triggerFloat(starFloatY, starFloatOpacity);
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

  // ── Grammar Blitz 60s + 8s/question Helpers ──
  const resetBlitzQTimer = () => {
    blitzStartTsRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    blitzRatioRef.current = 1;
    blitzTimeoutFiredRef.current = false;
    blitzQTimerAnim.setValue(1);
    setBlitzQTimeRatio(1);
    setBlitzQTimeLeftSec(BLITZ_Q_LIMIT_SEC);
  };

  const buildBlitzQuestion = (q: GrammarBlitzQuestion) => {
    setBlitzChoices(shuffleArray(q.choices));
    setBlitzPicked(null);
    setBlitzTip(null);
    resetBlitzQTimer();
    triggerCardEnter(blitzCardEnterAnim);
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
    if (blitzRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(blitzRafRef.current);
      blitzRafRef.current = null;
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
    if (blitzPhase !== 'playing' || activeTab !== 'blitz') return;
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
  }, [blitzPhase, activeTab]);

  useEffect(() => {
    if (blitzPhase === 'playing' && activeTab === 'blitz' && blitzTimeLeft === 0) {
      finishBlitz(blitzScore);
    }
  }, [blitzPhase, activeTab, blitzTimeLeft]);

  const currentBlitz = blitzDeck[blitzIdx] ?? null;

  const advanceBlitzAfterFeedback = (nextHearts: number, nextScore: number, delayMs: number) => {
    if (blitzFeedbackTimer.current) clearTimeout(blitzFeedbackTimer.current);
    blitzFeedbackTimer.current = setTimeout(() => {
      if (nextHearts <= 0) {
        finishBlitz(nextScore);
        return;
      }
      const nextIdx = (blitzIdx + 1) % Math.max(1, blitzDeck.length);
      setBlitzIdx(nextIdx);
      const nextQ = blitzDeck[nextIdx];
      if (nextQ) buildBlitzQuestion(nextQ);
    }, delayMs);
  };

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
      const fastBonus = blitzRatioRef.current > 0.56 ? 5 : 0;
      const pts = 10 * mult + fastBonus;
      nextScore = blitzScore + pts;
      setBlitzScore(nextScore);
      setBlitzCombo(nextCombo);
      setBlitzFloatText(fastBonus > 0 ? `+${pts}đ ⚡` : `+${pts}đ`);
      setBlitzFloatTone(fastBonus > 0 ? 'fast' : 'good');
      triggerFloat(blitzFloatY, blitzFloatOpacity);
      setBlitzTip(
        `${fastBonus > 0 ? '⚡ Phản xạ nhanh (+5đ)! ' : ''}Chính xác! ${currentBlitz.tipVi}`,
      );
    } else {
      nextHearts = blitzHearts - 1;
      setBlitzHearts(nextHearts);
      setBlitzCombo(0);
      setBlitzFloatText('-1 ❤️');
      setBlitzFloatTone('miss');
      triggerShake(blitzShakeAnim);
      triggerFloat(blitzFloatY, blitzFloatOpacity);
      setBlitzMissed((prev) =>
        prev.some((m) => m.id === currentBlitz.id) ? prev : [...prev, currentBlitz],
      );
      setBlitzTip(`Đáp án đúng: "${currentBlitz.correct}" — ${currentBlitz.tipVi}`);
    }

    advanceBlitzAfterFeedback(nextHearts, nextScore, ok ? 720 : 1250);
  };

  const handleBlitzTimeout = () => {
    if (blitzPhase !== 'playing' || !currentBlitz || blitzPicked !== null) return;
    setBlitzPicked('__TIMEOUT__');
    const nextHearts = blitzHearts - 1;
    setBlitzHearts(nextHearts);
    setBlitzCombo(0);
    setBlitzFloatText('-1 ❤️ HẾT GIỜ!');
    setBlitzFloatTone('miss');
    triggerShake(blitzShakeAnim);
    triggerFloat(blitzFloatY, blitzFloatOpacity);
    setBlitzMissed((prev) =>
      prev.some((m) => m.id === currentBlitz.id) ? prev : [...prev, currentBlitz],
    );
    setBlitzTip(`Hết ${BLITZ_Q_LIMIT_SEC}s! Đáp án đúng: "${currentBlitz.correct}" — ${currentBlitz.tipVi}`);
    advanceBlitzAfterFeedback(nextHearts, blitzScore, 1250);
  };

  const blitzTimeoutRef = useRef(handleBlitzTimeout);
  blitzTimeoutRef.current = handleBlitzTimeout;

  // Blitz 8s per-question reflex loop
  useEffect(() => {
    if (activeTab !== 'blitz' || blitzPhase !== 'playing' || !currentBlitz || blitzPicked !== null) {
      if (blitzRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(blitzRafRef.current);
        blitzRafRef.current = null;
      }
      return;
    }
    if (typeof requestAnimationFrame === 'undefined') return;

    const limitMs = BLITZ_Q_LIMIT_SEC * 1000;
    let lastHud = 0;

    const tick = (now: number) => {
      const elapsed = now - blitzStartTsRef.current;
      const ratio = Math.max(0, Math.min(1, 1 - elapsed / limitMs));
      blitzRatioRef.current = ratio;
      blitzQTimerAnim.setValue(ratio);

      if (now - lastHud >= 90 || ratio === 0) {
        lastHud = now;
        setBlitzQTimeRatio(ratio);
        setBlitzQTimeLeftSec(Math.max(0, Number(((limitMs - elapsed) / 1000).toFixed(1))));
      }

      if (ratio <= 0) {
        if (!blitzTimeoutFiredRef.current) {
          blitzTimeoutFiredRef.current = true;
          blitzTimeoutRef.current();
        }
        return;
      }
      blitzRafRef.current = requestAnimationFrame(tick);
    };

    blitzRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (blitzRafRef.current !== null) {
        cancelAnimationFrame(blitzRafRef.current);
        blitzRafRef.current = null;
      }
    };
  }, [activeTab, blitzPhase, blitzIdx, blitzPicked, currentBlitz]);

  // Web keyboard shortcuts for Star (1-4, Backspace, Enter) & Blitz (1-4)
  const keyboardStateRef = useRef({
    activeTab,
    starRoundDone,
    currentStar,
    starOptions,
    starSlots,
    starChecked,
    blitzPhase,
    currentBlitz,
    blitzChoices,
    blitzPicked,
    handlePickStarChip,
    handleRemoveStarSlot,
    handleCheckStar,
    handleNextStar,
    handleBlitzAnswer,
  });
  keyboardStateRef.current = {
    activeTab,
    starRoundDone,
    currentStar,
    starOptions,
    starSlots,
    starChecked,
    blitzPhase,
    currentBlitz,
    blitzChoices,
    blitzPicked,
    handlePickStarChip,
    handleRemoveStarSlot,
    handleCheckStar,
    handleNextStar,
    handleBlitzAnswer,
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const s = keyboardStateRef.current;
      if (s.activeTab === 'star' && !s.starRoundDone && s.currentStar) {
        if (ev.key >= '1' && ev.key <= '4' && s.starChecked === 'idle') {
          const chip = s.starOptions[Number(ev.key) - 1];
          if (chip) {
            ev.preventDefault();
            s.handlePickStarChip(chip);
          }
        } else if (ev.key === 'Backspace' && s.starChecked === 'idle') {
          let lastFilled = -1;
          for (let i = s.starSlots.length - 1; i >= 0; i -= 1) {
            if (s.starSlots[i] !== null) {
              lastFilled = i;
              break;
            }
          }
          if (lastFilled >= 0) {
            ev.preventDefault();
            s.handleRemoveStarSlot(lastFilled);
          }
        } else if (ev.key === 'Enter') {
          if (s.starChecked === 'idle' && s.starSlots.every((slot) => slot !== null)) {
            ev.preventDefault();
            s.handleCheckStar();
          } else if (s.starChecked !== 'idle') {
            ev.preventDefault();
            s.handleNextStar();
          }
        }
      } else if (
        s.activeTab === 'blitz' &&
        s.blitzPhase === 'playing' &&
        s.currentBlitz &&
        s.blitzPicked === null
      ) {
        if (ev.key >= '1' && ev.key <= '4') {
          const ch = s.blitzChoices[Number(ev.key) - 1];
          if (ch) {
            ev.preventDefault();
            s.handleBlitzAnswer(ch);
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const starTimerColor = starTimeRatio > 0.5 ? '#1B873F' : starTimeRatio > 0.25 ? '#D97706' : '#DC2626';
  const starTimerWidth = starTimerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const blitzTimerColor = blitzQTimeRatio > 0.5 ? '#1B873F' : blitzQTimeRatio > 0.25 ? '#D97706' : '#DC2626';
  const blitzTimerWidth = blitzQTimerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const filterProgressPct =
    filteredPoints.length > 0
      ? Math.round((filteredMasteredCount / filteredPoints.length) * 100)
      : 0;

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Ngữ pháp JLPT & Game Thực chiến"
        subtitle={`Full JLPT N3 (${levelCounts.N3} mẫu) · Xếp câu Dấu Sao ★ & Bắn Trợ từ 60s`}
      />

      {/* Mode Tabs */}
      <View style={styles.tabsRow}>
        {(
          [
            ['library', 'Kho Ngữ pháp N5–N1'],
            ['star', 'Xếp Câu Dấu Sao (★)'],
            ['blitz', 'Trợ Từ & Chia Thể 60s'],
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
            {key === 'star' ? (
              <StarPuzzleIcon size={15} color={activeTab === key ? '#FFFFFF' : '#D97706'} />
            ) : key === 'blitz' ? (
              <LightningBoltIcon size={15} color={activeTab === key ? '#FFFFFF' : '#4F46E5'} />
            ) : null}
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Level Filter Strip with Counts */}
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
                {lv === 'ALL' ? `Tất cả (${levelCounts.ALL})` : `${lv} (${levelCounts[lv]})`}
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
                  Đã thuộc {totalMasteredCount} / {GRAMMAR_POINTS.length} mẫu (Lọc hiện tại: {filteredMasteredCount}/{filteredPoints.length})
                </Text>
                <View style={styles.libProgressTrack}>
                  <View style={[styles.libProgressFill, { width: `${filterProgressPct}%` }]} />
                </View>
              </View>
              <Pressable style={styles.quickGameBtn} onPress={() => setActiveTab('star')}>
                <Text style={styles.quickGameText}>Chơi Xếp câu ★ →</Text>
              </Pressable>
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm mẫu ngữ pháp (vd: うちに, ために, わりに, っけ, nhượng bộ)..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.searchInput}
            />

            {/* Category Filter Chips */}
            <View style={styles.subFilterRow}>
              <Pressable
                style={[styles.subChip, categoryFilter === 'all' && styles.subChipActive]}
                onPress={() => setCategoryFilter('all')}
              >
                <Text style={[styles.subChipText, categoryFilter === 'all' && styles.subChipTextActive]}>
                  Tất cả nhóm
                </Text>
              </Pressable>
              {GRAMMAR_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  style={[styles.subChip, categoryFilter === cat.key && styles.subChipActive]}
                  onPress={() => setCategoryFilter(cat.key)}
                >
                  <Text
                    style={[styles.subChipText, categoryFilter === cat.key && styles.subChipTextActive]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Progress Filter Pills */}
            <View style={styles.subFilterRow}>
              {(
                [
                  ['all', 'Tất cả trạng thái'],
                  ['new', 'Mới'],
                  ['learning', 'Đang ôn'],
                  ['mastered', 'Đã thuộc'],
                ] as const
              ).map(([pKey, pLabel]) => (
                <Pressable
                  key={pKey}
                  style={[styles.progChip, progressFilter === pKey && styles.progChipActive]}
                  onPress={() => setProgressFilter(pKey)}
                >
                  <Text
                    style={[
                      styles.progChipText,
                      progressFilter === pKey && styles.progChipTextActive,
                    ]}
                  >
                    {pLabel}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {filteredPoints.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.summaryTitle}>Không tìm thấy mẫu ngữ pháp phù hợp</Text>
              <Text style={styles.summarySub}>
                Thử xóa bớt từ khóa tìm kiếm hoặc chọn lại &ldquo;Tất cả nhóm&rdquo;.
              </Text>
              <Pressable
                style={styles.outlineBtn}
                onPress={() => {
                  setSearch('');
                  setCategoryFilter('all');
                  setProgressFilter('all');
                }}
              >
                <Text style={styles.outlineBtnText}>Đặt lại bộ lọc</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {displayedPoints.map((g) => {
                const mark = progressMap[g.id] ?? 'new';
                const lvTheme = LEVEL_COLORS[g.level];
                return (
                  <View key={g.id} style={styles.grammarCard}>
                    <View style={styles.rowBetween}>
                      <View style={styles.badgePairRow}>
                        <View style={[styles.levelTag, { backgroundColor: lvTheme.bg }]}>
                          <Text style={[styles.levelTagText, { color: lvTheme.text }]}>{g.level}</Text>
                        </View>
                        <View style={styles.catTag}>
                          <Text style={styles.catTagText}>{CATEGORY_LABEL_MAP[g.category]}</Text>
                        </View>
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
                    <View style={styles.structureBox}>
                      <Text style={styles.structureBadge}>Công thức: {g.structure}</Text>
                    </View>
                    <Text style={styles.meaningVi}>{g.meaningVi}</Text>
                    <Text style={styles.nuanceVi}>Lưu ý: {g.nuanceVi}</Text>

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

              {visibleCount < filteredPoints.length ? (
                <Pressable
                  style={styles.loadMoreBtn}
                  onPress={() => setVisibleCount((c) => c + 20)}
                >
                  <Text style={styles.loadMoreText}>
                    Xem thêm +20 mẫu (còn {filteredPoints.length - visibleCount} mẫu)
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      ) : activeTab === 'star' ? (
        <View style={styles.sectionGap}>
          {starRoundDone ? (
            <View style={styles.card}>
              <Text style={styles.doneTitle}>Hoàn thành vòng Xếp Câu Dấu Sao!</Text>
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
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: starCardEnterAnim,
                  transform: [
                    { translateX: starShakeAnim },
                    {
                      translateY: starCardEnterAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Floating score popup */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.floatPopup,
                  starFloatOk ? styles.floatOk : styles.floatMiss,
                  { opacity: starFloatOpacity, transform: [{ translateY: starFloatY }] },
                ]}
              >
                <Text style={styles.floatPopupText}>{starFloatText}</Text>
              </Animated.View>

              <View style={styles.rowBetween}>
                <View style={styles.badgePairRow}>
                  <View style={styles.levelTag}>
                    <Text style={styles.levelTagText}>
                      {currentStar.level} · Câu {starIdx + 1}/{starRoundQuestions.length}
                    </Text>
                  </View>
                  {starCombo >= 2 ? (
                    <View style={styles.comboPill}>
                      <Text style={styles.comboText}>Chuỗi ×{starCombo}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.starRightHud}>
                  <View style={styles.switchMiniRow}>
                    <Text style={styles.switchMiniText}>Phản xạ {STAR_LIMIT_SEC}s</Text>
                    <Switch
                      value={starReflexMode}
                      onValueChange={(v) => {
                        setStarReflexMode(v);
                        if (v) resetStarTimer();
                      }}
                      trackColor={{ false: '#E5DDD4', true: '#D97706' }}
                    />
                  </View>
                  <Text style={styles.scoreLabel}>Điểm: {starScore}</Text>
                </View>
              </View>

              {starReflexMode ? (
                <View style={styles.qTimerWrap}>
                  <View style={styles.rowBetween}>
                    <View style={styles.timerLabelRow}>
                      <ClockIcon size={13} color={starTimerColor} />
                      <Text style={[styles.qTimerLabel, { color: starTimerColor }]}>
                        Thời gian câu này: {starTimeLeftSec}s
                      </Text>
                    </View>
                    {starTimeRatio > 0.5 && starChecked === 'idle' ? (
                      <Text style={styles.fastBonusHint}>Cửa sổ +10đ phản xạ nhanh</Text>
                    ) : null}
                  </View>
                  <View style={styles.qTimerTrack}>
                    <Animated.View
                      style={[
                        styles.qTimerFill,
                        { width: starTimerWidth, backgroundColor: starTimerColor },
                      ]}
                    />
                  </View>
                </View>
              ) : null}

              <Text style={styles.starMeaning}>{currentStar.meaningVi}</Text>
              <Text style={styles.starInstruction}>
                Chạm 4 mảnh bên dưới để xếp thành câu đúng (phím 1–4 chọn nhanh, Backspace hoàn tác, Enter kiểm tra):
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
                {starOptions.map((chip, idx) => (
                  <Pressable
                    key={chip.id}
                    style={({ pressed }) => [styles.bankChip, pressed && styles.chipPressed]}
                    onPress={() => handlePickStarChip(chip)}
                  >
                    <Text style={styles.bankKeyHint}>{idx + 1}</Text>
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
                      : starTimedOut
                        ? `⏱️ Hết giờ! Thứ tự đúng: ${currentStar.prefixJa} ${currentStar.parts.join(' | ')} ${currentStar.suffixJa}`
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
                      <ResetIcon size={14} color={nihongoTheme.colors.textPrimary} />
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
            </Animated.View>
          ) : null}
        </View>
      ) : (
        <View style={styles.sectionGap}>
          {blitzPhase === 'setup' ? (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Bắn Trợ Từ &amp; Chia Thể 60s</Text>
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>Kỷ lục: {blitzBest}đ</Text>
                </View>
              </View>
              <Text style={styles.summarySub}>
                Tổng 60 giây · Giới hạn phản xạ {BLITZ_Q_LIMIT_SEC}s mỗi câu · 3 tim · Trả lời dưới 3.5s cộng thêm +5đ · Combo nhân tối đa ×3!
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

              <Pressable style={[styles.primaryBtn, { backgroundColor: '#4F46E5' }]} onPress={startBlitz}>
                <Text style={styles.primaryBtnText}>Bắt đầu 60 giây</Text>
              </Pressable>
            </View>
          ) : blitzPhase === 'playing' && currentBlitz ? (
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: blitzCardEnterAnim,
                  transform: [
                    { translateX: blitzShakeAnim },
                    {
                      translateY: blitzCardEnterAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Floating score popup */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.floatPopup,
                  blitzFloatTone === 'fast'
                    ? styles.floatFast
                    : blitzFloatTone === 'miss'
                      ? styles.floatMiss
                      : styles.floatOk,
                  { opacity: blitzFloatOpacity, transform: [{ translateY: blitzFloatY }] },
                ]}
              >
                <Text style={styles.floatPopupText}>{blitzFloatText}</Text>
              </Animated.View>

              <View style={styles.hudRow}>
                <View style={styles.hudPill}>
                  <ClockIcon size={13} color={nihongoTheme.colors.textPrimary} />
                  <Text style={styles.hudText}>{blitzTimeLeft}s</Text>
                </View>
                <View style={styles.hudPill}>
                  <View style={styles.heartsRow}>
                    {[0, 1, 2].map((i) => (
                      <HeartIcon
                        key={i}
                        size={14}
                        color={i < blitzHearts ? '#DC2626' : '#D6CCC2'}
                        filled={i < blitzHearts}
                      />
                    ))}
                  </View>
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

              {/* 8s Per-Question Reflex Bar */}
              <View style={styles.qTimerWrap}>
                <View style={styles.rowBetween}>
                  <View style={styles.timerLabelRow}>
                    <LightningBoltIcon size={13} color={blitzTimerColor} />
                    <Text style={[styles.qTimerLabel, { color: blitzTimerColor }]}>
                      Phản xạ câu: {blitzQTimeLeftSec.toFixed(1)}s / {BLITZ_Q_LIMIT_SEC}s
                    </Text>
                  </View>
                  {blitzQTimeRatio > 0.56 && blitzPicked === null ? (
                    <Text style={styles.fastBonusHint}>Cửa sổ +5đ Siêu tốc</Text>
                  ) : null}
                </View>
                <View style={styles.qTimerTrack}>
                  <Animated.View
                    style={[
                      styles.qTimerFill,
                      { width: blitzTimerWidth, backgroundColor: blitzTimerColor },
                    ]}
                  />
                </View>
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
                {blitzChoices.map((ch, idx) => {
                  const picked = blitzPicked === ch;
                  const isCorrect = ch === currentBlitz.correct;
                  const showOk = blitzPicked !== null && isCorrect;
                  const showWrong = blitzPicked !== null && picked && !isCorrect;
                  return (
                    <Pressable
                      key={ch}
                      style={({ pressed }) => [
                        styles.blitzChoiceBtn,
                        showOk && styles.blitzChoiceOk,
                        showWrong && styles.blitzChoiceBad,
                        pressed && blitzPicked === null && styles.chipPressed,
                      ]}
                      disabled={blitzPicked !== null}
                      onPress={() => handleBlitzAnswer(ch)}
                    >
                      <Text style={styles.choiceNumHint}>{idx + 1}</Text>
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
            </Animated.View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.doneTitle}>Hết giờ! Tổng điểm: {blitzScore}</Text>
              <Text style={styles.doneScore}>Kỷ lục cá nhân: {blitzBest} điểm</Text>
              {blitzKsMsg ? (
                <View style={styles.ksBanner}>
                  <CoinKsIcon size={15} color={nihongoTheme.colors.accentHover} />
                  <Text style={styles.ksBannerText}>{blitzKsMsg}</Text>
                </View>
              ) : null}

              {blitzMissed.length > 0 ? (
                <View style={styles.missedSection}>
                  <Text style={styles.label}>Ôn lại các câu vừa sai / quá giờ ({blitzMissed.length})</Text>
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
                <Pressable
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: '#4F46E5' }]}
                  onPress={startBlitz}
                >
                  <Text style={styles.primaryBtnText}>Chơi lại 60s</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 15.5,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  summarySub: {
    fontSize: 13,
    lineHeight: 19,
    color: nihongoTheme.colors.textSecondary,
  },
  libProgressTrack: {
    height: 7,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  libProgressFill: {
    height: '100%',
    backgroundColor: '#1B873F',
    borderRadius: 4,
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
  subFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subChip: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  subChipActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  subChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  subChipTextActive: {
    color: '#FFFFFF',
  },
  progChip: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progChipActive: {
    backgroundColor: '#1E1E1E',
  },
  progChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  progChipTextActive: {
    color: '#FFFFFF',
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
  badgePairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
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
  catTag: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  catTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
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
  structureBox: {
    alignSelf: 'flex-start',
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  loadMoreBtn: {
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
    position: 'relative',
    ...nihongoTheme.shadow.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  floatPopup: {
    position: 'absolute',
    right: 18,
    top: 10,
    zIndex: 20,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  floatOk: {
    backgroundColor: '#1B873F',
  },
  floatFast: {
    backgroundColor: '#4F46E5',
  },
  floatMiss: {
    backgroundColor: '#DC2626',
  },
  floatPopupText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  comboPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  comboText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  starRightHud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  switchMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchMiniText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  qTimerWrap: {
    gap: 5,
  },
  timerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  qTimerLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  fastBonusHint: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: nihongoTheme.radius.pill,
  },
  qTimerTrack: {
    height: 6,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  qTimerFill: {
    height: '100%',
    borderRadius: 4,
  },
  starMeaning: {
    fontSize: 16.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  bankKeyHint: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 10.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
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
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  choiceNumHint: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11.5,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
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
    flex: 1,
    fontSize: 15.5,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
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
