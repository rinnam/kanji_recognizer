import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VocabularyDto } from '../../../packages/contracts/src/study';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import {
  BossSwordIcon,
  ClockIcon,
  CoinKsIcon,
  HeartIcon,
  LightningBoltIcon,
  ShieldCheckIcon,
  VolumeIcon,
} from '../../src/components/AppIcons';
import {
  GameDeckSelector,
  loadSavedGameDeckSelection,
  saveGameDeckSelection,
} from '../../src/components/GameDeckSelector';
import { SmoothProgressBar } from '../../src/components/SmoothProgressBar';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { getUserScopedKey } from '../../src/features/auth/auth-store';
import {
  countDeckMatches,
  DEFAULT_GAME_DECK_SELECTION,
  selectGameDeck,
  shuffleItems,
  useGameVocabulary,
  type GameDeckSelection,
} from '../../src/features/games/use-game-vocab';
import { claimDailyGameReward } from '../../src/features/membership/membership-store';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';
import { useIsMobilePhone } from '../../src/utils/device';
import { hapticCrit, hapticError, hapticSuccess, hapticTap } from '../../src/utils/haptics';
import { speakJapanese } from '../../src/utils/speak-japanese';

type Difficulty = 'Dễ' | 'Vừa' | 'Khó';
type QuestionKind = 'kanji_to_vi' | 'audio_to_word' | 'vi_to_word';
type FloatTone = 'crit' | 'hit' | 'block' | 'miss';

interface BossQuestion {
  kind: QuestionKind;
  word: VocabularyDto;
  promptLabel: string;
  promptMain: string;
  promptSub: string;
  options: string[];
  correctOption: string;
}

const MOMO_BOSS_BEST_KEY = 'kanji_smart_momo_boss_best_v1';
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const BOSS_NAMES = [
  'Tanuki Gác Cổng',
  'Tướng Oni Kanji',
  'Đại Ma Vương Ngữ Nghĩa',
];

function getQuestionLimitSec(d: Difficulty): number {
  if (d === 'Dễ') return 12;
  if (d === 'Khó') return 6.5;
  return 9;
}

function hasValidSino(s: string | null | undefined): s is string {
  const trimmed = s?.trim() ?? '';
  return trimmed.length > 0 && !['-', '—', '–', 'n/a'].includes(trimmed.toLowerCase());
}

function formatWordWithReading(word: VocabularyDto): string {
  return word.reading && word.reading !== word.word
    ? `${word.word} (${word.reading})`
    : word.word;
}

function buildBossQuestion(
  targets: readonly VocabularyDto[],
  distractorPool: readonly VocabularyDto[],
  idx: number,
): BossQuestion {
  const target = targets[idx % targets.length]!;
  const kinds: QuestionKind[] = ['kanji_to_vi', 'audio_to_word', 'vi_to_word'];
  const kind = kinds[idx % kinds.length]!;
  const distractorsPool = shuffleItems(
    distractorPool.filter(
      (w) => w.id !== target.id && w.meaning !== target.meaning && w.word !== target.word,
    ),
  ).slice(0, 3);

  if (kind === 'kanji_to_vi') {
    const options = shuffleItems([
      target.meaning,
      ...distractorsPool.map((d) => d.meaning),
    ]);
    return {
      kind,
      word: target,
      promptLabel: 'Đòn 1 · Nhìn Kanji / Từ → Chọn nghĩa Việt',
      promptMain: target.word,
      promptSub: 'Chọn nhanh nghĩa tiếng Việt chính xác',
      options,
      correctOption: target.meaning,
    };
  }

  if (kind === 'audio_to_word') {
    const options = shuffleItems([
      target.word,
      ...distractorsPool.map((d) => d.word),
    ]);
    const levelLabel = target.jlptLevel ?? 'SRS';
    return {
      kind,
      word: target,
      promptLabel: 'Đòn 2 · Nghe âm thanh → Chọn đúng từ tiếng Nhật',
      promptMain: 'Nghe phát âm & chọn từ đúng',
      promptSub: `Nghe kỹ phát âm rồi chọn đúng từ tiếng Nhật (${levelLabel})`,
      options,
      correctOption: target.word,
    };
  }

  const options = shuffleItems([
    target.word,
    ...distractorsPool.map((d) => d.word),
  ]);
  return {
    kind,
    word: target,
    promptLabel: 'Đòn 3 · Nhìn nghĩa Việt → Chọn từ tiếng Nhật đúng',
    promptMain: target.meaning,
    promptSub: hasValidSino(target.sinoVietnamese)
      ? `Hán Việt: ${target.sinoVietnamese}`
      : 'Chọn từ tiếng Nhật tương ứng',
    options,
    correctOption: target.word,
  };
}

