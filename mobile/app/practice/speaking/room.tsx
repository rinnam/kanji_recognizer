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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../../src/library-source';
import { speakJapanese } from '../../../src/utils/speak-japanese';
import {
  InterviewScene3D,
  type AvatarMood,
  type ScenePhase,
} from '../../../src/features/interview/InterviewScene3D';
import { playDoorKnockSfx } from '../../../src/features/interview/interview-sfx';
import { useJapaneseMic } from '../../../src/features/interview/use-japanese-mic';
import { INTERVIEW_CV_STORAGE_KEY } from './index';

type InterviewStage =
  | 'jikoshokai'
  | 'jiko_pr'
  | 'cv_q1'
  | 'cv_q2'
  | 'cv_q3'
  | 'reverse_question'
  | 'closing';

const QA_STAGE_LABELS: Record<InterviewStage, string> = {
  jikoshokai: 'Câu 1/6 · 自己紹介 (Tự giới thiệu)',
  jiko_pr: 'Câu 2/6 · 自己PR (Điểm mạnh)',
  cv_q1: 'Câu 3/6 · Hỏi sâu CV #1',
  cv_q2: 'Câu 4/6 · Hỏi sâu CV #2 & Động lực',
  cv_q3: 'Câu 5/6 · Hỏi sâu CV #3 (Tình huống)',
  reverse_question: 'Câu 6/6 · 逆質問 (Câu hỏi ngược cho công ty)',
  closing: 'Kết thúc hỏi đáp → Chuẩn bị Ra về',
};

type FlowStep =
  | 'knock_door'
  | 'enter_phrase'
  | 'stand_greet'
  | 'sit_down'
  | 'qa_interview'
  | 'exit_stand'
  | 'exit_door'
  | 'completed';

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
  role: 'interviewer' | 'candidate' | 'manner';
  text: string;
}

const FLOW_BADGES: Array<{ id: string; label: string; steps: FlowStep[] }> = [
  { id: 'knock', label: '1. Gõ cửa 3 lần', steps: ['knock_door'] },
  { id: 'enter', label: '2. 失礼いたします', steps: ['enter_phrase'] },
  { id: 'greet', label: '3. Chào & Cúi 30°', steps: ['stand_greet'] },
  { id: 'sit', label: '4. Ngồi xuống', steps: ['sit_down'] },
  { id: 'qa', label: '5. Phỏng vấn AI', steps: ['qa_interview'] },
  { id: 'exit', label: '6. Cúi 45° & Ra về', steps: ['exit_stand', 'exit_door', 'completed'] },
];

function matchesShitsurei(text: string): 'formal' | 'polite' | 'none' {
  const s = text.toLowerCase().replace(/\s+/g, '');
  if (s.includes('失礼いたします') || s.includes('しつれいいたします') || s.includes('shitsureiitashimasu')) {
    return 'formal';
  }
  if (s.includes('失礼') || s.includes('しつれい') || s.includes('shitsurei')) {
    return 'polite';
  }
  return 'none';
}

function matchesGreeting(text: string): boolean {
  const s = text.toLowerCase().replace(/\s+/g, '');
  return (
    s.includes('よろしく') ||
    s.includes('申します') ||
    s.includes('もうします') ||
    s.includes('お願いします') ||
    s.includes('おねがいします') ||
    s.includes('yoroshiku') ||
    s.length >= 6
  );
}

function matchesThankYou(text: string): boolean {
  const s = text.toLowerCase().replace(/\s+/g, '');
  return (
    s.includes('ありがとう') ||
    s.includes('有難う') ||
    s.includes('arigatou') ||
    s.includes('arigato') ||
    s.includes('お疲れ') ||
    s.length >= 5
  );
}

