import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VocabularyDto } from '../../../packages/contracts/src/study';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { MomoAvatar } from '../../src/components/MomoAvatar';
import { CoinKsIcon, VolumeIcon } from '../../src/components/AppIcons';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { getUserScopedKey } from '../../src/features/auth/auth-store';
import { selectGameDeck, shuffleItems, useGameVocabulary } from '../../src/features/games/use-game-vocab';
import { claimDailyGameReward } from '../../src/features/membership/membership-store';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';
import { speakJapanese } from '../../src/utils/speak-japanese';

type BeltSpeed = 'Chậm' | 'Vừa' | 'Nhanh';

interface SushiPlate {
  uid: string;
  word: VocabularyDto;
  lane: 0 | 1;
  xPct: number;
  accent: string;
}

const SUSHI_BEST_KEY = 'kanji_smart_sushi_best_v1';
const PLATE_COLORS = ['#F97316', '#E11D48', '#0D9488', '#D97706'];

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
  const [orderWord, setOrderWord] = useState<VocabularyDto | null>(null);
  const [plates, setPlates] = useState<SushiPlate[]>([]);
  const [feedback, setFeedback] = useState<string>('Chạm đúng đĩa Sushi mang chữ Nhật khớp nghĩa khách gọi!');
  const [missedWords, setMissedWords] = useState<VocabularyDto[]>([]);
  const [ksMsg, setKsMsg] = useState<string | null>(null);

  const deckRef = useRef<VocabularyDto[]>([]);
  const orderRef = useRef<VocabularyDto | null>(null);
  const platesRef = useRef<SushiPlate[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const heartsRef = useRef(3);
  const phaseRef = useRef<'setup' | 'playing' | 'summary'>('setup');
  const speedRef = useRef<BeltSpeed>(speed);

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
  }, []);

  const pickNextOrder = (pool: readonly VocabularyDto[], avoidId?: string): VocabularyDto => {
    const candidates = pool.filter((w) => w.id !== avoidId);
    const source = candidates.length > 0 ? candidates : pool;
    return source[Math.floor(Math.random() * source.length)]!;
  };

  const makeInitialPlates = (pool: readonly VocabularyDto[], target: VocabularyDto): SushiPlate[] => {
    const distractors = shuffleItems(pool.filter((w) => w.id !== target.id)).slice(0, 3);
    const selected = shuffleItems([target, ...distractors]);
    return selected.map((w, i) => ({
      uid: `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      word: w,
      lane: (i % 2) as 0 | 1,
      xPct: 26 + i * 23,
      accent: PLATE_COLORS[i % PLATE_COLORS.length]!,
    }));
  };

  const finishGame = (finalScore: number) => {
    if (phaseRef.current === 'summary') return;
    phaseRef.current = 'summary';
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

    const initPlates = makeInitialPlates(pool, firstOrder);
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
    setMissedWords([]);
    setKsMsg(null);
    setFeedback('Phục vụ ngay! Chạm đúng đĩa khớp nghĩa khách đang gọi.');
    phaseRef.current = 'playing';
    setPhase('playing');
  };

  // Smooth belt tick + spawn + missed-order check
  useEffect(() => {
    if (phase !== 'playing') return;
    const stepPerTick = speedRef.current === 'Chậm' ? 0.48 : speedRef.current === 'Nhanh' ? 1.05 : 0.72;

    const beltTimer = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      const curOrder = orderRef.current;
      const pool = deckRef.current;
      if (!curOrder || pool.length === 0) return;

      const moved = platesRef.current.map((p) => ({ ...p, xPct: p.xPct - stepPerTick }));
      const exited = moved.filter((p) => p.xPct < -16);
      const remaining = moved.filter((p) => p.xPct >= -16);

      // Check if customer's ordered dish slipped off the belt completely
      const targetExited = exited.some((p) => p.word.id === curOrder.id);
      const targetStillOnBelt = remaining.some((p) => p.word.id === curOrder.id);

      if (targetExited && !targetStillOnBelt) {
        const nextHearts = Math.max(0, heartsRef.current - 1);
        heartsRef.current = nextHearts;
        comboRef.current = 0;
        setHearts(nextHearts);
        setCombo(0);
        setMissedWords((prev) =>
          prev.some((m) => m.id === curOrder.id) ? prev : [...prev, curOrder],
        );
        setFeedback(`Đĩa "${curOrder.word}" (${curOrder.meaning}) trôi mất rồi! -1 tim`);

        if (nextHearts <= 0) {
          finishGame(scoreRef.current);
          return;
        }

        const nextOrd = pickNextOrder(pool, curOrder.id);
        orderRef.current = nextOrd;
        setOrderWord(nextOrd);
      }

      // Ensure 4–5 plates on belt and at least one plate matches current active order
      const activeOrder = orderRef.current!;
      const hasOrderPlate = remaining.some((p) => p.word.id === activeOrder.id);
      const lane0MaxX = remaining
        .filter((p) => p.lane === 0)
        .reduce((m, p) => Math.max(m, p.xPct), 0);
      const lane1MaxX = remaining
        .filter((p) => p.lane === 1)
        .reduce((m, p) => Math.max(m, p.xPct), 0);

      if (remaining.length < 5) {
        const lane: 0 | 1 = lane0MaxX <= lane1MaxX ? 0 : 1;
        const maxLaneX = lane === 0 ? lane0MaxX : lane1MaxX;
        if (maxLaneX < 76) {
          const wordToSpawn = !hasOrderPlate
            ? activeOrder
            : pool[Math.floor(Math.random() * pool.length)]!;
          remaining.push({
            uid: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            word: wordToSpawn,
            lane,
            xPct: Math.max(96, maxLaneX + 34),
            accent: PLATE_COLORS[Math.floor(Math.random() * PLATE_COLORS.length)]!,
          });
        }
      }

      platesRef.current = remaining;
      setPlates(remaining);
    }, 60);

    return () => clearInterval(beltTimer);
  }, [phase]);

  // 90s countdown
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
    if (phase !== 'playing' || !orderRef.current) return;
    recordMeaningfulStudyAction('sushi_serve');
    const curOrder = orderRef.current;

    const remaining = platesRef.current.filter((p) => p.uid !== plate.uid);
    platesRef.current = remaining;
    setPlates(remaining);

    if (plate.word.id === curOrder.id) {
      void speakJapanese(plate.word.reading || plate.word.word);
      const nextCombo = comboRef.current + 1;
      const fever = nextCombo >= 3;
      const pts = fever ? 20 : 10;
      const nextScore = scoreRef.current + pts;
      comboRef.current = nextCombo;
      scoreRef.current = nextScore;
      setCombo(nextCombo);
      setScore(nextScore);
      setServedCount((c) => c + 1);
      setFeedback(
        fever
          ? `🔥 FEVER ×2! Phục vụ chuẩn "${plate.word.word}" (+${pts}đ)`
          : `🍣 Ngon chuẩn! Phục vụ "${plate.word.word}" (+${pts}đ)`,
      );

      const nextOrd = pickNextOrder(deckRef.current, curOrder.id);
      orderRef.current = nextOrd;
      setOrderWord(nextOrd);
    } else {
      const nextHearts = Math.max(0, heartsRef.current - 1);
      heartsRef.current = nextHearts;
      comboRef.current = 0;
      setHearts(nextHearts);
      setCombo(0);
      setMissedWords((prev) =>
        prev.some((m) => m.id === curOrder.id) ? prev : [...prev, curOrder],
      );
      setFeedback(`Nhầm món "${plate.word.word}" (${plate.word.meaning})! Khách gọi "${curOrder.meaning}". -1 tim`);
      if (nextHearts <= 0) {
        finishGame(scoreRef.current);
      }
    }
  };

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Quán Sushi Băng Chuyền"
        subtitle={`Nhận diện nhanh mặt chữ Kanji từ kho SRS (${words.length} từ) · Kỷ lục: ${bestScore}đ`}
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

          <Text style={styles.label}>Tốc độ băng chuyền</Text>
          <View style={styles.row}>
            {(['Chậm', 'Vừa', 'Nhanh'] as const).map((sp) => (
              <Pressable
                key={sp}
                style={[styles.chip, speed === sp && styles.chipActive]}
                onPress={() => setSpeed(sp)}
              >
                <Text style={[styles.chipText, speed === sp && styles.chipTextActive]}>{sp}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Hiện cách đọc Kana phụ dưới chữ Kanji</Text>
            <Switch
              value={showKana}
              onValueChange={setShowKana}
              trackColor={{ false: '#E5DDD4', true: nihongoTheme.colors.accent }}
            />
          </View>

          <Text style={styles.rules}>
            🍣 Nhìn nghĩa khách gọi → Chạm đúng đĩa Sushi mang chữ Nhật đang chạy trên băng chuyền.{'\n'}
            🔥 Giữ chuỗi 3 đĩa đúng liên tiếp kích hoạt giờ cao điểm FEVER ×2 điểm! Đạt từ 30đ nhận Xu KS mỗi ngày.
          </Text>

          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={startGame}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Đang mở quán...' : 'Mở cửa Quán Sushi 🍣'}
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

          {/* HUD & Customer Order */}
          <View style={styles.card}>
            <View style={styles.hudRow}>
              <Text style={styles.hudStat}>⏱️ {timeLeft}s</Text>
              <Text style={styles.hudStat}>{'❤️'.repeat(Math.max(0, hearts)) || '💔'}</Text>
              <Text style={styles.hudStat}>Điểm: {score}</Text>
              {combo >= 3 ? (
                <View style={styles.feverPill}>
                  <Text style={styles.feverText}>🔥 FEVER ×2 ({combo})</Text>
                </View>
              ) : null}
              <Pressable onPress={() => finishGame(scoreRef.current)}>
                <Text style={styles.stopText}>Dừng</Text>
              </Pressable>
            </View>

            <View style={styles.orderBubble}>
              <MomoAvatar size={46} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.orderEyebrow}>KHÁCH HÀNG MOMO ĐANG GỌI MÓN:</Text>
                <Text style={styles.orderMeaning}>{orderWord.meaning}</Text>
                {orderWord.sinoVietnamese ? (
                  <Text style={styles.orderHint}>Âm Hán Việt: {orderWord.sinoVietnamese}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Two Conveyor Lanes */}
          <View style={styles.beltShell}>
            {([0, 1] as const).map((laneIdx) => (
              <View key={laneIdx} style={styles.laneTrack}>
                <View style={styles.beltLine} />
                {plates
                  .filter((p) => p.lane === laneIdx)
                  .map((p) => (
                    <Pressable
                      key={p.uid}
                      style={[
                        styles.plateOuter,
                        { left: `${p.xPct}%`, borderColor: p.accent },
                      ]}
                      onPress={() => handleTapPlate(p)}
                    >
                      <Text style={styles.plateWord} numberOfLines={1}>
                        {p.word.word}
                      </Text>
                      {showKana && p.word.reading && p.word.reading !== p.word.word ? (
                        <Text style={styles.plateReading} numberOfLines={1}>
                          {p.word.reading}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
              </View>
            ))}
          </View>

          <Text style={styles.feedbackBar}>{feedback}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>🍣 Hết ca! Tổng điểm: {score}</Text>
          <Text style={styles.summarySub}>
            Đã phục vụ chuẩn {servedCount} đĩa · Kỷ lục cá nhân: {bestScore}đ
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
            <Text style={styles.rules}>Hoàn hảo! Không để khách chờ trượt món nào.</Text>
          )}

          <View style={styles.row}>
            <Pressable style={styles.outlineBtn} onPress={() => setPhase('setup')}>
              <Text style={styles.outlineBtnText}>Chỉnh tốc độ</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={startGame}>
              <Text style={styles.primaryBtnText}>Mở ca mới 🍣</Text>
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
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
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
    backgroundColor: nihongoTheme.colors.accent,
  },
  chipText: {
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
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
  rules: {
    fontSize: 13,
    lineHeight: 20,
    color: nihongoTheme.colors.textSecondary,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
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
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  hudStat: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  feverPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  feverText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
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
    padding: 12,
  },
  orderEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: nihongoTheme.colors.accentHover,
  },
  orderMeaning: {
    fontSize: 19,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  orderHint: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '600',
  },
  beltShell: {
    backgroundColor: '#F5EDE4',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D8C5B2',
    paddingVertical: 14,
    gap: 14,
    overflow: 'hidden',
  },
  laneTrack: {
    height: 82,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  beltLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: '#E5D8C9',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#CDBAA6',
  },
  plateOuter: {
    position: 'absolute',
    minWidth: 108,
    maxWidth: 165,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...nihongoTheme.shadow.card,
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
});
