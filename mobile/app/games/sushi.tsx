import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VocabularyDto } from '../../../packages/contracts/src/study';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { MomoAvatar } from '../../src/components/MomoAvatar';
import {
  ClockIcon,
  CoinKsIcon,
  HeartIcon,
  LightningBoltIcon,
  SushiPlateIcon,
  VolumeIcon,
} from '../../src/components/AppIcons';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { getUserScopedKey } from '../../src/features/auth/auth-store';
import { selectGameDeck, shuffleItems, useGameVocabulary } from '../../src/features/games/use-game-vocab';
import { claimDailyGameReward } from '../../src/features/membership/membership-store';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';
import { speakJapanese } from '../../src/utils/speak-japanese';

type BeltSpeed = 'Chậm' | 'Vừa' | 'Nhanh';
type FloatTone = 'good' | 'fever' | 'speed' | 'miss';

interface SushiPlate {
  uid: string;
  word: VocabularyDto;
  lane: 0 | 1;
  xPx: number;
  animX: Animated.Value;
  accent: string;
}

const SUSHI_BEST_KEY = 'kanji_smart_sushi_best_v1';
const PLATE_COLORS = ['#EA580C', '#E11D48', '#0D9488', '#D97706'];
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const MIN_PLATE_GAP_PX = 195;

function getOrderLimitSec(sp: BeltSpeed): number {
  if (sp === 'Chậm') return 14;
  if (sp === 'Nhanh') return 7.5;
  return 10;
}

function getBaseSpeedPx(sp: BeltSpeed): number {
  if (sp === 'Chậm') return 90;
  if (sp === 'Nhanh') return 205;
  return 140;
}