export default function Interview3DRoomScreen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 960;

  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [cvSummary, setCvSummary] = useState<string>('');
  const [flowStep, setFlowStep] = useState<FlowStep>('knock_door');
  const [scenePhase, setScenePhase] = useState<ScenePhase>('hallway');
  const [qaStage, setQaStage] = useState<InterviewStage>('jikoshokai');
  const [mood, setMood] = useState<AvatarMood>('idle');

  const [knockCount, setKnockCount] = useState(0);
  const [mannerScore, setMannerScore] = useState(100);
  const [mannerNotes, setMannerNotes] = useState<string[]>([]);
  const [mannerAlert, setMannerAlert] = useState<string | null>(null);
  const [hasGreetedSpeech, setHasGreetedSpeech] = useState(false);
  const [hasSitSpeech, setHasSitSpeech] = useState(false);
  const [hasExitThankSpeech, setHasExitThankSpeech] = useState(false);
  const [hasExitFinalSpeech, setHasExitFinalSpeech] = useState(false);

  const [currentJa, setCurrentJa] = useState('（ドアの前で待機中… ノック3回をしてください）');
  const [currentReading, setCurrentReading] = useState('どあのまえでたいきちゅう… のっくさんかいをしてください');
  const [currentVi, setCurrentVi] = useState('Bạn đang đứng ngoài hành lang trước phòng phỏng vấn. Hãy click vào cánh cửa 3D đúng 3 lần (Cốc - Cốc - Cốc)!');
  const [showVi, setShowVi] = useState(true);

  const [logs, setLogs] = useState<ChatLogItem[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mic = useJapaneseMic();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    void AsyncStorage.getItem(INTERVIEW_CV_STORAGE_KEY).then((val) => {
      if (val) setCvSummary(val);
    });
    const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
    void fetch(`${base}/interview/scenarios`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { scenarios?: ScenarioInfo[] } | null) => {
        const list = data?.scenarios ?? [];
        const picked = list.find((s) => s.id === scenarioId) ?? list[0];
        if (!picked) return;
        setScenario(picked);
        setLogs([
          {
            id: 'init',
            role: 'manner',
            text: `Bắt đầu quy trình chuẩn Nhật tại ${picked.companyName}. Bước 1: Gõ cửa 3D đúng 3 lần.`,
          },
        ]);
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

  const addLog = (role: ChatLogItem['role'], text: string) => {
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }]);
  };

  const addMannerNote = (note: string, penalty = 0) => {
    setMannerAlert(note);
    setMannerNotes((prev) => [...prev, note]);
    if (penalty > 0) {
      setMannerScore((s) => Math.max(0, s - penalty));
    }
    addLog('manner', note);
  };

  const speakInterviewer = (ja: string, reading: string, vi: string) => {
    setCurrentJa(ja);
    setCurrentReading(reading);
    setCurrentVi(vi);
    addLog('interviewer', ja);
    setMood('speaking');
    void speakJapanese(ja).finally(() => {
      setMood((prev) => (prev === 'speaking' ? 'idle' : prev));
    });
  };

  // STEP 1: Knock on the 3D door (must be 3 times!)
  const handleKnockDoor = (fromButton = false) => {
    if (flowStep !== 'knock_door') return;
    if (fromButton) playDoorKnockSfx();
    const next = knockCount + 1;
    setKnockCount(next);
    setMannerAlert(null);

    if (next < 3) {
      addLog('candidate', `（コン… Lần gõ thứ ${next}/3）`);
      return;
    }

    if (next === 3) {
      addLog('candidate', '（コン・コン・コン！ Đủ 3 tiếng gõ chuẩn Nhật）');
      addMannerNote('Chuẩn tác phong! Gõ cửa chậm rãi đúng 3 lần (ノック3回).', 0);
      setTimeout(() => {
        speakInterviewer(
          'どうぞお入りください。',
          'どうぞおはいりください。',
          'Mời bạn vào! (Bây giờ hãy bấm Mic nói "失礼いたします" để mở cửa bước vào)',
        );
        setFlowStep('enter_phrase');
      }, 450);
    }
  };

  const handlePrematureEnter = () => {
    if (knockCount === 2) {
      addMannerNote(
        'Lỗi tác phong (-10đ): Ở Nhật gõ 2 lần là gõ cửa nhà vệ sinh! Phỏng vấn phải gõ đủ 3 lần (ノック3回).',
        10,
      );
    } else if (knockCount < 3) {
      addMannerNote(
        'Lỗi tác phong (-10đ): Không được tự ý mở cửa khi chưa gõ đủ 3 lần và nghe "どうぞお入りください"!',
        10,
      );
    }
  };

  // STEP 2: Say "失礼いたします" → 3D door swings open & camera walks inside
  const handleSubmitEnterPhrase = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    if (mic.listening) mic.stopListening();
    const match = matchesShitsurei(clean);
    addLog('candidate', clean);
    mic.setTranscript('');

    if (match === 'none') {
      addMannerNote(
        'Chưa đúng câu chào vào phòng! Hãy nói rõ "失礼いたします" (Shitsurei itashimasu) trước khi mở cửa.',
        5,
      );
      return;
    }

    if (match === 'polite') {
      addMannerNote(
        'Gợi ý Keigo (-3đ): Bạn nói "失礼します" đã lịch sự, nhưng phỏng vấn nên dùng "失礼いたします" sẽ chuẩn khiêm nhường ngữ hơn!',
        3,
      );
    } else {
      addMannerNote('Tuyệt vời! Nói chuẩn "失礼いたします" trước khi mở cửa vào phòng.', 0);
    }

    setScenePhase('entering');
    setCurrentJa('（ドアを開けて入室し、静かに閉めています…）');
    setCurrentReading('どあをあけてにゅうしつし、しずかにしめています…');
    setCurrentVi('Bạn đang mở cửa bước vào phòng, quay lại đóng cửa nhẹ nhàng bằng 2 tay và đi tới đứng bên trái ghế (椅子の横)...');

    setTimeout(() => {
      setScenePhase('standing_by_chair');
      setFlowStep('stand_greet');
      setCurrentJa('（椅子の横に立っています。名前と「よろしくお願いいたします」と言って30度のお辞儀をしてください）');
      setCurrentReading('いすのよこにたっています。なまえと「よろしくお願いいたします」といっておじぎをしてください');
      setCurrentVi('Đứng cạnh ghế: Hãy nói tên + "本日はよろしくお願いいたします" vào Mic, sau đó bấm "Cúi chào 30° (敬礼)".');
    }, 2200);
  };

  // STEP 3: Stand beside chair, say greeting, then bow 30 degrees
  const handleSubmitStandGreet = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    if (mic.listening) mic.stopListening();
    addLog('candidate', clean);
    mic.setTranscript('');
    if (!matchesGreeting(clean)) {
      addMannerNote('Hãy giới thiệu ngắn gọn tên và nói "本日はよろしくお願いいたします" nhé!', 0);
      return;
    }
    setHasGreetedSpeech(true);
    setMannerAlert('Đã nói lời chào! Giờ hãy bấm nút "Cúi chào 30° (敬礼)" ngay bên dưới.');
  };

  const handleBow30 = () => {
    if (flowStep !== 'stand_greet') return;
    if (!hasGreetedSpeech) {
      addMannerNote(
        'Mẹo tác phong (-5đ): Chuẩn Nhật là nói xong lời chào (語先後礼) rồi mới cúi chào 30°, không nói khi đầu đang cúi!',
        5,
      );
    } else {
      addMannerNote('Chuẩn "Ngữ tiên hậu lễ" (語先後礼): nói chào xong rồi cúi 30°!', 0);
    }
    setScenePhase('bowing_30');
    setTimeout(() => {
      setScenePhase('standing_by_chair');
      speakInterviewer(
        'どうぞおかけください。',
        'どうぞおかけください。',
        'Mời bạn ngồi xuống ghế. (Hãy nói "失礼いたします" rồi bấm nút Ngồi xuống ghế)',
      );
      setFlowStep('sit_down');
    }, 1600);
  };

  const handlePrematureSit = () => {
    addMannerNote(
      'Lỗi tác phong nghiêm trọng (-15đ): Tuyệt đối KHÔNG được tự ý ngồi trước khi nhà tuyển dụng mời "どうぞおかけください"!',
      15,
    );
  };

  // STEP 4: Say "失礼いたします" & sit down on the chair
  const handleSubmitSitSpeech = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    if (mic.listening) mic.stopListening();
    addLog('candidate', clean);
    mic.setTranscript('');
    if (matchesShitsurei(clean) === 'none') {
      addMannerNote('Trước khi ngồi xuống hãy nói "失礼いたします" nhé!', 0);
      return;
    }
    setHasSitSpeech(true);
    setMannerAlert('Chuẩn rồi! Bấm "Ngồi xuống ghế (着席)" để bắt đầu buổi phỏng vấn.');
  };

  const handleSitDown = () => {
    if (flowStep !== 'sit_down') return;
    if (!hasSitSpeech) {
      addMannerNote('Nhắc tác phong (-5đ): Nên nói "失礼いたします" trước khi ngồi xuống ghế.', 5);
    } else {
      addMannerNote('Chuẩn tác phong ngồi xuống ghế (着席)! Bắt đầu phỏng vấn chính thức.', 0);
    }
    setScenePhase('seated');
    setFlowStep('qa_interview');
    setQaStage('jikoshokai');
    setTimeout(() => {
      if (scenario) {
        speakInterviewer(scenario.openingJa, scenario.openingReading, scenario.openingVi);
      }
    }, 900);
  };

  // STEP 5: Real AI Interview Q&A with Gemini Flash
  const handleQaTurn = async (rawText: string) => {
    const clean = rawText.trim();
    if (!scenario || !clean || submitting) return;
    if (mic.listening) mic.stopListening();
    setSubmitting(true);
    setErrorMsg(null);
    setMannerAlert(null);

    const nextLogs: ChatLogItem[] = [
      ...logs,
      { id: `u-${Date.now()}`, role: 'candidate', text: clean },
    ];
    setLogs(nextLogs);
    mic.setTranscript('');

    try {
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const res = await fetch(`${base}/interview/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          stage: qaStage,
          history: nextLogs
            .filter((l) => l.role !== 'manner')
            .map((l) => ({ role: l.role as 'interviewer' | 'candidate', text: l.text })),
          userMessage: clean,
          cvSummary: cvSummary || undefined,
          action: 'speak',
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

      setEvaluations((prev) => [...prev, data.evaluation]);
      speakInterviewer(data.replyJa, data.replyReading, data.replyVi);
      setQaStage(data.nextStage);

      if (data.finished) {
        setTimeout(() => {
          setFlowStep('exit_stand');
          setScenePhase('exit_standing');
          addMannerNote(
            'Phần hỏi đáp đã kết thúc! Giờ hãy làm đúng quy trình Ra về: Đứng dậy cạnh ghế → nói "本日はありがとうございました" → Cúi chào 45° (最敬礼).',
            0,
          );
        }, 3500);
      }
    } catch {
      setErrorMsg('Không gọi được AI phỏng vấn. Hãy kiểm tra Backend cổng 3000.');
      setMood('idle');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 6: Stand beside chair, say thank you, bow 45°
  const handleSubmitExitThank = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    if (mic.listening) mic.stopListening();
    addLog('candidate', clean);
    mic.setTranscript('');
    if (!matchesThankYou(clean)) {
      addMannerNote('Hãy nói "本日はありがとうございました" trước khi cúi chào 45° nhé!', 0);
      return;
    }
    setHasExitThankSpeech(true);
    setMannerAlert('Tuyệt vời! Giờ bấm "Cúi chào sâu 45° (最敬礼)" rồi tiến ra cửa.');
  };

  const handleBow45AndWalkToDoor = () => {
    if (flowStep !== 'exit_stand') return;
    if (!hasExitThankSpeech) {
      addMannerNote('Nhắc tác phong (-5đ): Nên nói "本日はありがとうございました" trước khi cúi chào 45°.', 5);
    } else {
      addMannerNote('Chuẩn tác phong cúi chào sâu 45° (最敬礼) khi kết thúc!', 0);
    }
    setScenePhase('bowing_45');
    setTimeout(() => {
      setScenePhase('at_door_exit');
      setFlowStep('exit_door');
      setCurrentJa('（ドアの前で面接官の方を振り返り、「失礼いたします」と言って一礼してください）');
      setCurrentReading('どあのまえでめんせつかんのほうをふりかえり、「しつれいいたします」といっていちれいしてください');
      setCurrentVi('Bước cuối cùng: Đứng trước cửa quay mặt lại phía hội đồng, nói "失礼いたします" rồi bấm "Cúi chào 30° & Mở cửa ra về".');
    }, 1800);
  };

  // STEP 7: At door, turn back, say 失礼いたします & exit room
  const handleSubmitExitFinal = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    if (mic.listening) mic.stopListening();
    addLog('candidate', clean);
    mic.setTranscript('');
    if (matchesShitsurei(clean) === 'none') {
      addMannerNote('Trước khi mở cửa ra ngoài, quay lại hội đồng và nói "失礼いたします" nhé!', 0);
      return;
    }
    setHasExitFinalSpeech(true);
    setMannerAlert('Chuẩn rồi! Bấm "Cúi chào & Ra khỏi phòng" để hoàn thành buổi phỏng vấn.');
  };

  const handleFinishExit = () => {
    if (!hasExitFinalSpeech) {
      addMannerNote('Nhắc tác phong (-5đ): Đừng quên nói "失礼いたします" lần cuối trước khi mở cửa ra về!', 5);
    } else {
      addMannerNote('Hoàn hảo! Hoàn thành đầy đủ 100% quy trình ra về chuẩn Nhật Bản.', 0);
    }
    setScenePhase('bowing_30');
    setTimeout(() => {
      setScenePhase('left_room');
      setFlowStep('completed');
    }, 1200);
  };

  const handleMainTextSubmit = () => {
    if (flowStep === 'enter_phrase') {
      handleSubmitEnterPhrase(mic.transcript);
    } else if (flowStep === 'stand_greet') {
      handleSubmitStandGreet(mic.transcript);
    } else if (flowStep === 'sit_down') {
      handleSubmitSitSpeech(mic.transcript);
    } else if (flowStep === 'qa_interview') {
      void handleQaTurn(mic.transcript);
    } else if (flowStep === 'exit_stand') {
      handleSubmitExitThank(mic.transcript);
    } else if (flowStep === 'exit_door') {
      handleSubmitExitFinal(mic.transcript);
    }
  };

  const latestEval = evaluations[evaluations.length - 1] ?? null;
  const avgLangScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce(
            (sum, e) => sum + (e.keigoScore + e.grammarScore + e.naturalScore + e.contentScore) / 4,
            0,
          ) / evaluations.length,
        )
      : 80;
  const finalTotalScore = Math.round(mannerScore * 0.35 + avgLangScore * 0.65);
  const rank = finalTotalScore >= 90 ? 'S' : finalTotalScore >= 80 ? 'A' : finalTotalScore >= 65 ? 'B' : 'C';

  const currentBadgeIdx = FLOW_BADGES.findIndex((b) => b.steps.includes(flowStep));

  const micPlaceholder =
    flowStep === 'enter_phrase'
      ? 'Bấm Mic nói "失礼いたします" (Shitsurei itashimasu)...'
      : flowStep === 'stand_greet'
        ? 'Nói: "〇〇と申します。本日はよろしくお願いいたします。"'
        : flowStep === 'sit_down'
          ? 'Nói "失礼いたします" trước khi ngồi xuống...'
          : flowStep === 'exit_stand'
            ? 'Nói "本日はありがとうございました"...'
            : flowStep === 'exit_door'
              ? 'Quay lại hội đồng nói "失礼いたします"...'
              : 'Nói câu trả lời tiếng Nhật qua Mic hoặc gõ...';

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title={scenario?.title || 'Phòng Phỏng vấn 3D Chuẩn Nhật'}
        subtitle={
          scenario
            ? `${scenario.companyName} · Hội đồng: ${scenario.interviewerName} & Nhân sự`
            : 'Đang chuẩn bị phòng phỏng vấn...'
        }
      />

      {/* 6-Phase Real Japanese Interview Progress */}
      <View style={styles.stageBar}>
        {FLOW_BADGES.map((b, idx) => {
          const active = idx === currentBadgeIdx;
          const done = idx < currentBadgeIdx || flowStep === 'completed';
          return (
            <View
              key={b.id}
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
                {b.label}
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
        {/* Left: Interactive 3D Scene + Step-by-Step Controls */}
        <View style={[styles.leftCol, isWide && styles.leftColWide]}>
          <InterviewScene3D
            phase={scenePhase}
            mood={mood}
            knockCount={knockCount}
            interviewerName={scenario?.interviewerName || 'Nhà tuyển dụng'}
            companyName={scenario?.companyName || 'Kanji Nest Japan'}
            onDoorClick={() => handleKnockDoor(false)}
          />

          {/* Subtitle / Prompt Card */}
          <View style={styles.subtitleCard}>
            <View style={styles.subtitleTop}>
              <Text style={styles.subtitleLabel}>
                {flowStep === 'qa_interview'
                  ? QA_STAGE_LABELS[qaStage]
                  : 'Hướng dẫn quy trình chuẩn Nhật'}
              </Text>
              <View style={styles.subtitleActions}>
                <Pressable style={styles.miniBtn} onPress={() => setShowVi((v) => !v)}>
                  <Text style={styles.miniBtnText}>{showVi ? 'Ẩn dịch' : 'Hiện dịch'}</Text>
                </Pressable>
                <Pressable
                  style={styles.miniBtn}
                  onPress={() => {
                    if (!currentJa || currentJa.startsWith('（')) return;
                    setMood('speaking');
                    void speakJapanese(currentJa).finally(() => {
                      setMood((prev) => (prev === 'speaking' ? 'idle' : prev));
                    });
                  }}
                >
                  <Text style={styles.miniBtnText}>Nghe lại</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.jaText}>{currentJa}</Text>
            {currentReading ? <Text style={styles.readingText}>{currentReading}</Text> : null}
            {showVi && currentVi ? <Text style={styles.viText}>{currentVi}</Text> : null}
          </View>

          {mannerAlert ? (
            <View style={styles.mannerAlertCard}>
              <Text style={styles.mannerAlertText}>{mannerAlert}</Text>
            </View>
          ) : null}

          {/* Contextual Controls per Real-life Step */}
          {flowStep === 'completed' ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryRank}>Xếp loại: {rank}</Text>
              <Text style={styles.summaryTitle}>Hoàn thành 100% quy trình phỏng vấn Nhật Bản!</Text>
              <Text style={styles.summaryScore}>
                Tổng điểm: {finalTotalScore}/100 (Tác phong: {mannerScore}đ · Tiếng Nhật: {avgLangScore}đ)
              </Text>
              <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
                <Text style={styles.primaryBtnText}>Quay lại chọn kịch bản khác</Text>
              </Pressable>
            </View>
          ) : flowStep === 'knock_door' ? (
            <View style={styles.controlsCard}>
              <Text style={styles.stepGuideTitle}>
                Bước 1 — Gõ cửa phòng phỏng vấn ({knockCount}/3 lần)
              </Text>
              <Text style={styles.stepGuideDesc}>
                Click trực tiếp lên cánh cửa gỗ 3D ở trên hoặc bấm nút bên dưới đúng 3 lần (Cốc · Cốc · Cốc).
              </Text>
              <View style={styles.etiquetteRow}>
                <Pressable style={styles.primaryBtn} onPress={() => handleKnockDoor(true)}>
                  <Text style={styles.primaryBtnText}>Gõ cửa (Cốc! {knockCount}/3)</Text>
                </Pressable>
                <Pressable style={styles.dangerOutlineBtn} onPress={handlePrematureEnter}>
                  <Text style={styles.dangerOutlineText}>Mở cửa bước vào luôn</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.controlsCard}>
              {/* Action buttons for physical etiquette */}
              <View style={styles.etiquetteRow}>
                {flowStep === 'stand_greet' ? (
                  <>
                    <Pressable style={styles.etiquetteBtnPrimary} onPress={handleBow30}>
                      <Text style={styles.etiquetteBtnPrimaryText}>Cúi chào 30° (敬礼)</Text>
                    </Pressable>
                    <Pressable style={styles.dangerOutlineBtn} onPress={handlePrematureSit}>
                      <Text style={styles.dangerOutlineText}>Ngồi xuống ghế ngay</Text>
                    </Pressable>
                  </>
                ) : null}

                {flowStep === 'sit_down' ? (
                  <Pressable style={styles.etiquetteBtnPrimary} onPress={handleSitDown}>
                    <Text style={styles.etiquetteBtnPrimaryText}>Ngồi xuống ghế (着席)</Text>
                  </Pressable>
                ) : null}

                {flowStep === 'qa_interview' ? (
                  <Pressable
                    style={styles.etiquetteBtn}
                    onPress={() => {
                      setFlowStep('exit_stand');
                      setScenePhase('exit_standing');
                      addMannerNote(
                        'Chuyển sang bước Ra về: Đứng dậy cạnh ghế → nói "本日はありがとうございました" → Cúi chào 45°.',
                        0,
                      );
                    }}
                  >
                    <Text style={styles.etiquetteText}>Chuyển sang bước Ra về (退室)</Text>
                  </Pressable>
                ) : null}

                {flowStep === 'exit_stand' ? (
                  <Pressable style={styles.etiquetteBtnPrimary} onPress={handleBow45AndWalkToDoor}>
                    <Text style={styles.etiquetteBtnPrimaryText}>Cúi chào sâu 45° (最敬礼) &amp; Ra cửa</Text>
                  </Pressable>
                ) : null}

                {flowStep === 'exit_door' ? (
                  <Pressable style={styles.etiquetteBtnPrimary} onPress={handleFinishExit}>
                    <Text style={styles.etiquetteBtnPrimaryText}>Cúi chào 30° &amp; Mở cửa ra về</Text>
                  </Pressable>
                ) : null}
              </View>

              {mic.micError ? <Text style={styles.micErrorText}>{mic.micError}</Text> : null}

              <View style={styles.inputRow}>
                <Pressable
                  style={[styles.micBtn, mic.listening && styles.micBtnActive]}
                  disabled={submitting}
                  onPress={() => (mic.listening ? mic.stopListening() : mic.startListening())}
                >
                  <Text style={[styles.micBtnText, mic.listening && styles.micBtnTextActive]}>
                    {mic.listening ? 'Dừng Mic' : 'Nói tiếng Nhật'}
                  </Text>
                </Pressable>
                <TextInput
                  value={mic.transcript}
                  onChangeText={mic.setTranscript}
                  onSubmitEditing={handleMainTextSubmit}
                  placeholder={micPlaceholder}
                  placeholderTextColor={nihongoTheme.colors.textMuted}
                  style={styles.input}
                />
                <Pressable
                  style={[styles.sendBtn, (submitting || !mic.transcript.trim()) && styles.sendBtnDisabled]}
                  disabled={submitting || !mic.transcript.trim()}
                  onPress={handleMainTextSubmit}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.sendText}>Gửi</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Right: Manner Score + AI Keigo Evaluation + Transcript */}
        <View style={[styles.rightCol, isWide && styles.rightColWide]}>
          <View style={styles.evalCard}>
            <View style={styles.mannerHeader}>
              <Text style={styles.panelTitle}>Điểm Tác phong (マナー) &amp; AI</Text>
              <View style={styles.mannerBadge}>
                <Text style={styles.mannerBadgeText}>Tác phong: {mannerScore}đ</Text>
              </View>
            </View>

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
                  <Text style={styles.correctionLabel}>Câu nói chuẩn &amp; lịch sự hơn:</Text>
                  <Text style={styles.correctionJa}>{latestEval.betterJapanese}</Text>
                  <Text style={styles.correctionVi}>{latestEval.feedbackVi}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyHint}>
                Hoàn thành các bước gõ cửa → chào vào phòng → cúi chào 30° → ngồi xuống, sau đó AI sẽ chấm 4 tiêu chí tiếng Nhật và sửa lỗi Keigo cho từng câu trả lời của bạn.
              </Text>
            )}

            {mannerNotes.length > 0 ? (
              <View style={styles.notesList}>
                <Text style={styles.notesTitle}>Ghi nhận tác phong gần đây:</Text>
                {mannerNotes.slice(-3).map((n, i) => (
                  <Text key={i} style={styles.noteLine}>
                    • {n}
                  </Text>
                ))}
              </View>
            ) : null}
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
                    item.role === 'candidate'
                      ? styles.logCandidate
                      : item.role === 'manner'
                        ? styles.logManner
                        : styles.logInterviewer,
                  ]}
                >
                  <Text style={styles.logRole}>
                    {item.role === 'candidate'
                      ? 'Bạn'
                      : item.role === 'manner'
                        ? 'Tác phong Nhật'
                        : 'Nhà tuyển dụng'}
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
    paddingHorizontal: 11,
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
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 23,
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
  mannerAlertCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
  },
  mannerAlertText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 19,
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
  stepGuideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  stepGuideDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  etiquetteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  etiquetteBtnPrimary: {
    backgroundColor: nihongoTheme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: nihongoTheme.radius.button,
  },
  etiquetteBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  etiquetteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  dangerOutlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: nihongoTheme.radius.button,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  dangerOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
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
  micBtnTextActive: {
    color: '#FFFFFF',
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
    opacity: 0.55,
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
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  summaryRank: {
    fontSize: 28,
    fontWeight: '900',
    color: nihongoTheme.colors.accentHover,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
  },
  summaryScore: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 18,
    paddingVertical: 10,
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
  mannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mannerBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  mannerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
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
  notesList: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 10,
    gap: 4,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.textMuted,
  },
  noteLine: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 17,
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
  logManner: {
    backgroundColor: '#FFFBEB',
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
