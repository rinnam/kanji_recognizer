import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VocabularyDto } from '../../../packages/contracts/src/study';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { CoinKsIcon, VolumeIcon } from '../../src/components/AppIcons';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { getUserScopedKey } from '../../src/features/auth/auth-store';
import { selectGameDeck, shuffleItems, useGameVocabulary } from '../../src/features/games/use-game-vocab';
import { claimDailyGameReward } from '../../src/features/membership/membership-store';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';
import { speakJapanese } from '../../src/utils/speak-japanese';

type Difficulty = 'Dễ' | 'Vừa' | 'Khó';
type QuestionKind = 'kanji_to_vi' | 'audio_to_word' | 'vi_to_word';

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

const BOSS_NAMES = [
  'Tanuki Gác Cổng',
  'Tướng Oni Kanji',
  'Đại Ma Vương Ngữ Nghĩa',
];

function buildBossQuestion(deck: readonly VocabularyDto[], idx: number): BossQuestion {
  const target = deck[idx % deck.length]!;
  const kinds: QuestionKind[] = ['kanji_to_vi', 'audio_to_word', 'vi_to_word'];
  const kind = kinds[idx % kinds.length]!;
  const distractorsPool = shuffleItems(
    deck.filter((w) => w.id !== target.id && w.meaning !== target.meaning && w.word !== target.word),
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
      promptSub: target.reading && target.reading !== target.word ? target.reading : 'Chọn nghĩa đúng bên dưới',
      options,
      correctOption: target.meaning,
    };
  }

  if (kind === 'audio_to_word') {
    const correctLabel =
      target.reading && target.reading !== target.word
        ? `${target.word} (${target.reading})`
        : target.word;
    const options = shuffleItems([
      correctLabel,
      ...distractorsPool.map((d) =>
        d.reading && d.reading !== d.word ? `${d.word} (${d.reading})` : d.word,
      ),
    ]);
    return {
      kind,
      word: target,
      promptLabel: 'Đòn 2 · Nghe âm thanh → Chọn đúng từ tiếng Nhật',
      promptMain: '🔊 Bấm để nghe lại phát âm',
      promptSub: `Gợi ý nghĩa: ${target.meaning}`,
      options,
      correctOption: correctLabel,
    };
  }

  const correctWord =
    target.reading && target.reading !== target.word
      ? `${target.word} · ${target.reading}`
      : target.word;
  const options = shuffleItems([
    correctWord,
    ...distractorsPool.map((d) =>
      d.reading && d.reading !== d.word ? `${d.word} · ${d.reading}` : d.word,
    ),
  ]);
  return {
    kind,
    word: target,
    promptLabel: 'Đòn 3 · Nhìn nghĩa Việt → Chọn từ / Kana đúng',
    promptMain: target.meaning,
    promptSub: target.sinoVietnamese ? `Hán Việt: ${target.sinoVietnamese}` : 'Chọn từ tiếng Nhật tương ứng',
    options,
    correctOption: correctWord,
  };
}

