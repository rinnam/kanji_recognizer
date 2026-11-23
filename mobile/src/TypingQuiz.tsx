import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useStudyKeys } from './use-study-keys';
import type { QuizSessionDto, VocabularyDto } from '../../packages/contracts/src/study';
import { gradeAnswer } from '../../packages/core/src/grade';
import { applyAnswer, applyHint, buildQuestions, initialAttemptState, orderQuestions, remainingAttempts, type QuizMode } from './study-model';
import type { StudyActions } from './WorkspaceStudy';
import { StudyProgress } from './StudyProgress';
import { Control } from './WorkspaceButton';
import type { WorkspaceTheme } from './workspace-theme';

export type QuizSubmission = {
  mode: 'typing'; startedAt: string; finishedAt: string;
  attempts: { vocabularyId: string; prompt: string; acceptedAnswers: string[]; userAnswer: string | null }[];
};

export function TypingQuiz({ words, theme, onSaveQuiz }: StudyActions & { words: VocabularyDto[]; theme: WorkspaceTheme }) {
  const [mode, setMode] = useState<QuizMode>('random');
  const [shuffle, setShuffle] = useState(true);
  const makeQuestions = (m: QuizMode, s: boolean) => orderQuestions(buildQuestions(words, m), s, Date.now());
  const [questions, setQuestions] = useState(() => makeQuestions('random', true));
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(initialAttemptState);
  const [answer, setAnswer] = useState('');
  const [outcomes, setOutcomes] = useState<ReturnType<typeof initialAttemptState>[]>([]);
  const [seconds, setSeconds] = useState('5');
  const [remaining, setRemaining] = useState(5);
  const [sino, setSino] = useState(false);
  const [startTime, setStartTime] = useState(() => new Date().toISOString());
  const [submission, setSubmission] = useState<QuizSubmission>();
  const [saved, setSaved] = useState<QuizSessionDto>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saveLock = useRef(false);
  const advanceLock = useRef(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const { colors, styles } = theme;
  const current = questions[index];
  const word = words.find(w => w.id === current?.vocabularyId);
  const resolved = attempt.status !== 'answering';
  const wait = Math.max(1, Math.min(10, Number(seconds) || 1));
  function start(m: QuizMode, s: boolean) {
    setMode(m); setShuffle(s); setQuestions(makeQuestions(m, s)); setIndex(0); setOutcomes([]);
    setSino(false); setAnswer(''); setAttempt(initialAttemptState()); setSaved(undefined); setSubmission(undefined);
    setStartTime(new Date().toISOString()); setError(''); advanceLock.current = false;
  }
  async function save(payload: QuizSubmission) {
    if (!onSaveQuiz || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError('');
    try { setSaved(await onSaveQuiz(payload)); }
    catch { setError('Chưa lưu được kết quả lên máy chủ.'); }
    finally { saveLock.current = false; setSaving(false); }
  }
  function advance() {
    if (!resolved || !current || advanceLock.current) return;
    advanceLock.current = true;
    const next = [...outcomes, attempt];
    setOutcomes(next); setIndex(index + 1); setAnswer(''); setAttempt(initialAttemptState()); setSino(false);
    if (index + 1 === questions.length) {
      const payload: QuizSubmission = { mode: 'typing', startedAt: startTime, finishedAt: new Date().toISOString(),
        attempts: questions.map((q, i) => ({ vocabularyId: q.vocabularyId, prompt: q.prompt, acceptedAnswers: q.acceptedAnswers,
          userAnswer: next[i].lastAnswer })) };
      setSubmission(payload); void save(payload);
    }
  }
  const latestAdvance = useRef(advance);
  useEffect(() => { latestAdvance.current = advance; });
  useEffect(() => {
    if (!resolved) return;
    const deadline = Date.now() + wait * 1000;
    setRemaining(wait);
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (!left) { clearInterval(timer); latestAdvance.current(); }
    }, 250);
    return () => clearInterval(timer);
  }, [resolved, index, wait]);
  function submit() {
    if (!current || !answer.trim() || resolved) return;
    advanceLock.current = false;
    const next = applyAnswer(attempt, gradeAnswer(answer, current.acceptedAnswers), answer);
    setAttempt(next);
    if (next.status === 'answering') { setAnswer(''); input.current?.focus(); }
  }
  function hint() { advanceLock.current = false; setAttempt(applyHint(attempt)); }
  useStudyKeys(({ key, typing, button }) => {
    if (!current || button || (typing && !input.current?.isFocused())) return false;
    if (key === 'Enter' && resolved) advance();
    else if (key === 'Enter' && answer.trim()) submit();
    else if (key === 'Tab' && !resolved && input.current?.isFocused()) hint();
    else if (key === 'F2' && word?.sinoVietnamese) setSino(!sino);
    else return false;
    return true;
  });
  return <>
    <View style={styles.actions}>
      {([['random','Ngẫu nhiên'], ['reading','Dạng 1'], ['meaning','Dạng 2']] as const).map(([m,label]) =>
        <Control key={m} theme={theme} label={label} selected={mode === m} disabled={saving} onPress={() => start(m, shuffle)} />)}
    </View>
    <View style={styles.actions}>
      <Control theme={theme} label="Xáo trộn câu" selected={shuffle} disabled={saving} onPress={() => start(mode,!shuffle)} />
      <Control theme={theme} label="Làm lại" disabled={saving} onPress={() => start(mode,shuffle)} />
      <Text style={styles.muted}>Tự chuyển (s)</Text><TextInput accessibilityLabel="Số giây tự chuyển" keyboardType="number-pad"
        value={seconds} onChangeText={v => setSeconds(v.replace(/[^0-9]/g,'').slice(0,2))} onBlur={() => setSeconds(String(wait))}
        style={[styles.input,{width:50}]} />
    </View>
    <StudyProgress label="TIẾN ĐỘ KIỂM TRA" theme={theme} current={Math.min(index + 1, questions.length)} total={questions.length} />
    {current ? <View style={[styles.studyCard, { borderColor: colors.border, borderWidth: 1 }]}>
      <Text style={styles.muted}>{current.type === 'reading' ? 'DẠNG 1 · NHÌN CHỮ, NHẬP CÁCH ĐỌC' : 'DẠNG 2 · NHÌN NGHĨA, DỊCH SANG TIẾNG NHẬT'}</Text>
      <Text style={[styles.title, { fontSize: 30 }]}>{current.prompt}</Text>
      {!!word?.sinoVietnamese && <Control theme={theme} label={sino ? word.sinoVietnamese : 'Âm Hán Việt'} onPress={() => setSino(!sino)} />}
      <TextInput ref={input} accessibilityLabel="Nhập đáp án" placeholder={current.type === 'reading' ? 'Gõ cách đọc bằng Hiragana' : 'Gõ Hiragana hoặc Kanji'}
        placeholderTextColor={colors.muted} editable={!resolved} autoCapitalize="none" autoCorrect={false} value={answer}
        onChangeText={setAnswer} submitBehavior="submit" onSubmitEditing={submit} style={styles.input} />
      {resolved ? <>
        <Text accessibilityLiveRegion="polite" style={styles.title}>{attempt.status === 'correct' ? 'Chính xác' : 'Đáp án'} · {current.acceptedAnswers.join(' / ')}</Text>
        <Text style={styles.field}>{word?.meaning}</Text>
        {!!word?.example && <Text style={styles.muted}>{word.example} {word.exampleMeaning}</Text>}
        <Text style={styles.muted}>Tự chuyển sau {remaining}s</Text>
        <Control theme={theme} selected label={index + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo'} onPress={advance} />
      </> : <>
        {attempt.attempts > 0 && <Text accessibilityLiveRegion="polite" style={styles.field}>Chưa đúng · Còn {remainingAttempts(attempt)} lần</Text>}
        <View style={styles.actions}><Control theme={theme} label="Kiểm tra" selected disabled={!answer.trim()} onPress={submit} />
          <Control theme={theme} label="Gợi ý / xem đáp án" onPress={hint} /></View>
      </>}
    </View> : submission ? <>
      <Text style={styles.title}>Điểm: {saved?.score ?? outcomes.filter(a => a.status === 'correct').length} / {questions.length}</Text>
      <Text style={styles.muted}>{saving ? 'Đang lưu…' : saved ? 'Đã lưu kết quả' : error || 'Kết quả trên thiết bị trong phiên này'}</Text>
      {!saved && !saving && <Control theme={theme} label="Lưu kết quả lên máy chủ" disabled={!onSaveQuiz} onPress={() => void save(submission)} />}
      {questions.map((q,i) => <View key={q.vocabularyId} style={styles.wordCard}>
        <Text style={styles.title}>{q.prompt}</Text>
        <Text style={styles.field}>{outcomes[i].status === 'correct' ? '✓' : '✗'} {outcomes[i].lastAnswer ?? '—'} · {q.acceptedAnswers.join(' / ')}</Text>
      </View>)}
    </> : <Text style={styles.field}>{words.length ? 'Không có từ phù hợp với dạng câu hỏi này.' : 'Thư mục này chưa có từ.'}</Text>}
  </>;
}

