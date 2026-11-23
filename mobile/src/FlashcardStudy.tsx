import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import type { SrsRating, VocabularyDto } from '../../packages/contracts/src/study';
import { selectResetTargets } from '../../frontend/src/features/flashcard/model/reset';
import { buildQueue, buildReviewAheadQueue, summarize, previewIntervalLabel, applyScope } from './study-model';
import { CatFrame } from './CatFrame';
import { KanjiWord } from './KanjiWord';
import { useStudyKeys } from './use-study-keys';
import { StudyProgress } from './StudyProgress';
import { Control } from './WorkspaceButton';
import type { StudyActions } from './WorkspaceStudy';
import type { WorkspaceTheme } from './workspace-theme';

type Mode = 'normal' | 'progress' | 'anki';

export function FlashcardStudy({ words, theme, onRate, onReset, onEdit }: StudyActions & {
  words: VocabularyDto[]; theme: WorkspaceTheme;
}) {
  const { colors, styles } = theme;
  const [mode, setMode] = useState<Mode>('normal');
  const [shuffled, setShuffled] = useState(false);
  const [ids, setIds] = useState(() => buildQueue(words, 'normal', new Date()).map(w => w.id));
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const summary = summarize(words, new Date());
  const word = words.find(w => w.id === ids[index]);
  function start(nextMode: Mode, shuffle: boolean, ahead = false) {
    const pool = ahead ? buildReviewAheadQueue(words, new Date()) : buildQueue(words, nextMode, new Date());
    const ordered = shuffle ? applyScope(pool, { mode: 'random', n: pool.length, seed: Date.now() }) : pool;
    setMode(nextMode); setShuffled(shuffle); setIds(ordered.map(w => w.id));
    setIndex(0); setBack(false); setConfirmReset(false); setError('');
  }
  async function rate(rating: SrsRating) {
    if (!word || !onRate || lock.current) return;
    lock.current = true; setSaving(true); setError('');
    try {
      await onRate(word, rating);
      const rest = ids.filter(id => id !== word.id);
      if (rating === 'again') rest.push(word.id);
      setIds(rest); setIndex(Math.min(index, Math.max(0, rest.length - 1))); setBack(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được tiến độ.'); }
    finally { lock.current = false; setSaving(false); }
  }
  const resetTargets = selectResetTargets(words);
  function speak() {
    if (word) Speech.speak(word.word || word.reading || '', { language: 'ja-JP', onError: () => setError('Không phát được âm thanh.') });
  }
  useStudyKeys(({ key, typing, button }) => {
    if (!word || typing || saving || confirmReset) return false;
    if (key === ' ' && !button) setBack(!back);
    else if (key === 'ArrowRight' || key === 'ArrowLeft') {
      setIndex(Math.min(ids.length - 1, Math.max(0, index + (key === 'ArrowRight' ? 1 : -1)))); setBack(false);
    } else if (key.toLowerCase() === 'r') speak();
    else if (mode === 'anki' && back && /^[1-4]$/.test(key)) void rate((['again','hard','good','easy'] as const)[Number(key)-1]);
    else return false;
    return true;
  });
  return <>
    <View style={styles.actions}>
      {([['normal', 'Bình thường'], ['progress', 'Tiến độ'], ['anki', 'Anki SRS']] as const).map(([id, label]) =>
        <Control key={id} theme={theme} label={label} selected={mode === id} disabled={saving} onPress={() => start(id, false)} />)}
    </View>
    <View style={styles.actions}>
      <Control theme={theme} label="Xáo trộn thẻ" disabled={saving} selected={shuffled} onPress={() => start(mode, !shuffled)} />
      <Control theme={theme} label="Làm lại" disabled={saving} onPress={() => start(mode, shuffled)} />
    </View>
    <StudyProgress theme={theme} label="Tiến độ học" current={word ? index + 1 : 0} total={ids.length} />
    <Text style={styles.muted}>Tổng {summary.total} · Tới hạn {summary.due} · Mới {summary.fresh}</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.field}>{error}</Text>}
    {word ? <>
      <View style={{ borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, opacity: 0.22 }}><CatFrame color={colors.ink} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Lật thẻ" onPress={() => setBack(!back)} disabled={saving}
          style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 8 }}>
          <Text style={styles.muted}>BẤM ĐỂ LẬT</Text>
          {back && !!word.reading && <Text style={styles.field}>{word.reading}</Text>}
          {back ? <Text style={[styles.title, { fontSize: 25, textAlign: 'center' }]}>{word.meaning}</Text> :
            <KanjiWord key={word.id} word={word} theme={theme} />}
          {!back && !!word.sinoVietnamese && <Text style={styles.muted}>{word.sinoVietnamese}</Text>}
          {back && !!word.example && <><Text style={styles.muted}>VÍ DỤ</Text><Text style={styles.field}>{word.example}</Text>
            {!!word.exampleMeaning && <Text style={styles.muted}>{word.exampleMeaning}</Text>}</>}
        </Pressable>
        <View style={[styles.actions, { justifyContent: 'center', paddingBottom: 8 }]}>
          <Control theme={theme} label="Nghe phát âm" onPress={speak} />
          {onEdit && <Control theme={theme} label="Sửa thẻ" onPress={() => onEdit(word)} />}
        </View>
      </View>
      {mode === 'anki' ? back ? <View style={styles.actions}>
        {(['again', 'hard', 'good', 'easy'] as const).map((r, i) => <Control key={r} theme={theme}
          accessibleLabel={['Again', 'Hard', 'Good', 'Easy'][i]} disabled={saving || !onRate}
          label={`${['Again', 'Hard', 'Good', 'Easy'][i]} · ${previewIntervalLabel({ interval: word.srsInterval, repetition: word.srsRepetition, easeFactor: word.srsEaseFactor }, r)}`}
          onPress={() => void rate(r)} />)}
      </View> : <Control theme={theme} label="Hiện đáp án" selected onPress={() => setBack(true)} /> :
        <View style={styles.actions}>
          <Control theme={theme} label="Trước" disabled={!index} onPress={() => { setIndex(index - 1); setBack(false); }} />
          <Control theme={theme} selected label="Tiếp theo" disabled={index === ids.length - 1}
            onPress={() => { setIndex(index + 1); setBack(false); }} />
        </View>}
    </> : <>
      <Text style={styles.title}>{mode === 'anki' && words.length ? 'Đã hết thẻ tới hạn' : 'Thư mục này chưa có từ'}</Text>
      {mode === 'anki' && !!words.length && <>
        <Control theme={theme} label="Ôn trước hạn" disabled={!buildReviewAheadQueue(words, new Date()).length} onPress={() => start(mode, shuffled, true)} />
        {confirmReset ? <>
          <Text style={styles.field}>Đặt lại lịch ôn của {resetTargets.length} thẻ trong phạm vi này?</Text>
          <Control theme={theme} label="Xác nhận đặt lại" disabled={saving} onPress={async () => {
            if (!onReset || lock.current) return;
            lock.current = true; setSaving(true);
            try { await onReset(resetTargets); setIds(words.map(w => w.id)); setConfirmReset(false); setIndex(0); }
            catch { setError('Không đặt lại được tiến độ.'); } finally { lock.current = false; setSaving(false); }
          }} /><Control theme={theme} label="Hủy" disabled={saving} onPress={() => setConfirmReset(false)} />
        </> : <Control theme={theme} label="Đặt lại tiến độ SRS" disabled={!resetTargets.length || !onReset} onPress={() => setConfirmReset(true)} />}
      </>}
    </>}
  </>;
}

