import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../../src/library-source';
import { speakJapanese } from '../../../src/utils/speak-japanese';
import { InterviewScene3D, type AvatarMood } from '../../../src/features/interview/InterviewScene3D';
import { useJapaneseMic } from '../../../src/features/interview/use-japanese-mic';

type InterviewStage = 'entrance' | 'self_intro' | 'motivation' | 'situational' | 'closing';

interface ScenarioInfo {
  id: string;
  title: string;
  companyName: string;
  interviewerName: string;
  interviewerRole: string;
  openingJa: string;
  openingReading: string;
  openingVi: string;
}

interface EvaluationDto {
  keigoScore: number;
  grammarScore: number;
  naturalScore: number;
  contentScore: number;
  betterJapanese: string;
  feedbackVi: string;
}

interface ChatLogItem {
  id: string;
  role: 'interviewer' | 'candidate';
  text: string;
  vi?: string;
}

const STAGES: Array<{ key: InterviewStage; label: string }> = [
  { key: 'entrance', label: '1. Vào phòng' },
  { key: 'self_intro', label: '2. Giới thiệu' },
  { key: 'motivation', label: '3. Động lực' },
  { key: 'situational', label: '4. Tình huống' },
  { key: 'closing', label: '5. Kết thúc' },
];

export default function Interview3DRoomScreen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 960;

  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [stage, setStage] = useState<InterviewStage>('entrance');
  const [mood, setMood] = useState<AvatarMood>('bowing');
  const [currentJa, setCurrentJa] = useState('');
  const [currentReading, setCurrentReading] = useState('');
  const [currentVi, setCurrentVi] = useState('');
  const [showVi, setShowVi] = useState(true);
  const [logs, setLogs] = useState<ChatLogItem[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationDto[]>([]);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mic = useJapaneseMic();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
    void fetch(`${base}/interview/scenarios`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { scenarios?: ScenarioInfo[] } | null) => {
        const list = data?.scenarios ?? [];
        const picked = list.find((s) => s.id === scenarioId) ?? list[0];
        if (!picked) return;
        setScenario(picked);
        setCurrentJa(picked.openingJa);
        setCurrentReading(picked.openingReading);
        setCurrentVi(picked.openingVi);
        setLogs([{ id: 'open', role: 'interviewer', text: picked.openingJa, vi: picked.openingVi }]);
        setMood('bowing');
        setTimeout(() => {
          setMood('speaking');
          void speakJapanese(picked.openingJa);
          setTimeout(() => setMood('idle'), 4500);
        }, 900);
      })
      .catch(() => setErrorMsg('Không tải được kịch bản phỏng vấn từ Backend.'));
  }, [scenarioId]);

  useEffect(() => {
    if (mic.listening) {
      setMood('listening');
    } else if (mood === 'listening') {
      setMood('idle');
    }
  }, [mic.listening, mood]);

  const sendTurn = async (text: string, action?: 'knock' | 'bow' | 'speak') => {
    if (!scenario || submitting) return;
    const clean = text.trim();
    if (!clean && !action) return;

    if (mic.listening) mic.stopListening();
    setSubmitting(true);
    setErrorMsg(null);

    const displayCandidate =
      action === 'knock'
        ? '（ノック）失礼いたします。'
        : action === 'bow'
          ? '（お辞儀）よろしくお願いいたします。'
          : clean;

    const nextLogs: ChatLogItem[] = [
      ...logs,
      { id: `u-${Date.now()}`, role: 'candidate', text: displayCandidate },
    ];
    setLogs(nextLogs);
    mic.setTranscript('');

    if (action === 'bow') {
      setMood('bowing');
    }

    try {
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const res = await fetch(`${base}/interview/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          stage,
          history: nextLogs.map((l) => ({ role: l.role, text: l.text })),
          userMessage: clean,
          action: action ?? 'speak',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        replyJa: string;
        replyReading: string;
        replyVi: string;
        nextStage: InterviewStage;
        finished: boolean;
        evaluation: EvaluationDto;
      };

      setCurrentJa(data.replyJa);
      setCurrentReading(data.replyReading);
      setCurrentVi(data.replyVi);
      setStage(data.nextStage);
      setFinished(data.finished);
      setEvaluations((prev) => [...prev, data.evaluation]);
      setLogs((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'interviewer', text: data.replyJa, vi: data.replyVi },
      ]);

      setMood(data.finished ? 'bowing' : 'speaking');
      void speakJapanese(data.replyJa);
      setTimeout(() => setMood('idle'), 4500);
    } catch {
      setErrorMsg('Không gọi được AI phỏng vấn. Hãy kiểm tra Backend cổng 3000.');
      setMood('idle');
    } finally {
      setSubmitting(false);
    }
  };

  const latestEval = evaluations[evaluations.length - 1] ?? null;
  const avgScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce(
            (sum, e) => sum + (e.keigoScore + e.grammarScore + e.naturalScore + e.contentScore) / 4,
            0,
          ) / evaluations.length,
        )
      : 0;

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title={scenario?.title || 'Phòng Phỏng vấn 3D'}
        subtitle={
          scenario
            ? `${scenario.companyName} · ${scenario.interviewerName}`
            : 'Đang chuẩn bị phòng phỏng vấn...'
        }
      />

      {/* 5-Stage Japanese Interview Progress */}
      <View style={styles.stageBar}>
        {STAGES.map((st, idx) => {
          const currentIdx = STAGES.findIndex((s) => s.key === stage);
          const active = st.key === stage;
          const done = idx < currentIdx || finished;
          return (
            <View
              key={st.key}
              style={[
                styles.stagePill,
                done && styles.stagePillDone,
                active && styles.stagePillActive,
              ]}
            >
              <Text
                style={[
                  styles.stagePillText,
                  (active || done) && styles.stagePillTextActive,
                ]}
              >
                {st.label}
              </Text>
            </View>
          );
        })}
      </View>

      {errorMsg ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={[styles.layout, isWide && styles.layoutWide]}>
        {/* Left: 3D Scene + Subtitle + Voice / Etiquette Controls */}
        <View style={[styles.leftCol, isWide && styles.leftColWide]}>
          <InterviewScene3D
            mood={mood}
            interviewerName={scenario?.interviewerName || 'Nhà tuyển dụng'}
            companyName={scenario?.companyName || 'Kanji Nest Japan'}
          />

          {/* Current Interviewer Subtitle */}
          <View style={styles.subtitleCard}>
            <View style={styles.subtitleTop}>
              <Text style={styles.subtitleLabel}>Nhà tuyển dụng đang hỏi</Text>
              <View style={styles.subtitleActions}>
                <Pressable style={styles.miniBtn} onPress={() => setShowVi((v) => !v)}>
                  <Text style={styles.miniBtnText}>{showVi ? 'Ẩn dịch' : 'Hiện dịch'}</Text>
                </Pressable>
                <Pressable
                  style={styles.miniBtn}
                  onPress={() => {
                    if (!currentJa) return;
                    setMood('speaking');
                    void speakJapanese(currentJa);
                    setTimeout(() => setMood('idle'), 3500);
                  }}
                >
                  <Text style={styles.miniBtnText}>Nghe lại</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.jaText}>{currentJa || '...'}</Text>
            {currentReading ? <Text style={styles.readingText}>{currentReading}</Text> : null}
            {showVi && currentVi ? <Text style={styles.viText}>{currentVi}</Text> : null}
          </View>

          {/* Etiquette & Mic Controls */}
          {finished ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Hoàn thành buổi phỏng vấn!</Text>
              <Text style={styles.summaryScore}>Điểm trung bình: {avgScore} / 100</Text>
              <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
                <Text style={styles.primaryBtnText}>Chọn kịch bản khác</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.controlsCard}>
              <View style={styles.etiquetteRow}>
                <Pressable
                  style={styles.etiquetteBtn}
                  disabled={submitting}
                  onPress={() => void sendTurn('', 'knock')}
                >
                  <Text style={styles.etiquetteText}>Gõ cửa (失礼いたします)</Text>
                </Pressable>
                <Pressable
                  style={styles.etiquetteBtn}
                  disabled={submitting}
                  onPress={() => void sendTurn('', 'bow')}
                >
                  <Text style={styles.etiquetteText}>Cúi chào Ojigi (よろしくお願いします)</Text>
                </Pressable>
              </View>

              {mic.micError ? <Text style={styles.micErrorText}>{mic.micError}</Text> : null}

              <View style={styles.inputRow}>
                <Pressable
                  style={[styles.micBtn, mic.listening && styles.micBtnActive]}
                  disabled={submitting}
                  onPress={() => (mic.listening ? mic.stopListening() : mic.startListening())}
                >
                  <Text style={styles.micBtnText}>
                    {mic.listening ? 'Dừng Mic' : 'Nói tiếng Nhật'}
                  </Text>
                </Pressable>
                <TextInput
                  value={mic.transcript}
                  onChangeText={mic.setTranscript}
                  onSubmitEditing={() => void sendTurn(mic.transcript)}
                  placeholder="Nói qua Mic hoặc gõ câu trả lời tiếng Nhật..."
                  placeholderTextColor={nihongoTheme.colors.textMuted}
                  style={styles.input}
                />
                <Pressable
                  style={[styles.sendBtn, submitting && styles.sendBtnDisabled]}
                  disabled={submitting || !mic.transcript.trim()}
                  onPress={() => void sendTurn(mic.transcript)}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.sendText}>Trả lời</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Right: Real-time AI Evaluation + Keigo Correction + Transcript */}
        <View style={[styles.rightCol, isWide && styles.rightColWide]}>
          <View style={styles.evalCard}>
            <Text style={styles.panelTitle}>AI Chấm điểm &amp; Sửa văn nói</Text>
            {latestEval ? (
              <>
                <View style={styles.scoreGrid}>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreVal}>{latestEval.keigoScore}</Text>
                    <Text style={styles.scoreLbl}>Kính ngữ</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreVal}>{latestEval.grammarScore}</Text>
                    <Text style={styles.scoreLbl}>Ngữ pháp</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreVal}>{latestEval.naturalScore}</Text>
                    <Text style={styles.scoreLbl}>Tự nhiên</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreVal}>{latestEval.contentScore}</Text>
                    <Text style={styles.scoreLbl}>Nội dung</Text>
                  </View>
                </View>

                <View style={styles.correctionBox}>
                  <Text style={styles.correctionLabel}>Cách nói chuẩn &amp; lịch sự hơn:</Text>
                  <Text style={styles.correctionJa}>{latestEval.betterJapanese}</Text>
                  <Text style={styles.correctionVi}>{latestEval.feedbackVi}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyHint}>
                Hãy bắt đầu chào hỏi hoặc trả lời qua Mic — AI sẽ chấm 4 tiêu chí và sửa lỗi Keigo ngay tại đây.
              </Text>
            )}
          </View>

          <View style={styles.logCard}>
            <Text style={styles.panelTitle}>Diễn biến buổi phỏng vấn</Text>
            <ScrollView
              ref={scrollRef}
              style={styles.logScroll}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {logs.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.logBubble,
                    item.role === 'candidate' ? styles.logCandidate : styles.logInterviewer,
                  ]}
                >
                  <Text style={styles.logRole}>
                    {item.role === 'candidate' ? 'Bạn' : 'Nhà tuyển dụng'}
                  </Text>
                  <Text style={styles.logText}>{item.text}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stageBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  stagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  stagePillDone: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderColor: '#86EFAC',
  },
  stagePillActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  stagePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  stagePillTextActive: {
    color: '#FFFFFF',
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
  layout: {
    gap: 16,
  },
  layoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftCol: {
    gap: 12,
  },
  leftColWide: {
    flex: 1.45,
  },
  rightCol: {
    gap: 12,
  },
  rightColWide: {
    flex: 1,
  },
  subtitleCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    gap: 6,
    ...nihongoTheme.shadow.card,
  },
  subtitleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.textMuted,
    textTransform: 'uppercase',
  },
  subtitleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  jaText: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 24,
  },
  readingText: {
    fontSize: 12,
    color: nihongoTheme.colors.accentHover,
    fontWeight: '600',
  },
  viText: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  controlsCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  etiquetteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  etiquetteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: '#FDF8F0',
    borderWidth: 1,
    borderColor: '#C87D55',
  },
  etiquetteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A5B37',
  },
  micErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  micBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  micBtnActive: {
    backgroundColor: '#DC2626',
  },
  micBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  input: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: '#FDF8F0',
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.2,
    borderColor: '#C87D55',
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  summaryScore: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  evalCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  scoreGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scoreVal: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  scoreLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  correctionBox: {
    backgroundColor: '#FDF8F0',
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: '#E5D5C3',
    padding: 12,
    gap: 5,
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A5B37',
  },
  correctionJa: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  correctionVi: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 18,
  },
  emptyHint: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 19,
  },
  logCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  logScroll: {
    maxHeight: 280,
  },
  logBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    gap: 3,
  },
  logInterviewer: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
  },
  logCandidate: {
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  logRole: {
    fontSize: 10,
    fontWeight: '800',
    color: nihongoTheme.colors.textMuted,
  },
  logText: {
    fontSize: 13,
    fontWeight: '600',
    color: nihongoTheme.colors.textPrimary,
  },
});