export default function KaitenSushiScreen() {
  const { words, loading } = useGameVocabulary();
  const [level, setLevel] = useState('ALL');
  const [speed, setSpeed] = useState<BeltSpeed>('Vừa');
  const [showKana, setShowKana] = useState(true);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'summary'>('setup');

  const [bestScore, setBestScore] = useState(0);
  const [broadenedNotice, setBroadenedNotice] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [timeLeft, setTimeLeft] = useState(90);
  const [servedCount, setServedCount] = useState(0);
  const [speedBonusCount, setSpeedBonusCount] = useState(0);
  const [orderWord, setOrderWord] = useState<VocabularyDto | null>(null);
  const [plates, setPlates] = useState<SushiPlate[]>([]);
  const [feedback, setFeedback] = useState<string>('Chạm đúng đĩa Sushi mang chữ Nhật khớp nghĩa khách gọi!');
  const [missedWords, setMissedWords] = useState<VocabularyDto[]>([]);
  const [ksMsg, setKsMsg] = useState<string | null>(null);

  const orderLimitSec = getOrderLimitSec(speed);
  const [orderTimeLeftSec, setOrderTimeLeftSec] = useState(orderLimitSec);
  const [orderTimeRatio, setOrderTimeRatio] = useState(1);

  const [floatText, setFloatText] = useState('');
  const [floatTone, setFloatTone] = useState<FloatTone>('good');

  // Synchronous game loop refs
  const deckRef = useRef<VocabularyDto[]>([]);
  const orderRef = useRef<VocabularyDto | null>(null);
  const platesRef = useRef<SushiPlate[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const heartsRef = useRef(3);
  const phaseRef = useRef<'setup' | 'playing' | 'summary'>('setup');
  const speedRef = useRef<BeltSpeed>(speed);
  const beltWidthRef = useRef(760);
  const beltOffsetRef = useRef(0);
  const orderStartTsRef = useRef(0);
  const orderRatioRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  // Animations
  const beltSlatAnim = useRef(new Animated.Value(0)).current;
  const orderTimerAnim = useRef(new Animated.Value(1)).current;
  const orderShakeAnim = useRef(new Animated.Value(0)).current;
  const feverPulseAnim = useRef(new Animated.Value(1)).current;
  const floatOpacity = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  phaseRef.current = phase;
  speedRef.current = speed;

  useEffect(() => {
    void getUserScopedKey(SUSHI_BEST_KEY)
      .then((k) => AsyncStorage.getItem(k))
      .then((raw) => {
        if (raw) {
          const n = Number(raw);
          if (Number.isFinite(n)) setBestScore(n);
        }
      });
    return () => {
      if (rafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Gentle Fever pulse loop when combo >= 3
  useEffect(() => {
    if (phase !== 'playing' || combo < 3) {
      feverPulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(feverPulseAnim, { toValue: 1.07, duration: 380, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(feverPulseAnim, { toValue: 1, duration: 380, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, combo >= 3]);

  const triggerOrderShake = () => {
    orderShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(orderShakeAnim, { toValue: 8, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(orderShakeAnim, { toValue: -8, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(orderShakeAnim, { toValue: 5, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(orderShakeAnim, { toValue: 0, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  };

  const triggerFloatPopup = (text: string, tone: FloatTone) => {
    setFloatText(text);
    setFloatTone(tone);
    floatY.setValue(0);
    floatOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(floatY, { toValue: -32, duration: 640, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(floatOpacity, { toValue: 0, duration: 640, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  };

  const resetOrderTimer = (limitSec: number) => {
    orderStartTsRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    orderRatioRef.current = 1;
    orderTimerAnim.setValue(1);
    setOrderTimeRatio(1);
    setOrderTimeLeftSec(limitSec);
  };

  const pickNextOrder = (pool: readonly VocabularyDto[], avoidId?: string): VocabularyDto => {
    const candidates = pool.filter((w) => w.id !== avoidId);
    const source = candidates.length > 0 ? candidates : pool;
    return source[Math.floor(Math.random() * source.length)]!;
  };

  const makeInitialPlates = (pool: readonly VocabularyDto[], target: VocabularyDto, bw: number): SushiPlate[] => {
    const distractors = shuffleItems(pool.filter((w) => w.id !== target.id)).slice(0, 3);
    const selected = shuffleItems([target, ...distractors]);
    const width = Math.max(340, bw);
    const fractions = [0.22, 0.44, 0.67, 0.89];
    return selected.map((w, i) => {
      const xPx = Math.round(width * fractions[i]!);
      return {
        uid: `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        word: w,
        lane: (i % 2) as 0 | 1,
        xPx,
        animX: new Animated.Value(xPx),
        accent: PLATE_COLORS[i % PLATE_COLORS.length]!,
      };
    });
  };

  const finishGame = (finalScore: number) => {
    if (phaseRef.current === 'summary') return;
    phaseRef.current = 'summary';
    if (rafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPhase('summary');
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      void getUserScopedKey(SUSHI_BEST_KEY)
        .then((k) => AsyncStorage.setItem(k, String(finalScore)))
        .catch(() => undefined);
    }
    if (finalScore >= 30) {
      void claimDailyGameReward('sushi_match', finalScore)
        .then((res) => {
          if (res.applied) {
            setKsMsg(`Phần thưởng Quán Sushi lần đầu hôm nay: +${res.delta} Xu KS!`);
          } else {
            setKsMsg('Bạn đã nhận thưởng Xu KS Quán Sushi hôm nay rồi.');
          }
        })
        .catch(() => undefined);
    }
  };

  const startGame = () => {
    recordMeaningfulStudyAction('sushi_start');
    const { pool, broadened } = selectGameDeck(words, level);
    deckRef.current = pool;
    setBroadenedNotice(broadened);

    const firstOrder = pickNextOrder(pool);
    orderRef.current = firstOrder;
    setOrderWord(firstOrder);
    resetOrderTimer(getOrderLimitSec(speed));

    const initPlates = makeInitialPlates(pool, firstOrder, beltWidthRef.current);
    platesRef.current = initPlates;
    setPlates(initPlates);

    scoreRef.current = 0;
    comboRef.current = 0;
    heartsRef.current = 3;
    setScore(0);
    setCombo(0);
    setHearts(3);
    setTimeLeft(90);
    setServedCount(0);
    setSpeedBonusCount(0);
    setMissedWords([]);
    setKsMsg(null);
    setFeedback('Phục vụ nhanh! Chạm đúng đĩa khớp nghĩa khách đang gọi.');
    phaseRef.current = 'playing';
    setPhase('playing');
  };

  // True 60fps requestAnimationFrame loop: belt movement + slat scroll + per-order patience timer
  useEffect(() => {
    if (phase !== 'playing') return;
    if (typeof requestAnimationFrame === 'undefined') return;

    const limitMs = getOrderLimitSec(speedRef.current) * 1000;
    const basePxPerSec = getBaseSpeedPx(speedRef.current);
    let lastTs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let lastHudUpdateTs = 0;

    const tick = (now: number) => {
      if (phaseRef.current !== 'playing') return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const curOrder = orderRef.current;
      const pool = deckRef.current;
      if (!curOrder || pool.length === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const bw = Math.max(320, beltWidthRef.current);
      const scale = Math.max(0.65, bw / 760);
      const speedPx = basePxPerSec * scale;

      // Scroll background conveyor slats cleanly
      beltOffsetRef.current = (beltOffsetRef.current + speedPx * dt) % 48;
      beltSlatAnim.setValue(-beltOffsetRef.current);

      // Update plate positions smoothly via Animated.Value (ZERO React re-render per frame)
      let structuralChange = false;
      const exited: SushiPlate[] = [];
      const remaining: SushiPlate[] = [];

      for (const p of platesRef.current) {
        p.xPx -= speedPx * dt;
        p.animX.setValue(p.xPx);
        if (p.xPx < -170) {
          exited.push(p);
          structuralChange = true;
        } else {
          remaining.push(p);
        }
      }

      // Check per-order reflex timer OR target slipping off belt
      const orderElapsed = now - orderStartTsRef.current;
      const orderRatio = Math.max(0, Math.min(1, 1 - orderElapsed / limitMs));
      orderRatioRef.current = orderRatio;
      orderTimerAnim.setValue(orderRatio);

      if (now - lastHudUpdateTs >= 90 || orderRatio === 0) {
        lastHudUpdateTs = now;
        setOrderTimeRatio(orderRatio);
        setOrderTimeLeftSec(Math.max(0, Number(((limitMs - orderElapsed) / 1000).toFixed(1))));
      }

      const targetExited = exited.some((p) => p.word.id === curOrder.id);
      const targetStillOnBelt = remaining.some((p) => p.word.id === curOrder.id);
      const orderTimedOut = orderRatio <= 0;

      if (orderTimedOut || (targetExited && !targetStillOnBelt)) {
        const nextHearts = Math.max(0, heartsRef.current - 1);
        heartsRef.current = nextHearts;
        comboRef.current = 0;
        setHearts(nextHearts);
        setCombo(0);
        triggerOrderShake();
        triggerFloatPopup(orderTimedOut ? '-1 ❤️ HẾT GIỜ!' : '-1 ❤️ TRÔI MẤT!', 'miss');
        setMissedWords((prev) =>
          prev.some((m) => m.id === curOrder.id) ? prev : [...prev, curOrder],
        );
        setFeedback(
          orderTimedOut
            ? `Khách hết kiên nhẫn cho món "${curOrder.word}" (${curOrder.meaning})! -1 tim`
            : `Đĩa "${curOrder.word}" (${curOrder.meaning}) trôi mất rồi! -1 tim`,
        );

        if (nextHearts <= 0) {
          platesRef.current = remaining;
          setPlates(remaining);
          finishGame(scoreRef.current);
          return;
        }

        const nextOrd = pickNextOrder(pool, curOrder.id);
        orderRef.current = nextOrd;
        setOrderWord(nextOrd);
        resetOrderTimer(limitMs / 1000);
      }

      // Ensure 4–5 plates on belt and ensure active order dish is always reachable
      const activeOrder = orderRef.current!;
      const hasActivePlateOnScreen = remaining.some(
        (p) => p.word.id === activeOrder.id && p.xPx > 20,
      );

      if (remaining.length < 5) {
        const lane0MaxX = remaining
          .filter((p) => p.lane === 0)
          .reduce((m, p) => Math.max(m, p.xPx), 0);
        const lane1MaxX = remaining
          .filter((p) => p.lane === 1)
          .reduce((m, p) => Math.max(m, p.xPx), 0);

        const lane: 0 | 1 = lane0MaxX <= lane1MaxX ? 0 : 1;
        const maxLaneX = lane === 0 ? lane0MaxX : lane1MaxX;

        if (maxLaneX < bw - MIN_PLATE_GAP_PX || !hasActivePlateOnScreen) {
          const spawnX = Math.max(bw + 10, maxLaneX + MIN_PLATE_GAP_PX);
          // Avoid exceeding too far off-screen when spawning fillers
          if (spawnX <= bw + 260) {
            const wordToSpawn = !hasActivePlateOnScreen
              ? activeOrder
              : pool[Math.floor(Math.random() * pool.length)]!;
            remaining.push({
              uid: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              word: wordToSpawn,
              lane,
              xPx: spawnX,
              animX: new Animated.Value(spawnX),
              accent: PLATE_COLORS[Math.floor(Math.random() * PLATE_COLORS.length)]!,
            });
            structuralChange = true;
          }
        }
      }

      platesRef.current = remaining;
      if (structuralChange) {
        setPlates([...remaining]);
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
  }, [phase]);

  // 90s shift countdown
  useEffect(() => {
    if (phase !== 'playing') return;
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
    if (phase === 'playing' && timeLeft === 0) {
      finishGame(scoreRef.current);
    }
  }, [phase, timeLeft]);

  const handleTapPlate = (plate: SushiPlate) => {
    if (phaseRef.current !== 'playing' || !orderRef.current) return;
    recordMeaningfulStudyAction('sushi_serve');
    const curOrder = orderRef.current;

    const remaining = platesRef.current.filter((p) => p.uid !== plate.uid);

    if (plate.word.id === curOrder.id) {
      void speakJapanese(plate.word.reading || plate.word.word);
      const nextCombo = comboRef.current + 1;
      const fever = nextCombo >= 3;
      const isFast = orderRatioRef.current >= 0.55;
      const pts = (fever ? 20 : 10) + (isFast ? 5 : 0);
      const nextScore = scoreRef.current + pts;
      comboRef.current = nextCombo;
      scoreRef.current = nextScore;
      setCombo(nextCombo);
      setScore(nextScore);
      setServedCount((c) => c + 1);
      if (isFast) setSpeedBonusCount((s) => s + 1);

      triggerFloatPopup(
        fever
          ? `+${pts} FEVER!${isFast ? ' ⚡' : ''}`
          : isFast
            ? `+${pts} SIÊU TỐC!`
            : `+${pts}đ`,
        fever ? 'fever' : isFast ? 'speed' : 'good',
      );
      setFeedback(
        `${fever ? 'FEVER ×2! ' : ''}${isFast ? '⚡ Siêu tốc! ' : ''}Phục vụ chuẩn "${plate.word.word}" (+${pts}đ)`,
      );

      const nextOrd = pickNextOrder(deckRef.current, curOrder.id);
      orderRef.current = nextOrd;
      setOrderWord(nextOrd);
      resetOrderTimer(getOrderLimitSec(speedRef.current));

      // Ensure new order immediately exists on belt if not already present
      const hasNextOrd = remaining.some((p) => p.word.id === nextOrd.id && p.xPx > 40);
      if (!hasNextOrd) {
        const bw = Math.max(320, beltWidthRef.current);
        const lane0Max = remaining.filter((p) => p.lane === 0).reduce((m, p) => Math.max(m, p.xPx), 0);
        const lane1Max = remaining.filter((p) => p.lane === 1).reduce((m, p) => Math.max(m, p.xPx), 0);
        const lane: 0 | 1 = lane0Max <= lane1Max ? 0 : 1;
        const spawnX = Math.max(bw - 10, (lane === 0 ? lane0Max : lane1Max) + MIN_PLATE_GAP_PX);
        remaining.push({
          uid: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          word: nextOrd,
          lane,
          xPx: spawnX,
          animX: new Animated.Value(spawnX),
          accent: PLATE_COLORS[Math.floor(Math.random() * PLATE_COLORS.length)]!,
        });
      }

      platesRef.current = remaining;
      setPlates([...remaining]);
    } else {
      platesRef.current = remaining;
      setPlates([...remaining]);

      const nextHearts = Math.max(0, heartsRef.current - 1);
      heartsRef.current = nextHearts;
      comboRef.current = 0;
      setHearts(nextHearts);
      setCombo(0);
      triggerOrderShake();
      triggerFloatPopup('-1 ❤️ NHẦM MÓN!', 'miss');
      setMissedWords((prev) =>
        prev.some((m) => m.id === curOrder.id) ? prev : [...prev, curOrder],
      );
      setFeedback(`Nhầm món "${plate.word.word}" (${plate.word.meaning})! Khách gọi "${curOrder.meaning}". -1 tim`);
      if (nextHearts <= 0) {
        finishGame(scoreRef.current);
      }
    }
  };

  const timerColor = orderTimeRatio > 0.5 ? '#1B873F' : orderTimeRatio > 0.25 ? '#D97706' : '#DC2626';
  const orderTimerWidth = orderTimerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const isFever = combo >= 3;

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Quán Sushi Băng Chuyền"
        subtitle={`Nhận diện nhanh Kanji từ kho SRS (${words.length} từ) · Kỷ lục: ${bestScore}đ`}
        rightSlot={
          <View style={styles.headerBadge}>
            <SushiPlateIcon size={15} color="#0D9488" />
            <Text style={styles.headerBadgeText}>{orderLimitSec}s/đơn</Text>
          </View>
        }
      />

      {phase === 'setup' ? (
        <View style={styles.card}>
          <Text style={styles.label}>Trình độ từ vựng</Text>
          <View style={styles.row}>
            {(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'] as const).map((lv) => (
              <Pressable
                key={lv}
                style={[styles.chip, level === lv && styles.chipActive]}
                onPress={() => setLevel(lv)}
              >
                <Text style={[styles.chipText, level === lv && styles.chipTextActive]}>
                  {lv === 'ALL' ? 'Tất cả' : lv}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Tốc độ băng chuyền &amp; Thời gian mỗi đơn</Text>
          <View style={styles.row}>
            {(
              [
                ['Chậm', '14s/đơn'],
                ['Vừa', '10s/đơn'],
                ['Nhanh', '7.5s/đơn'],
              ] as const
            ).map(([sp, limitText]) => (
              <Pressable
                key={sp}
                style={[styles.chip, speed === sp && styles.chipActive]}
                onPress={() => setSpeed(sp)}
              >
                <Text style={[styles.chipText, speed === sp && styles.chipTextActive]}>
                  {sp} ({limitText})
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Hiện cách đọc Kana phụ dưới chữ Kanji</Text>
            <Switch
              value={showKana}
              onValueChange={setShowKana}
              trackColor={{ false: '#E5DDD4', true: '#0D9488' }}
            />
          </View>

          <View style={styles.rulesCard}>
            <Text style={styles.rulesText}>
              • Băng chuyền chạy mượt 60fps: chạm đúng đĩa mang chữ Nhật khớp với nghĩa khách gọi trước khi hết giờ hoặc đĩa trôi mất.
            </Text>
            <Text style={styles.rulesText}>
              • Phục vụ trong 45% thời gian đầu nhận thưởng ⚡ SIÊU TỐC (+5đ). Giữ chuỗi 3 đĩa kích hoạt FEVER ×2 điểm!
            </Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={startGame}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Đang mở quán...' : 'Mở cửa Quán Sushi'}
            </Text>
          </Pressable>
        </View>
      ) : phase === 'playing' && orderWord ? (
        <View style={styles.sectionGap}>
          {broadenedNotice ? (
            <Text style={styles.broadNotice}>
              Chưa đủ từ cấp {level}, đã mở rộng toàn bộ kho từ để đĩa chạy đa dạng hơn.
            </Text>
          ) : null}

          {/* HUD & Customer Order with shake, floating score, and patience timer */}
          <Animated.View
            style={[
              styles.card,
              isFever && styles.cardFever,
              { transform: [{ translateX: orderShakeAnim }] },
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floatPopup,
                floatTone === 'fever' && styles.floatFever,
                floatTone === 'speed' && styles.floatSpeed,
                floatTone === 'miss' && styles.floatMiss,
                { opacity: floatOpacity, transform: [{ translateY: floatY }] },
              ]}
            >
              <Text style={styles.floatPopupText}>{floatText}</Text>
            </Animated.View>

            <View style={styles.hudRow}>
              <View style={styles.hudClockGroup}>
                <ClockIcon size={15} color={nihongoTheme.colors.textPrimary} />
                <Text style={styles.hudStat}>{timeLeft}s</Text>
              </View>
              <View style={styles.heartsRow}>
                {[0, 1, 2].map((i) => (
                  <HeartIcon
                    key={i}
                    size={16}
                    color={i < hearts ? '#DC2626' : '#D6CCC2'}
                    filled={i < hearts}
                  />
                ))}
              </View>
              <Text style={styles.hudStat}>Điểm: {score}</Text>
              {isFever ? (
                <Animated.View style={[styles.feverPill, { transform: [{ scale: feverPulseAnim }] }]}>
                  <Text style={styles.feverText}>FEVER ×2 ({combo})</Text>
                </Animated.View>
              ) : combo >= 2 ? (
                <View style={styles.comboPill}>
                  <Text style={styles.comboText}>Chuỗi {combo}/3</Text>
                </View>
              ) : null}
              <Pressable onPress={() => finishGame(scoreRef.current)}>
                <Text style={styles.stopText}>Dừng</Text>
              </Pressable>
            </View>

            <View style={styles.orderBubble}>
              <MomoAvatar size={48} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.orderHeaderRow}>
                  <Text style={styles.orderEyebrow}>KHÁCH HÀNG MOMO GỌI MÓN:</Text>
                  <View style={styles.orderTimerTextWrap}>
                    <LightningBoltIcon size={12} color={timerColor} />
                    <Text style={[styles.orderTimerText, { color: timerColor }]}>
                      {orderTimeLeftSec.toFixed(1)}s
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderMeaning}>{orderWord.meaning}</Text>
                {orderWord.sinoVietnamese ? (
                  <Text style={styles.orderHint}>Âm Hán Việt: {orderWord.sinoVietnamese}</Text>
                ) : null}
                <View style={styles.orderTimerTrack}>
                  <Animated.View
                    style={[
                      styles.orderTimerFill,
                      { width: orderTimerWidth, backgroundColor: timerColor },
                    ]}
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* True 60fps Two-Lane Conveyor Belt */}
          <View
            style={[styles.beltShell, isFever && styles.beltShellFever]}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 120) beltWidthRef.current = w;
            }}
          >
            {([0, 1] as const).map((laneIdx) => (
              <View key={laneIdx} style={styles.laneTrack}>
                <View style={styles.beltLine}>
                  <Animated.View
                    style={[
                      styles.slatTrack,
                      { transform: [{ translateX: beltSlatAnim }] },
                    ]}
                  >
                    {Array.from({ length: 30 }).map((_, sIdx) => (
                      <View key={sIdx} style={styles.beltSlat} />
                    ))}
                  </Animated.View>
                </View>
                {plates
                  .filter((p) => p.lane === laneIdx)
                  .map((p) => (
                    <Animated.View
                      key={p.uid}
                      style={[
                        styles.plateAnchor,
                        { transform: [{ translateX: p.animX }] },
                      ]}
                    >
                      <Pressable
                        style={({ pressed }) => [
                          styles.plateOuter,
                          { borderColor: p.accent },
                          pressed && styles.platePressed,
                        ]}
                        onPress={() => handleTapPlate(p)}
                      >
                        <View style={styles.plateInnerRing}>
                          <Text style={styles.plateWord} numberOfLines={1}>
                            {p.word.word}
                          </Text>
                          {showKana && p.word.reading && p.word.reading !== p.word.word ? (
                            <Text style={styles.plateReading} numberOfLines={1}>
                              {p.word.reading}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    </Animated.View>
                  ))}
              </View>
            ))}
          </View>

          <Text style={styles.feedbackBar}>{feedback}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Hết ca phục vụ! Tổng điểm: {score}</Text>
          <Text style={styles.summarySub}>
            Phục vụ chuẩn {servedCount} đĩa ({speedBonusCount} lần Siêu tốc ⚡) · Kỷ lục: {bestScore}đ
          </Text>

          {ksMsg ? (
            <View style={styles.ksBanner}>
              <CoinKsIcon size={15} color={nihongoTheme.colors.accentHover} />
              <Text style={styles.ksBannerText}>{ksMsg}</Text>
            </View>
          ) : null}

          {missedWords.length > 0 ? (
            <View style={styles.missedBox}>
              <Text style={styles.label}>Từ vừa bỏ lỡ / phục vụ nhầm ({missedWords.length})</Text>
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
            <Text style={styles.rulesText}>Hoàn hảo! Không để khách chờ trượt món nào.</Text>
          )}

          <View style={styles.row}>
            <Pressable style={styles.outlineBtn} onPress={() => setPhase('setup')}>
              <Text style={styles.outlineBtnText}>Chỉnh tốc độ</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={startGame}>
              <Text style={styles.primaryBtnText}>Mở ca mới</Text>
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
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
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
  cardFever: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
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
    backgroundColor: '#0D9488',
  },
  chipText: {
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
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
    backgroundColor: '#0D9488',
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
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.warningText,
    backgroundColor: nihongoTheme.colors.warningBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  floatPopup: {
    position: 'absolute',
    right: 18,
    top: 10,
    zIndex: 20,
    backgroundColor: '#0D9488',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  floatFever: {
    backgroundColor: '#D97706',
  },
  floatSpeed: {
    backgroundColor: '#4F46E5',
  },
  floatMiss: {
    backgroundColor: '#DC2626',
  },
  floatPopupText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  hudClockGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hudStat: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  feverPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  feverText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
  },
  comboPill: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  comboText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0D9488',
  },
  stopText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  orderBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
    padding: 13,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: nihongoTheme.colors.accentHover,
  },
  orderTimerTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  orderTimerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  orderMeaning: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  orderHint: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '600',
  },
  orderTimerTrack: {
    height: 6,
    backgroundColor: '#FDEBD6',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 3,
  },
  orderTimerFill: {
    height: '100%',
    borderRadius: 4,
  },
  beltShell: {
    backgroundColor: '#F3EAE0',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#D6C2AE',
    paddingVertical: 16,
    gap: 16,
    overflow: 'hidden',
  },
  beltShellFever: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFF7ED',
  },
  laneTrack: {
    height: 86,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  beltLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#E4D4C3',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#CBB69F',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  slatTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 1440,
    height: '100%',
  },
  beltSlat: {
    width: 48,
    height: '100%',
    borderRightWidth: 2,
    borderRightColor: 'rgba(160, 130, 100, 0.28)',
  },
  plateAnchor: {
    position: 'absolute',
    left: 0,
    top: 7,
  },
  plateOuter: {
    minWidth: 118,
    maxWidth: 174,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    backgroundColor: '#FFFFFF',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...nihongoTheme.shadow.card,
  },
  platePressed: {
    transform: [{ scale: 0.92 }],
  },
  plateInnerRing: {
    borderRadius: 30,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#EFE6DC',
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 102,
    height: '100%',
  },
  plateWord: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  plateReading: {
    fontSize: 11,
    fontWeight: '600',
    color: nihongoTheme.colors.accentHover,
  },
  feedbackBar: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  summarySub: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
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
});