export default function BotGameScreen() {
  const { words, loading } = useGameVocabulary();
  const [difficulty, setDifficulty] = useState<Difficulty>('Vừa');
  const [level, setLevel] = useState('ALL');
  const [phase, setPhase] = useState<'setup' | 'battle' | 'summary'>('setup');

  const [deck, setDeck] = useState<VocabularyDto[]>([]);
  const [broadenedNotice, setBroadenedNotice] = useState(false);
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
  const [timeLeft, setTimeLeft] = useState(180);

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

  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void getUserScopedKey(MOMO_BOSS_BEST_KEY)
      .then((k) => AsyncStorage.getItem(k))
      .then((raw) => {
        if (raw) {
          const n = Number(raw);
          if (Number.isFinite(n)) setBestScore(n);
        }
      });
    return () => {
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    };
  }, []);

  const initialBossHp = (d: Difficulty, w: number) => {
    const base = d === 'Dễ' ? 75 : d === 'Khó' ? 140 : 100;
    return base + (w - 1) * 25;
  };

  const finishBattle = (won: boolean, finalScore: number) => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
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
          } else {
            setKsMsg('Đã nhận thưởng Xu KS Công thành Momo hôm nay rồi.');
          }
        })
        .catch(() => undefined);
    }
  };

  const startBattle = () => {
    recordMeaningfulStudyAction('momo_boss_start');
    const { pool, broadened } = selectGameDeck(words, level);
    setDeck(pool);
    setBroadenedNotice(broadened);

    const hp1 = initialBossHp(difficulty, 1);
    setWave(1);
    setBossMaxHp(hp1);
    setBossHp(hp1);
    setPlayerHp(100);
    setScore(0);
    setCombo(0);
    setTimeLeft(180);
    setHiddenIndices([]);
    setArrowCooldown(0);
    setShieldActive(false);
    setShieldCooldown(0);
    setPickedOption(null);
    setMissedWords([]);
    setKsMsg(null);
    setBattleLog(`Wave 1: ${BOSS_NAMES[0]} xuất hiện!`);

    const firstQ = buildBossQuestion(pool, 0);
    setQIdx(0);
    setQuestion(firstQ);
    setPhase('battle');
    if (firstQ.kind === 'audio_to_word') {
      void speakJapanese(firstQ.word.reading || firstQ.word.word);
    }
  };

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

  const handleUseArrows = () => {
    if (!question || pickedOption !== null || arrowCooldown > 0 || hiddenIndices.length > 0) return;
    recordMeaningfulStudyAction('momo_boss_arrow');
    const wrongIndices = question.options
      .map((opt, idx) => (opt !== question.correctOption ? idx : -1))
      .filter((idx) => idx >= 0);
    const toHide = shuffleItems(wrongIndices).slice(0, 2);
    setHiddenIndices(toHide);
    setArrowCooldown(3);
    setBattleLog('🏹 Mưa tên (Q): Đã loại bỏ 2 đáp án sai!');
  };

  const handleUseShield = () => {
    if (pickedOption !== null || shieldActive || shieldCooldown > 0) return;
    recordMeaningfulStudyAction('momo_boss_shield');
    setShieldActive(true);
    setShieldCooldown(4);
    setBattleLog('🛡️ Khiên Momo (E) đã bật — miễn nhiễm sát thương lượt này!');
  };

  const handleAnswer = (opt: string) => {
    if (phase !== 'battle' || !question || pickedOption !== null) return;
    recordMeaningfulStudyAction('momo_boss_answer');
    setPickedOption(opt);
    const ok = opt === question.correctOption;

    let nextPlayerHp = playerHp;
    let nextBossHp = bossHp;
    let nextWave = wave;
    let nextBossMax = bossMaxHp;
    let nextScore = score;
    let nextCombo = combo;

    if (ok) {
      nextCombo = combo + 1;
      const mult = nextCombo >= 10 ? 2.0 : nextCombo >= 5 ? 1.5 : nextCombo >= 3 ? 1.25 : 1;
      const dmg = Math.round(25 * mult);
      nextScore = score + dmg;
      nextBossHp = Math.max(0, bossHp - dmg);
      setBattleLog(
        `⚔️ Gây ${dmg} sát thương!${nextCombo >= 3 ? ` (Combo ×${nextCombo})` : ''}`,
      );
      if (question.kind !== 'audio_to_word') {
        void speakJapanese(question.word.reading || question.word.word);
      }
    } else {
      nextCombo = 0;
      const incoming = difficulty === 'Dễ' ? 12 : difficulty === 'Khó' ? 24 : 18;
      if (shieldActive) {
        setBattleLog('🛡️ Khiên Momo đã đỡ trọn đòn phản công!');
      } else {
        nextPlayerHp = Math.max(0, playerHp - incoming);
        setBattleLog(`💥 Trả lời sai! Boss phản công -${incoming} HP. Đúng: "${question.correctOption}"`);
      }
      setMissedWords((prev) =>
        prev.some((w) => w.id === question.word.id) ? prev : [...prev, question.word],
      );
    }

    setCombo(nextCombo);
    setScore(nextScore);
    setPlayerHp(nextPlayerHp);
    setBossHp(nextBossHp);
    setShieldActive(false);
    setArrowCooldown((c) => Math.max(0, c - (ok ? 1 : 0)));
    setShieldCooldown((c) => Math.max(0, c - (ok ? 1 : 0)));

    nextTimerRef.current = setTimeout(() => {
      if (nextPlayerHp <= 0) {
        finishBattle(false, nextScore);
        return;
      }
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
        setBattleLog(`🔥 Hạ gục Wave ${nextWave - 1}! ${BOSS_NAMES[nextWave - 1]} tiến lên!`);
      }

      const nextIdx = qIdx + 1;
      const nextQ = buildBossQuestion(deck, nextIdx);
      setQIdx(nextIdx);
      setQuestion(nextQ);
      setPickedOption(null);
      setHiddenIndices([]);
      if (nextQ.kind === 'audio_to_word') {
        void speakJapanese(nextQ.word.reading || nextQ.word.word);
      }
    }, ok ? 750 : 1250);
  };

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

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Công thành Momo"
        subtitle={`Solo Boss Raid từ kho SRS (${words.length} từ) · Kỷ lục: ${bestScore}đ`}
      />

      {phase === 'setup' ? (
        <View style={styles.card}>
          <Text style={styles.label}>Độ khó Boss</Text>
          <View style={styles.row}>
            {(['Dễ', 'Vừa', 'Khó'] as const).map((d) => (
              <Pressable
                key={d}
                style={[styles.chip, difficulty === d && styles.chipActive]}
                onPress={() => {
                  recordMeaningfulStudyAction('game_option');
                  setDifficulty(d);
                }}
              >
                <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>{d}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Trình độ từ vựng</Text>
          <View style={styles.row}>
            {(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'] as const).map((lv) => (
              <Pressable
                key={lv}
                style={[styles.chip, level === lv && styles.chipActive]}
                onPress={() => {
                  recordMeaningfulStudyAction('game_option');
                  setLevel(lv);
                }}
              >
                <Text style={[styles.chipText, level === lv && styles.chipTextActive]}>
                  {lv === 'ALL' ? 'Tất cả' : lv}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.rules}>
            ⚔️ 3 Wave Boss · 3 kiểu phản xạ (Kanji → Nghĩa, Nghe âm thanh → Chọn từ, Nghĩa → Kana){'\n'}
            🛡️ 100 HP · 180 giây · Phím 1–4 trả lời nhanh · Q: Mưa tên (50/50) · E: Khiên Momo
          </Text>

          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={startBattle}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Đang tải kho từ vựng...' : 'Xuất quân công thành ⚔️'}
            </Text>
          </Pressable>
        </View>
      ) : phase === 'battle' && question ? (
        <View style={styles.sectionGap}>
          {broadenedNotice ? (
            <Text style={styles.broadNotice}>
              Chưa đủ từ cấp {level}, đã tự mở rộng sang toàn bộ thư viện của bạn.
            </Text>
          ) : null}

          {/* Battle HUD */}
          <View style={styles.card}>
            <View style={styles.hudTop}>
              <Text style={styles.waveText}>
                Wave {wave}/3 · {bossName}
              </Text>
              <Text style={styles.timerText}>⏱️ {timeLeft}s · {score}đ</Text>
            </View>

            <View style={styles.barsRow}>
              <View style={styles.barCol}>
                <Text style={styles.barLabel}>❤️ HP của bạn: {playerHp}/100</Text>
                <View style={styles.hpTrack}>
                  <View style={[styles.hpPlayerFill, { width: `${playerHp}%` }]} />
                </View>
              </View>
              <View style={styles.barCol}>
                <Text style={styles.barLabel}>👹 HP Boss: {bossHp}/{bossMaxHp}</Text>
                <View style={styles.hpTrack}>
                  <View
                    style={[
                      styles.hpBossFill,
                      { width: `${Math.round((bossHp / Math.max(1, bossMaxHp)) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.skillsRow}>
              <Pressable
                style={[styles.skillBtn, arrowCooldown > 0 && styles.skillBtnCd]}
                disabled={arrowCooldown > 0 || pickedOption !== null}
                onPress={handleUseArrows}
              >
                <Text style={styles.skillBtnText}>
                  🏹 Mưa tên [Q] {arrowCooldown > 0 ? `(${arrowCooldown})` : 'Sẵn sàng'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.skillBtn,
                  shieldActive && styles.skillBtnActive,
                  shieldCooldown > 0 && !shieldActive && styles.skillBtnCd,
                ]}
                disabled={shieldCooldown > 0 || shieldActive || pickedOption !== null}
                onPress={handleUseShield}
              >
                <Text style={styles.skillBtnText}>
                  🛡️ Khiên [E] {shieldActive ? 'Đang bật' : shieldCooldown > 0 ? `(${shieldCooldown})` : 'Sẵn sàng'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.battleLog}>{battleLog}</Text>
          </View>

          {/* Question Card */}
          <View style={styles.card}>
            <View style={styles.hudTop}>
              <Text style={styles.qKindLabel}>{question.promptLabel}</Text>
              {combo >= 2 ? (
                <View style={styles.comboPill}>
                  <Text style={styles.comboText}>🔥 Combo ×{combo}</Text>
                </View>
              ) : null}
            </View>

            {question.kind === 'audio_to_word' ? (
              <Pressable
                style={styles.audioPromptBtn}
                onPress={() => void speakJapanese(question.word.reading || question.word.word)}
              >
                <VolumeIcon size={22} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.audioPromptText}>Nghe phát âm &amp; chọn từ đúng</Text>
              </Pressable>
            ) : (
              <Text style={styles.qMain}>{question.promptMain}</Text>
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
                    style={[
                      styles.optBtn,
                      isHidden && styles.optHidden,
                      showOk && styles.optOk,
                      showBad && styles.optBad,
                    ]}
                    disabled={isHidden || pickedOption !== null}
                    onPress={() => handleAnswer(opt)}
                  >
                    <Text style={styles.optNum}>{idx + 1}</Text>
                    <Text style={styles.optText}>{isHidden ? '— Đã loại bằng Mưa tên —' : opt}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.retreatBtn} onPress={() => finishBattle(false, score)}>
              <Text style={styles.retreatText}>Kết thúc sớm &amp; xem từ sai</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>
            {victory ? '🏆 Toàn thắng 3 Wave Công thành Momo!' : '⚔️ Trận chiến kết thúc'}
          </Text>
          <Text style={styles.summaryScore}>
            Điểm trận này: {score}đ · Kỷ lục cá nhân: {bestScore}đ
          </Text>

          {ksMsg ? (
            <View style={styles.ksBanner}>
              <CoinKsIcon size={15} color={nihongoTheme.colors.accentHover} />
              <Text style={styles.ksBannerText}>{ksMsg}</Text>
            </View>
          ) : null}

          {missedWords.length > 0 ? (
            <View style={styles.missedBox}>
              <Text style={styles.label}>Từ cần ôn lại ({missedWords.length} từ vừa sai)</Text>
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
            <Text style={styles.rules}>Tuyệt vời! Bạn không trả lời sai từ nào trong trận vừa rồi.</Text>
          )}

          <View style={styles.row}>
            <Pressable style={styles.outlineBtn} onPress={() => setPhase('setup')}>
              <Text style={styles.outlineBtnText}>Chọn độ khó</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={startBattle}>
              <Text style={styles.primaryBtnText}>Chơi lại ngay ⚔️</Text>
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
  hudTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  waveText: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  barsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  barCol: {
    flex: 1,
    minWidth: 180,
    gap: 5,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  hpTrack: {
    height: 10,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBtn: {
    flex: 1,
    minWidth: 145,
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
  battleLog: {
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 28,
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
    paddingVertical: 14,
  },
  audioPromptText: {
    fontSize: 14,
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