export default function BotGameScreen() {
  const isPhone = useIsMobilePhone();
  const { words, folders, loading } = useGameVocabulary();
  const [difficulty, setDifficulty] = useState<Difficulty>('Vừa');
  const [deckSelection, setDeckSelection] = useState<GameDeckSelection>(DEFAULT_GAME_DECK_SELECTION);
  const [phase, setPhase] = useState<'setup' | 'battle' | 'summary'>('setup');

  const [deck, setDeck] = useState<VocabularyDto[]>([]);
  const [activeDeckLabel, setActiveDeckLabel] = useState('Tất cả bộ từ');
  const [bestScore, setBestScore] = useState(0);

  // Battle RPG state
  const [qIdx, setQIdx] = useState(0);
  const [question, setQuestion] = useState<BossQuestion | null>(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [wave, setWave] = useState(1);
  const [bossMaxHp, setBossMaxHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [critCount, setCritCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);

  // Per-question reflex timer display
  const questionLimitSec = getQuestionLimitSec(difficulty);
  const [qTimeLeftSec, setQTimeLeftSec] = useState(questionLimitSec);
  const [qTimeRatio, setQTimeRatio] = useState(1);

  // Skills: Q (50/50 arrows), E (Momo Shield)
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
  const [arrowCooldown, setArrowCooldown] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldCooldown, setShieldCooldown] = useState(0);

  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [battleLog, setBattleLog] = useState('Chuẩn bị khai chiến!');
  const [missedWords, setMissedWords] = useState<VocabularyDto[]>([]);
  const [victory, setVictory] = useState(false);
  const [ksMsg, setKsMsg] = useState<string | null>(null);
  const [floatText, setFloatText] = useState('');
  const [floatTone, setFloatTone] = useState<FloatTone>('hit');

  // Refs for timers & synchronous checks
  const targetsRef = useRef<VocabularyDto[]>([]);
  const distractorPoolRef = useRef<VocabularyDto[]>([]);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const qStartTsRef = useRef<number>(0);
  const qRatioRef = useRef<number>(1);
  const timeoutFiredRef = useRef(false);

  // Animated values (0..1 normalized for UI-thread transform bars)
  const qTimerAnim = useRef(new Animated.Value(1)).current;
  const playerHpAnim = useRef(new Animated.Value(1)).current;
  const bossHpAnim = useRef(new Animated.Value(1)).current;
  const bossShakeAnim = useRef(new Animated.Value(0)).current;
  const playerShakeAnim = useRef(new Animated.Value(0)).current;
  const cardEnterAnim = useRef(new Animated.Value(1)).current;
  const floatOpacity = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void getUserScopedKey(MOMO_BOSS_BEST_KEY)
      .then((k) => AsyncStorage.getItem(k))
      .then((raw) => {
        if (raw) {
          const n = Number(raw);
          if (Number.isFinite(n)) setBestScore(n);
        }
      });
    void loadSavedGameDeckSelection().then(setDeckSelection);
    return () => {
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      if (rafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleDeckChange = (next: GameDeckSelection) => {
    setDeckSelection(next);
    void saveGameDeckSelection(next);
  };

  const previewCount = countDeckMatches(words, deckSelection, folders);

  const initialBossHp = (d: Difficulty, w: number) => {
    const base = d === 'Dễ' ? 75 : d === 'Khó' ? 140 : 100;
    return base + (w - 1) * 25;
  };

  const triggerShake = (anim: Animated.Value) => {
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 8, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(anim, { toValue: -8, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(anim, { toValue: 6, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  };

  const triggerFloatPopup = (text: string, tone: FloatTone) => {
    setFloatText(text);
    setFloatTone(tone);
    floatY.setValue(0);
    floatOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(floatY, { toValue: -34, duration: 680, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(floatOpacity, { toValue: 0, duration: 680, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  };

  const triggerCardEnter = () => {
    cardEnterAnim.setValue(0);
    Animated.timing(cardEnterAnim, {
      toValue: 1,
      duration: 210,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const animateHpBars = (nextPlayer: number, nextBoss: number, maxBoss: number) => {
    Animated.parallel([
      Animated.timing(playerHpAnim, {
        toValue: Math.max(0, Math.min(1, nextPlayer / 100)),
        duration: 240,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(bossHpAnim, {
        toValue: Math.max(0, Math.min(1, nextBoss / Math.max(1, maxBoss))),
        duration: 240,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  };

  const resetQuestionTimer = (limitSec: number) => {
    qStartTsRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    qRatioRef.current = 1;
    timeoutFiredRef.current = false;
    qTimerAnim.setValue(1);
    setQTimeRatio(1);
    setQTimeLeftSec(limitSec);
  };

  const finishBattle = (won: boolean, finalScore: number) => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
    if (rafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setVictory(won);
    setPhase('summary');
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      void getUserScopedKey(MOMO_BOSS_BEST_KEY)
        .then((k) => AsyncStorage.setItem(k, String(finalScore)))
        .catch(() => undefined);
    }
    if (won || finalScore >= 60) {
      void claimDailyGameReward('momo_boss', finalScore)
        .then((res) => {
          if (res.applied) {
            setKsMsg(`Chiến tích lần đầu hôm nay: +${res.delta} Xu KS!`);
          } else if (res.dailyGameCapReached) {
            setKsMsg('Đã đạt trần thưởng 3 game/ngày hôm nay (quay lại ngày mai để nhận tiếp Xu KS).');
          } else {
            setKsMsg('Đã nhận thưởng Xu KS Công thành Momo hôm nay rồi.');
          }
        })
        .catch(() => undefined);
    }
  };

  const startBattle = () => {
    recordMeaningfulStudyAction('momo_boss_start');
    const { targets, distractorPool, deckLabel } = selectGameDeck(words, deckSelection, folders);
    if (targets.length === 0) return;

    targetsRef.current = targets;
    distractorPoolRef.current = distractorPool;
    setDeck(targets);
    setActiveDeckLabel(deckLabel);

    const hp1 = initialBossHp(difficulty, 1);
    setWave(1);
    setBossMaxHp(hp1);
    setBossHp(hp1);
    setPlayerHp(100);
    playerHpAnim.setValue(1);
    bossHpAnim.setValue(1);
    setScore(0);
    setCombo(0);
    setCritCount(0);
    setTimeLeft(180);
    setHiddenIndices([]);
    setArrowCooldown(0);
    setShieldActive(false);
    setShieldCooldown(0);
    setPickedOption(null);
    setMissedWords([]);
    setKsMsg(null);
    floatOpacity.stopAnimation();
    floatOpacity.setValue(0);
    floatY.stopAnimation();
    floatY.setValue(0);
    setFloatText('');
    hapticTap();
    setBattleLog(
      `Wave 1: ${BOSS_NAMES[0]} (${targets.length} từ trong bộ)! Trả lời trong ${getQuestionLimitSec(difficulty)}s để nổ Chí mạng.`,
    );

    const firstQ = buildBossQuestion(targets, distractorPool, 0);
    setQIdx(0);
    setQuestion(firstQ);
    resetQuestionTimer(getQuestionLimitSec(difficulty));
    setPhase('battle');
    triggerCardEnter();
    if (firstQ.kind === 'audio_to_word') {
      void speakJapanese(firstQ.word.reading || firstQ.word.word);
    }
  };

  // Global 180s match timer
  useEffect(() => {
    if (phase !== 'battle') return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'battle' && timeLeft === 0) {
      finishBattle(false, score);
    }
  }, [phase, timeLeft]);

  const scheduleNextQuestion = (
    nextPlayerHp: number,
    nextBossHp: number,
    nextWaveInit: number,
    nextBossMaxInit: number,
    nextScore: number,
    delayMs: number,
  ) => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    nextTimerRef.current = setTimeout(() => {
      if (nextPlayerHp <= 0) {
        finishBattle(false, nextScore);
        return;
      }
      let nextWave = nextWaveInit;
      let nextBossMax = nextBossMaxInit;
      if (nextBossHp <= 0) {
        if (nextWave >= 3) {
          finishBattle(true, nextScore + 100);
          return;
        }
        nextWave += 1;
        nextBossMax = initialBossHp(difficulty, nextWave);
        setWave(nextWave);
        setBossMaxHp(nextBossMax);
        setBossHp(nextBossMax);
        bossHpAnim.setValue(1);
        setBattleLog(`Hạ gục Wave ${nextWave - 1}! ${BOSS_NAMES[nextWave - 1]} tiến lên!`);
      }

      const nextIdx = qIdx + 1;
      const nextQ = buildBossQuestion(targetsRef.current, distractorPoolRef.current, nextIdx);
      setQIdx(nextIdx);
      setQuestion(nextQ);
      setPickedOption(null);
      setHiddenIndices([]);
      resetQuestionTimer(getQuestionLimitSec(difficulty));
      triggerCardEnter();
      if (nextQ.kind === 'audio_to_word') {
        void speakJapanese(nextQ.word.reading || nextQ.word.word);
      }
    }, delayMs);
  };

  const handleUseArrows = () => {
    if (!question || pickedOption !== null || arrowCooldown > 0 || hiddenIndices.length > 0) return;
    recordMeaningfulStudyAction('momo_boss_arrow');
    hapticTap();
    const wrongIndices = question.options
      .map((opt, idx) => (opt !== question.correctOption ? idx : -1))
      .filter((idx) => idx >= 0);
    const toHide = shuffleItems(wrongIndices).slice(0, 2);
    setHiddenIndices(toHide);
    setArrowCooldown(3);
    setBattleLog('Mưa tên: Đã loại bỏ 2 đáp án sai!');
  };

  const handleUseShield = () => {
    if (pickedOption !== null || shieldActive || shieldCooldown > 0) return;
    recordMeaningfulStudyAction('momo_boss_shield');
    hapticTap();
    setShieldActive(true);
    setShieldCooldown(4);
    setBattleLog('Khiên Momo đã bật — miễn nhiễm sát thương lượt này!');
  };

  const handleAnswer = (opt: string) => {
    if (phase !== 'battle' || !question || pickedOption !== null) return;
    recordMeaningfulStudyAction('momo_boss_answer');
    setPickedOption(opt);
    const ok = opt === question.correctOption;

    let nextPlayerHp = playerHp;
    let nextBossHp = bossHp;
    let nextScore = score;
    let nextCombo = combo;

    if (ok) {
      nextCombo = combo + 1;
      const comboMult = nextCombo >= 10 ? 2.0 : nextCombo >= 5 ? 1.5 : nextCombo >= 3 ? 1.25 : 1;
      const isCrit = qRatioRef.current >= 0.6;
      const critMult = isCrit ? 1.35 : 1;
      const dmg = Math.round(25 * comboMult * critMult);
      nextScore = score + dmg;
      nextBossHp = Math.max(0, bossHp - dmg);
      if (isCrit) {
        setCritCount((c) => c + 1);
        hapticCrit();
      } else {
        hapticSuccess();
      }

      triggerShake(bossShakeAnim);
      triggerFloatPopup(isCrit ? `-${dmg} CHÍ MẠNG!` : `-${dmg} HP`, isCrit ? 'crit' : 'hit');
      setBattleLog(
        `${isCrit ? '⚡ CHÍ MẠNG! ' : ''}Gây ${dmg} sát thương!${nextCombo >= 3 ? ` (Combo ×${nextCombo})` : ''} · "${formatWordWithReading(question.word)}" = ${question.word.meaning}`,
      );
      if (question.kind !== 'audio_to_word') {
        void speakJapanese(question.word.reading || question.word.word);
      }
    } else {
      nextCombo = 0;
      const incoming = difficulty === 'Dễ' ? 12 : difficulty === 'Khó' ? 24 : 18;
      if (shieldActive) {
        hapticSuccess();
        triggerFloatPopup('🛡️ ĐỠ ĐÒN!', 'block');
        setBattleLog(`Khiên Momo đã đỡ trọn đòn phản công! Đáp án đúng: "${formatWordWithReading(question.word)}" = ${question.word.meaning}`);
      } else {
        hapticError();
        nextPlayerHp = Math.max(0, playerHp - incoming);
        triggerShake(playerShakeAnim);
        triggerFloatPopup(`-${incoming} HP`, 'miss');
        setBattleLog(`Trả lời sai! Boss phản công -${incoming} HP. Đúng: "${formatWordWithReading(question.word)}" = ${question.word.meaning}`);
      }
      setMissedWords((prev) =>
        prev.some((w) => w.id === question.word.id) ? prev : [...prev, question.word],
      );
    }

    setCombo(nextCombo);
    setScore(nextScore);
    setPlayerHp(nextPlayerHp);
    setBossHp(nextBossHp);
    animateHpBars(nextPlayerHp, nextBossHp, bossMaxHp);
    setShieldActive(false);
    setArrowCooldown((c) => Math.max(0, c - (ok ? 1 : 0)));
    setShieldCooldown((c) => Math.max(0, c - (ok ? 1 : 0)));

    scheduleNextQuestion(nextPlayerHp, nextBossHp, wave, bossMaxHp, nextScore, ok ? 760 : 1250);
  };

  const handleQuestionTimeout = () => {
    if (phase !== 'battle' || !question || pickedOption !== null) return;
    setPickedOption('__TIMEOUT__');
    const incoming = difficulty === 'Dễ' ? 12 : difficulty === 'Khó' ? 24 : 18;
    let nextPlayerHp = playerHp;

    if (shieldActive) {
      hapticSuccess();
      triggerFloatPopup('🛡️ ĐỠ ĐÒN!', 'block');
      setBattleLog(`Hết giờ câu này! Khiên Momo đã chặn sát thương. Đáp án: "${formatWordWithReading(question.word)}" = ${question.word.meaning}`);
    } else {
      hapticError();
      nextPlayerHp = Math.max(0, playerHp - incoming);
      triggerShake(playerShakeAnim);
      triggerFloatPopup(`HẾT GIỜ -${incoming} HP`, 'miss');
      setBattleLog(`Hết ${questionLimitSec}s phản xạ! Boss ra đòn -${incoming} HP. Đáp án: "${formatWordWithReading(question.word)}" = ${question.word.meaning}`);
    }

    setCombo(0);
    setPlayerHp(nextPlayerHp);
    animateHpBars(nextPlayerHp, bossHp, bossMaxHp);
    setShieldActive(false);
    setMissedWords((prev) =>
      prev.some((w) => w.id === question.word.id) ? prev : [...prev, question.word],
    );

    scheduleNextQuestion(nextPlayerHp, bossHp, wave, bossMaxHp, score, 1250);
  };

  const timeoutHandlerRef = useRef(handleQuestionTimeout);
  timeoutHandlerRef.current = handleQuestionTimeout;

  // 60fps per-question reflex timer loop via requestAnimationFrame
  useEffect(() => {
    if (phase !== 'battle' || !question || pickedOption !== null) return;
    if (typeof requestAnimationFrame === 'undefined') return;

    const limitMs = getQuestionLimitSec(difficulty) * 1000;
    let lastHudUpdateTs = 0;

    const tick = (now: number) => {
      const elapsed = now - qStartTsRef.current;
      const ratio = Math.max(0, Math.min(1, 1 - elapsed / limitMs));
      qRatioRef.current = ratio;
      qTimerAnim.setValue(ratio);

      if (now - lastHudUpdateTs >= 220 || ratio === 0) {
        lastHudUpdateTs = now;
        setQTimeRatio(ratio);
        setQTimeLeftSec(Math.max(0, Number(((limitMs - elapsed) / 1000).toFixed(1))));
      }

      if (ratio <= 0) {
        if (!timeoutFiredRef.current) {
          timeoutFiredRef.current = true;
          timeoutHandlerRef.current();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, qIdx, question, pickedOption, difficulty]);

  const keyRef = useRef({
    phase,
    question,
    hiddenIndices,
    pickedOption,
    handleAnswer,
    handleUseArrows,
    handleUseShield,
  });
  keyRef.current = {
    phase,
    question,
    hiddenIndices,
    pickedOption,
    handleAnswer,
    handleUseArrows,
    handleUseShield,
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (ev: KeyboardEvent) => {
      const s = keyRef.current;
      if (s.phase !== 'battle' || !s.question) return;
      if (ev.key >= '1' && ev.key <= '4') {
        const idx = Number(ev.key) - 1;
        const opt = s.question.options[idx];
        if (opt && !s.hiddenIndices.includes(idx) && s.pickedOption === null) {
          ev.preventDefault();
          s.handleAnswer(opt);
        }
      } else if (ev.key.toLowerCase() === 'q') {
        ev.preventDefault();
        s.handleUseArrows();
      } else if (ev.key.toLowerCase() === 'e') {
        ev.preventDefault();
        s.handleUseShield();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const bossName = BOSS_NAMES[wave - 1] ?? BOSS_NAMES[0]!;
  const timerColor = qTimeRatio > 0.5 ? '#1B873F' : qTimeRatio > 0.25 ? '#D97706' : '#DC2626';

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Công thành Momo"
        subtitle={
          isPhone && phase === 'battle'
            ? `${activeDeckLabel} (${deck.length} từ)`
            : `Boss Raid phản xạ từ kho SRS (${words.length} từ) · Kỷ lục: ${bestScore}đ`
        }
        rightSlot={
          <View style={styles.headerBadge}>
            <BossSwordIcon size={15} color="#DC2626" />
            <Text style={styles.headerBadgeText}>{questionLimitSec}s/câu</Text>
          </View>
        }
      />

      {phase === 'setup' ? (
        <View style={styles.card}>
          <Text style={styles.label}>Độ khó Boss &amp; Tốc độ phản xạ</Text>
          <View style={styles.row}>
            {(
              [
                ['Dễ', '12s/câu'],
                ['Vừa', '9s/câu'],
                ['Khó', '6.5s/câu'],
              ] as const
            ).map(([d, timeLabel]) => (
              <Pressable
                key={d}
                style={[styles.chip, difficulty === d && styles.chipActive]}
                onPress={() => {
                  recordMeaningfulStudyAction('game_option');
                  setDifficulty(d);
                }}
              >
                <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>
                  {d} ({timeLabel})
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Chọn bộ từ vựng &amp; Số từ ôn</Text>
          <GameDeckSelector
            words={words}
            folders={folders}
            value={deckSelection}
            onChange={handleDeckChange}
            accentColor="#DC2626"
          />

          <View style={styles.rulesCard}>
            <Text style={styles.rulesText}>
              • Hạ 3 Wave Boss với 3 kiểu đòn: Kanji → Nghĩa, Nghe âm thanh → Từ Nhật, Nghĩa → Từ Nhật.
            </Text>
            <Text style={styles.rulesText}>
              • Mỗi câu có đồng hồ đếm ngược ({questionLimitSec}s). Trả lời trong 40% thời gian đầu nổ đòn ⚡ CHÍ MẠNG (+35% sát thương)! Hết giờ Boss tự động phản công.
            </Text>
            {!isPhone ? (
              <Text style={styles.rulesText}>
                • Phím tắt web: 1–4 chọn đáp án · Q: Mưa tên (50/50) · E: Khiên Momo.
              </Text>
            ) : null}
          </View>

          <Pressable
            style={[styles.primaryBtn, (loading || previewCount === 0) && styles.btnDisabled]}
            disabled={loading || previewCount === 0}
            onPress={startBattle}
          >
            <Text style={styles.primaryBtnText}>
              {loading
                ? 'Đang tải kho từ vựng...'
                : previewCount === 0
                  ? 'Chưa có từ khớp bộ lọc'
                  : `Xuất quân công thành (${deckSelection.limitCount > 0 ? Math.min(deckSelection.limitCount, previewCount) : previewCount} từ)`}
            </Text>
          </Pressable>
        </View>
      ) : phase === 'battle' && question ? (
        <View style={[styles.sectionGap, isPhone && styles.sectionGapPhone]}>
          {!isPhone ? (
            <View style={styles.broadNotice}>
              <Text style={styles.broadNoticeText}>
                Bộ từ: {activeDeckLabel} ({deck.length} từ đang luyện)
              </Text>
            </View>
          ) : null}

          {/* Battle HUD with shake & floating popup */}
          <Animated.View
            style={[
              styles.card,
              isPhone && styles.cardPhone,
              { transform: [{ translateX: bossShakeAnim }] },
            ]}
          >
            {/* Floating battle damage/crit popup */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floatPopup,
                floatTone === 'crit' && styles.floatCrit,
                floatTone === 'block' && styles.floatBlock,
                floatTone === 'miss' && styles.floatMiss,
                {
                  opacity: floatOpacity,
                  transform: [{ translateY: floatY }],
                },
              ]}
            >
              <Text style={styles.floatPopupText}>{floatText}</Text>
            </Animated.View>

            <View style={styles.hudTop}>
              <View style={styles.wavePipsRow}>
                {[1, 2, 3].map((w) => (
                  <View
                    key={w}
                    style={[
                      styles.wavePip,
                      w < wave && styles.wavePipCleared,
                      w === wave && styles.wavePipCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.wavePipText,
                        (w < wave || w === wave) && styles.wavePipTextActive,
                      ]}
                    >
                      W{w}
                    </Text>
                  </View>
                ))}
                <Text style={[styles.waveText, isPhone && styles.waveTextPhone]}>{bossName}</Text>
              </View>
              <View style={styles.hudClockGroup}>
                <ClockIcon size={14} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.timerText}>{timeLeft}s · {score}đ</Text>
              </View>
            </View>

            <View style={[styles.barsRow, isPhone && styles.barsRowPhone]}>
              <View style={[styles.barCol, isPhone && styles.barColPhone]}>
                <View style={styles.barHeaderRow}>
                  <HeartIcon size={13} color="#1B873F" />
                  <Text style={styles.barLabel}>Bạn: {playerHp}/100</Text>
                </View>
                <SmoothProgressBar
                  progress={playerHpAnim}
                  color="#1B873F"
                  trackColor={nihongoTheme.colors.chipNeutralBg}
                  height={isPhone ? 8 : 11}
                  borderRadius={6}
                />
              </View>
              <View style={[styles.barCol, isPhone && styles.barColPhone]}>
                <View style={styles.barHeaderRow}>
                  <BossSwordIcon size={13} color="#DC2626" />
                  <Text style={styles.barLabel}>Boss: {bossHp}/{bossMaxHp}</Text>
                </View>
                <SmoothProgressBar
                  progress={bossHpAnim}
                  color="#DC2626"
                  trackColor={nihongoTheme.colors.chipNeutralBg}
                  height={isPhone ? 8 : 11}
                  borderRadius={6}
                />
              </View>
            </View>

            <View style={styles.skillsRow}>
              <Pressable
                style={[
                  styles.skillBtn,
                  isPhone && styles.skillBtnPhone,
                  arrowCooldown > 0 && styles.skillBtnCd,
                ]}
                disabled={arrowCooldown > 0 || pickedOption !== null}
                onPress={handleUseArrows}
              >
                <Text style={styles.skillBtnText}>
                  Mưa tên{!isPhone ? ' [Q]' : ''} {arrowCooldown > 0 ? `(Hồi ${arrowCooldown})` : '· Sẵn sàng'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.skillBtn,
                  isPhone && styles.skillBtnPhone,
                  shieldActive && styles.skillBtnActive,
                  shieldCooldown > 0 && !shieldActive && styles.skillBtnCd,
                ]}
                disabled={shieldCooldown > 0 || shieldActive || pickedOption !== null}
                onPress={handleUseShield}
              >
                <ShieldCheckIcon
                  size={15}
                  color={shieldActive ? '#1B873F' : nihongoTheme.colors.accentHover}
                />
                <Text style={[styles.skillBtnText, shieldActive && styles.skillTextActive]}>
                  Khiên{!isPhone ? ' [E]' : ''} {shieldActive ? 'Đang bật' : shieldCooldown > 0 ? `(Hồi ${shieldCooldown})` : '· Sẵn sàng'}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.battleLog, isPhone && styles.battleLogPhone]} numberOfLines={isPhone ? 2 : undefined}>
              {battleLog}
            </Text>
          </Animated.View>

          {/* Question Card with per-question reflex timer + shake */}
          <Animated.View
            style={[
              styles.card,
              isPhone && styles.cardPhone,
              {
                opacity: cardEnterAnim,
                transform: [
                  { translateX: playerShakeAnim },
                  {
                    translateY: cardEnterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Per-Question Reflex Countdown Bar */}
            <View style={styles.qTimerWrap}>
              <View style={styles.qTimerHeader}>
                <View style={styles.qTimerTitleRow}>
                  <LightningBoltIcon size={14} color={timerColor} />
                  <Text style={[styles.qTimerLabel, { color: timerColor }]}>
                    Phản xạ: {qTimeLeftSec.toFixed(1)}s
                  </Text>
                </View>
                {qTimeRatio >= 0.6 && pickedOption === null ? (
                  <Text style={styles.critHint}>Chí mạng (+35%)</Text>
                ) : null}
              </View>
              <SmoothProgressBar
                progress={qTimerAnim}
                color={timerColor}
                trackColor={nihongoTheme.colors.chipNeutralBg}
                height={isPhone ? 6 : 7}
                borderRadius={5}
              />
            </View>

            <View style={styles.hudTop}>
              <Text style={styles.qKindLabel}>{question.promptLabel}</Text>
              {combo >= 2 ? (
                <View style={styles.comboPill}>
                  <Text style={styles.comboText}>Combo ×{combo}</Text>
                </View>
              ) : null}
            </View>

            {question.kind === 'audio_to_word' ? (
              <Pressable
                style={[styles.audioPromptBtn, isPhone && styles.audioPromptBtnPhone]}
                onPress={() => void speakJapanese(question.word.reading || question.word.word)}
              >
                <VolumeIcon size={22} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.audioPromptText}>Bấm để nghe lại phát âm</Text>
              </Pressable>
            ) : (
              <Text style={[styles.qMain, isPhone && styles.qMainPhone]}>{question.promptMain}</Text>
            )}
            <Text style={styles.qSub}>{question.promptSub}</Text>

            <View style={styles.optionsCol}>
              {question.options.map((opt, idx) => {
                const isHidden = hiddenIndices.includes(idx);
                const isPicked = pickedOption === opt;
                const isCorrect = opt === question.correctOption;
                const showOk = pickedOption !== null && isCorrect;
                const showBad = pickedOption !== null && isPicked && !isCorrect;
                return (
                  <Pressable
                    key={`${opt}-${idx}`}
                    hitSlop={4}
                    style={({ pressed }) => [
                      styles.optBtn,
                      isPhone && styles.optBtnPhone,
                      isHidden && styles.optHidden,
                      showOk && styles.optOk,
                      showBad && styles.optBad,
                      pressed && pickedOption === null && styles.optPressed,
                    ]}
                    disabled={isHidden || pickedOption !== null}
                    onPress={() => handleAnswer(opt)}
                  >
                    {!isPhone ? <Text style={styles.optNum}>{idx + 1}</Text> : null}
                    <Text style={styles.optText}>
                      {isHidden ? '— Đã loại bằng Mưa tên —' : opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.retreatBtn} onPress={() => finishBattle(false, score)}>
              <Text style={styles.retreatText}>Kết thúc sớm &amp; xem từ sai</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>
            {victory ? 'Toàn thắng 3 Wave Công thành Momo!' : 'Trận chiến kết thúc'}
          </Text>
          <Text style={styles.summaryScore}>
            Điểm trận này: {score}đ · Kỷ lục cá nhân: {bestScore}đ · Đòn Chí mạng: {critCount}
          </Text>

          {ksMsg ? (
            <View style={styles.ksBanner}>
              <CoinKsIcon size={15} color={nihongoTheme.colors.accentHover} />
              <Text style={styles.ksBannerText}>{ksMsg}</Text>
            </View>
          ) : null}

          {missedWords.length > 0 ? (
            <View style={styles.missedBox}>
              <Text style={styles.label}>Từ cần ôn lại ({missedWords.length} từ vừa sai/quá giờ)</Text>
              {missedWords.map((w) => (
                <Pressable
                  key={w.id}
                  style={styles.missedRow}
                  onPress={() => void speakJapanese(w.reading || w.word)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missedWord}>
                      {w.word} {w.reading && w.reading !== w.word ? `(${w.reading})` : ''}
                    </Text>
                    <Text style={styles.missedMean}>{w.meaning}</Text>
                  </View>
                  <VolumeIcon size={16} color={nihongoTheme.colors.accentHover} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.rulesText}>Tuyệt vời! Bạn không trả lời sai từ nào trong trận vừa rồi.</Text>
          )}

          <View style={styles.row}>
            <Pressable style={styles.outlineBtn} onPress={() => setPhase('setup')}>
              <Text style={styles.outlineBtnText}>Chọn độ khó</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={startBattle}>
              <Text style={styles.primaryBtnText}>Chơi lại ngay</Text>
            </Pressable>
          </View>
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  sectionGap: {
    gap: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
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
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  chipActive: {
    backgroundColor: '#DC2626',
  },
  chipText: {
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  rulesCard: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 13,
    gap: 5,
  },
  rulesText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: nihongoTheme.colors.textSecondary,
  },
  primaryBtn: {
    backgroundColor: '#DC2626',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontWeight: '700',
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  broadNotice: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: '#FAD7B5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  broadNoticeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  floatPopup: {
    position: 'absolute',
    alignSelf: 'center',
    top: 8,
    zIndex: 20,
    backgroundColor: nihongoTheme.colors.accentHover,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  floatCrit: {
    backgroundColor: '#D97706',
  },
  floatBlock: {
    backgroundColor: '#0D9488',
  },
  floatMiss: {
    backgroundColor: '#DC2626',
  },
  floatPopupText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  hudTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  wavePipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  wavePip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  wavePipCleared: {
    backgroundColor: '#1B873F',
  },
  wavePipCurrent: {
    backgroundColor: '#DC2626',
  },
  wavePipText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  wavePipTextActive: {
    color: '#FFFFFF',
  },
  waveText: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  hudClockGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  barsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  barCol: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  barHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  hpTrack: {
    height: 11,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: 6,
    overflow: 'hidden',
  },
  hpPlayerFill: {
    height: '100%',
    backgroundColor: '#1B873F',
  },
  hpBossFill: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  skillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skillBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  skillBtnActive: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderColor: nihongoTheme.colors.successText,
  },
  skillBtnCd: {
    opacity: 0.45,
  },
  skillBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  skillTextActive: {
    color: '#1B873F',
  },
  battleLog: {
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qTimerWrap: {
    gap: 6,
  },
  qTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  qTimerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  qTimerLabel: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  critHint: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  qTimerTrack: {
    height: 7,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: 5,
    overflow: 'hidden',
  },
  qTimerFill: {
    height: '100%',
    borderRadius: 5,
  },
  qKindLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  comboPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  comboText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  qMain: {
    fontSize: 30,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
    paddingVertical: 6,
  },
  qSub: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  audioPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
  },
  audioPromptText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  optionsCol: {
    gap: 8,
    marginTop: 4,
  },
  optBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1.2,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  optHidden: {
    opacity: 0.35,
  },
  optOk: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderColor: nihongoTheme.colors.successText,
  },
  optBad: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  optNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  optText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  retreatBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  retreatText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  summaryScore: {
    fontSize: 14.5,
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
  missedBox: {
    gap: 8,
  },
  missedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  missedWord: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  missedMean: {
    fontSize: 12.5,
    color: '#DC2626',
  },
  sectionGapPhone: {
    gap: 8,
  },
  cardPhone: {
    padding: 12,
    gap: 8,
    borderRadius: 18,
  },
  waveTextPhone: {
    fontSize: 13.5,
  },
  barsRowPhone: {
    flexDirection: 'row',
    gap: 8,
  },
  barColPhone: {
    minWidth: 0,
    flex: 1,
    gap: 4,
  },
  skillBtnPhone: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    minWidth: 0,
  },
  battleLogPhone: {
    fontSize: 11.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  audioPromptBtnPhone: {
    paddingVertical: 11,
  },
  qMainPhone: {
    fontSize: 24,
    paddingVertical: 2,
  },
  optBtnPhone: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
