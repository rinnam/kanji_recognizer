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
  type SceneType,
} from '../../../src/features/interview/InterviewScene3D';
import {
  playCallBellSfx,
  playClinicChimeSfx,
  playDoorKnockSfx,
  playShopBellSfx,
} from '../../../src/features/interview/interview-sfx';
import {
  ScenarioPropModal,
  type OutcomeCardData,
  type PropModalKind,
} from '../../../src/features/interview/ScenarioPropModal';
import {
  useJapaneseMic,
  type RecordedAudioPayload,
} from '../../../src/features/interview/use-japanese-mic';
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

function resolveSceneType(scenarioId?: string): SceneType {
  if (scenarioId === 'roleplay_restaurant') return 'restaurant';
  if (scenarioId === 'roleplay_clinic') return 'clinic';
  if (scenarioId === 'roleplay_horenso') return 'horenso';
  return 'interview';
}

const ROLEPLAY_STEP_META: Record<
  Exclude<SceneType, 'interview'>,
  {
    partnerLabel: string;
    badges: Array<{ stage: InterviewStage; label: string }>;
    stageLabels: Partial<Record<InterviewStage, string>>;
    quickPhrases: Array<{ label: string; text: string }>;
    doneTitle: string;
  }
> = {
  restaurant: {
    partnerLabel: 'Nhân viên nhà hàng',
    badges: [
      { stage: 'jikoshokai', label: '1. Báo số người & Vào bàn' },
      { stage: 'jiko_pr', label: '2. Xem Menu & Gọi món' },
      { stage: 'cv_q1', label: '3. Dị ứng / Gọi thêm' },
      { stage: 'cv_q2', label: '4. Thanh toán & Ra về' },
    ],
    stageLabels: {
      jikoshokai: 'Bước 1/4 · 入店・案内 (Báo số người & chọn chỗ)',
      jiko_pr: 'Bước 2/4 · 注文 (Hỏi gợi ý & gọi món)',
      cv_q1: 'Bước 3/4 · 要望・アレルギー (Báo dị ứng / gọi thêm)',
      cv_q2: 'Bước 4/4 · お会計 (Thanh toán & ごちそうさまでした)',
    },
    quickPhrases: [
      { label: 'Gọi nhân viên (すみません！)', text: 'すみません、注文をお願いします。' },
      { label: 'Thanh toán (お会計お願いします)', text: 'すみません、お会計をお願いします。ごちそうさまでした！' },
    ],
    doneTitle: 'Hoàn thành tình huống Gọi món tại Nhà hàng Nhật!',
  },
  clinic: {
    partnerLabel: 'Bác sĩ Kobayashi',
    badges: [
      { stage: 'jikoshokai', label: '1. Kể triệu chứng' },
      { stage: 'jiko_pr', label: '2. Bác sĩ hỏi bệnh' },
      { stage: 'cv_q1', label: '3. Dị ứng thuốc' },
      { stage: 'cv_q2', label: '4. Nhận đơn thuốc' },
    ],
    stageLabels: {
      jikoshokai: 'Bước 1/4 · 症状の説明 (Kể triệu chứng / chấn thương hiện tại)',
      jiko_pr: 'Bước 2/4 · 問診 (Trả lời chi tiết thời điểm & mức độ)',
      cv_q1: 'Bước 3/4 · アレルギー確認 (Báo tiền sử dị ứng thuốc)',
      cv_q2: 'Bước 4/4 · 処方箋 (Hỏi cách chăm sóc / uống thuốc & cảm ơn)',
    },
    quickPhrases: [
      { label: 'Trình thẻ bảo hiểm (保険証)', text: 'はい、こちらが保険証です。昨日から熱と喉の痛みがあります。' },
      { label: 'Hỏi cách uống thuốc', text: 'この薬は食後に飲めばいいですか。ありがとうございました。' },
    ],
    doneTitle: 'Hoàn thành buổi Khám bệnh tại Phòng khám Nhật!',
  },
  horenso: {
    partnerLabel: 'Sếp Takahashi PM',
    badges: [
      { stage: 'jikoshokai', label: '1. 報告 (Báo tiến độ)' },
      { stage: 'jiko_pr', label: '2. 連絡 (Báo rủi ro)' },
      { stage: 'cv_q1', label: '3. 相談 (Xin ý kiến)' },
      { stage: 'cv_q2', label: '4. Chốt kế hoạch' },
    ],
    stageLabels: {
      jikoshokai: 'Bước 1/4 · 報告 (Báo cáo tiến độ công việc)',
      jiko_pr: 'Bước 2/4 · 連絡 (Liên lạc sớm bug / rủi ro trễ hạn)',
      cv_q1: 'Bước 3/4 · 相談 (Đề xuất giải pháp & xin ý kiến sếp)',
      cv_q2: 'Bước 4/4 · 確認 (Chốt deadline mới & chào kết thúc)',
    },
    quickPhrases: [
      { label: 'Chào sếp (お疲れ様です)', text: 'お疲れ様です。今週のタスクは8割ほど完了しています。' },
      { label: 'Chốt hành động (承知いたしました)', text: '承知いたしました。明日の夕方までに修正して改めてご報告いたします。' },
    ],
    doneTitle: 'Hoàn thành buổi Họp Horenso (報連相) chuẩn công sở Nhật!',
  },
};

type FlowStep =
  | 'roleplay_entrance'
  | 'knock_door'
  | 'enter_phrase'
  | 'stand_greet'
  | 'sit_down'
  | 'qa_interview'
  | 'exit_stand'
  | 'exit_door'
  | 'completed';

const FRAMEWORK_TITLES: Record<string, string> = {
  PREP: 'Cấu trúc PREP (Phỏng vấn)',
  STAR: 'Cấu trúc STAR (Kinh nghiệm CV)',
  HORENSO: 'Khung Horenso (報・連・相)',
  SERVICE: 'Tiêu chí Giao tiếp Dịch vụ',
  MEDICAL: 'Tiêu chí Giao tiếp Y tế',
};

interface ScenarioInfo {
  id: string;
  category?: 'interview' | 'roleplay';
  title: string;
  companyName: string;
  interviewerName: string;
  interviewerRole: string;
  openingJa: string;
  openingReading: string;
  openingVi: string;
}

interface FrameworkCheckItem {
  code: string;
  label: string;
  met: boolean;
}

interface EvaluationDto {
  keigoScore: number;
  grammarScore: number;
  naturalScore: number;
  contentScore: number;
  structureScore: number;
  framework: 'PREP' | 'STAR' | 'HORENSO' | 'SERVICE' | 'MEDICAL';
  frameworkChecklist: FrameworkCheckItem[];
  fillersDetected: string[];
  fluencyNoteVi: string;
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
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [propModalKind, setPropModalKind] = useState<PropModalKind>(null);
  const [outcomeCard, setOutcomeCard] = useState<OutcomeCardData | null>(null);

  const directAudioHandlerRef = useRef<(payload: RecordedAudioPayload) => void>(() => {});
  const mic = useJapaneseMic({
    directMode: false,
    scenarioId: scenario?.id,
    contextHint: cvSummary,
    onDirectAudio: (payload) => directAudioHandlerRef.current(payload),
  });
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
        if (picked.category === 'roleplay') {
          setFlowStep('roleplay_entrance');
          setScenePhase('hallway');
          setQaStage('jikoshokai');
          if (picked.id === 'roleplay_restaurant') {
            setCurrentJa('（和食 さくらの入口に到着しました。引き戸を開けて入店してください）');
            setCurrentReading('わしょく さくらのいりぐちにとうちゃくしました。ひきどをあけてにゅうてんしてください');
            setCurrentVi('Bạn đang đứng trước cửa nhà hàng Washoku Sakura. Click cánh cửa 3D (hoặc bấm nút bên dưới) để mở cửa bước vào quán!');
          } else if (picked.id === 'roleplay_clinic') {
            setCurrentJa('（受付が完了しました。保険証を提示して診察室にお入りください）');
            setCurrentReading('うけつけがかんりょうしました。ほけんしょうをていじしてしんさつしつにおはいりください');
            setCurrentVi('Đã đến lượt khám! Hãy trình thẻ bảo hiểm (保険証) & click cánh cửa 3D để bước vào phòng khám gặp Bác sĩ Kobayashi.');
          } else {
            setCurrentJa('（PMの会議室の前です。「今、少しよろしいでしょうか？」と声をかけて入室してください）');
            setCurrentReading('かいぎしつのまえです。「いま、すこしよろしいでしょうか」とこえをかけてにゅうしつしてください');
            setCurrentVi('Bạn đang đứng trước phòng họp PM. Click cửa (hoặc bấm nút xin phép) để bắt đầu buổi họp Horenso!');
          }
          setLogs([
            {
              id: 'init',
              role: 'manner',
              text: `Chuẩn bị vào bối cảnh ${picked.companyName}. Click cửa 3D hoặc bấm nút bên dưới để bắt đầu!`,
            },
          ]);
        } else {
          setLogs([
            {
              id: 'init',
              role: 'manner',
              text: `Bắt đầu quy trình chuẩn Nhật tại ${picked.companyName}. Bước 1: Gõ cửa 3D đúng 3 lần.`,
            },
          ]);
        }
      })
      .catch(() => setErrorMsg('Không tải được kịch bản từ Backend.'));
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

  const handleRoleplayEnter = () => {
    if (!scenario || flowStep !== 'roleplay_entrance') return;
    if (scenario.id === 'roleplay_restaurant') {
      playShopBellSfx();
      addLog('candidate', '（引き戸を開けて入店… カランコロン♪）');
    } else if (scenario.id === 'roleplay_clinic') {
      playClinicChimeSfx();
      addLog('candidate', '（保険証を提示して診察室に入室）失礼します。');
    } else {
      playDoorKnockSfx();
      addLog('candidate', '（ノックして）お疲れ様です。今、少しよろしいでしょうか？');
    }
    setScenePhase('entering');
    setTimeout(() => {
      setScenePhase('seated');
      setFlowStep('qa_interview');
      speakInterviewer(scenario.openingJa, scenario.openingReading, scenario.openingVi);
    }, 1150);
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

  // STEP 5: Real AI Interview Q&A with Gemini Flash (supports 1-Shot Direct Voice Turn!)
  const handleQaTurn = async (rawText: string, directAudio?: RecordedAudioPayload) => {
    const clean = rawText.trim();
    if (!scenario || (!clean && !directAudio) || submitting) return;
    if (mic.listening) mic.stopListening();
    setSubmitting(true);
    setErrorMsg(null);
    setLastFailedText(null);
    setMannerAlert(null);

    const placeholderId = `u-${Date.now()}`;
    const nextLogs: ChatLogItem[] = [
      ...logs,
      {
        id: placeholderId,
        role: 'candidate',
        text: directAudio ? '（音声回答を送信中… / Đang gửi giọng nói...）' : clean,
      },
    ];
    setLogs(nextLogs);
    const capturedFillers = [...mic.audioFillers];
    mic.setTranscript('');
    mic.setAudioFillers([]);

    try {
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const res = await fetch(`${base}/interview/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          stage: qaStage,
          history: logs
            .filter((l) => l.role !== 'manner')
            .map((l) => ({ role: l.role as 'interviewer' | 'candidate', text: l.text })),
          userMessage: clean,
          cvSummary: cvSummary || undefined,
          fillersFromAudio: capturedFillers.length > 0 ? capturedFillers : undefined,
          audioBase64: directAudio?.base64Data,
          audioMimeType: directAudio?.mimeType,
          action: 'speak',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        candidateTranscript?: string;
        replyJa: string;
        replyReading: string;
        replyVi: string;
        nextStage: InterviewStage;
        finished: boolean;
        outcomeCard?: OutcomeCardData;
        evaluation: EvaluationDto;
      };

      const correctedText = data.candidateTranscript?.trim();
      if (correctedText && (directAudio || correctedText !== clean)) {
        const displayBubble =
          !directAudio && clean && correctedText !== clean
            ? `${correctedText}\n（Tự hiểu đồng âm từ: ${clean}）`
            : correctedText;
        setLogs((prev) =>
          prev.map((item) =>
            item.id === placeholderId ? { ...item, text: displayBubble } : item,
          ),
        );
      }

      if (data.outcomeCard) {
        setOutcomeCard(data.outcomeCard);
      }

      setEvaluations((prev) => [...prev, data.evaluation]);
      speakInterviewer(data.replyJa, data.replyReading, data.replyVi);
      setQaStage(data.nextStage);

      if (scenario.id === 'roleplay_restaurant' && data.nextStage === 'cv_q2' && !data.finished) {
        setMannerAlert(
          'Một lúc sau, nhân viên đã mang món ra và bạn đã dùng bữa xong! Hãy gọi thêm món tráng miệng hoặc bấm chuông / nói 「すみません、お会計をお願いします。ごちそうさまでした！」 để thanh toán.',
        );
      }

      if (data.finished) {
        if (scenario.category === 'roleplay') {
          setTimeout(() => {
            setFlowStep('completed');
          }, 2500);
        } else {
          setTimeout(() => {
            setFlowStep('exit_stand');
            setScenePhase('exit_standing');
            addMannerNote(
              'Phần hỏi đáp đã kết thúc! Giờ hãy làm đúng quy trình Ra về: Đứng dậy cạnh ghế → nói "本日はありがとうございました" → Cúi chào 45° (最敬礼).',
              0,
            );
          }, 3500);
        }
      }
    } catch {
      setLogs((prev) => prev.filter((item) => item.id !== placeholderId));
      if (clean) {
        mic.setTranscript(clean);
        mic.setAudioFillers(capturedFillers);
        setLastFailedText(clean);
      }
      setErrorMsg('Google AI đang tạm bận — câu bạn vừa nói đã được giữ nguyên, chỉ cần bấm "Gửi lại"!');
      setMood('idle');
    } finally {
      setSubmitting(false);
    }
  };

  directAudioHandlerRef.current = (payload) => {
    void handleQaTurn('', payload);
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

  const sceneType = resolveSceneType(scenario?.id ?? scenarioId);
  const roleplayMeta = sceneType !== 'interview' ? ROLEPLAY_STEP_META[sceneType] : null;
  const currentBadgeIdx = FLOW_BADGES.findIndex((b) => b.steps.includes(flowStep));
  const roleplayStageIdx = roleplayMeta
    ? roleplayMeta.badges.findIndex((b) => b.stage === qaStage)
    : -1;

  const micPlaceholder =
    roleplayMeta
      ? 'Nói câu tiếng Nhật của bạn qua Mic (Whisper offline) hoặc gõ...'
      : flowStep === 'enter_phrase'
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
        title={scenario?.title || 'Không gian 3D Luyện nói Nhật'}
        subtitle={
          scenario
            ? roleplayMeta
              ? `${scenario.companyName} · ${scenario.interviewerName} (${scenario.interviewerRole})`
              : `${scenario.companyName} · Hội đồng: ${scenario.interviewerName} & Nhân sự`
            : 'Đang chuẩn bị bối cảnh 3D...'
        }
      />

      {/* Dynamic Progress Bar: 4-step Roleplay OR 6-step Real Japanese Interview */}
      <View style={styles.stageBar}>
        {roleplayMeta
          ? roleplayMeta.badges.map((b, idx) => {
              const active = idx === roleplayStageIdx && flowStep !== 'completed';
              const done =
                (roleplayStageIdx >= 0 && idx < roleplayStageIdx) || flowStep === 'completed';
              return (
                <View
                  key={b.stage}
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
            })
          : FLOW_BADGES.map((b, idx) => {
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
          {lastFailedText ? (
            <Pressable
              style={styles.retryBtn}
              disabled={submitting}
              onPress={() => void handleQaTurn(lastFailedText)}
            >
              <Text style={styles.retryBtnText}>Gửi lại câu vừa rồi</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.layout, isWide && styles.layoutWide]}>
        {/* Left: Interactive 3D Scene + Step-by-Step Controls */}
        <View style={[styles.leftCol, isWide && styles.leftColWide]}>
          <InterviewScene3D
            sceneType={sceneType}
            phase={scenePhase}
            mood={mood}
            knockCount={knockCount}
            interviewerName={scenario?.interviewerName || 'Nhân vật 3D'}
            companyName={scenario?.companyName || 'Kanji Nest Japan'}
            onDoorClick={() => {
              if (flowStep === 'roleplay_entrance') {
                handleRoleplayEnter();
              } else {
                handleKnockDoor(false);
              }
            }}
            onPropClick={() => {
              if (sceneType === 'restaurant') setPropModalKind('menu');
              else if (sceneType === 'clinic') setPropModalKind('medical_intake');
              else if (sceneType === 'horenso') setPropModalKind('kanban');
              else setPropModalKind('cv');
            }}
          />

          {/* Interactive 3D Props Toolbar */}
          {flowStep !== 'knock_door' && flowStep !== 'roleplay_entrance' ? (
            <View style={styles.propsBar}>
              {sceneType === 'restaurant' ? (
                <>
                  <Pressable style={styles.propBtnPrimary} onPress={() => setPropModalKind('menu')}>
                    <Text style={styles.propBtnPrimaryText}>Mở Thực đơn (お品書き)</Text>
                  </Pressable>
                  <Pressable
                    style={styles.propBtn}
                    onPress={() => {
                      playCallBellSfx();
                      addLog('candidate', '（呼び出しボタン：ピンポーン♪）');
                      mic.setTranscript('すみません！');
                    }}
                  >
                    <Text style={styles.propBtnText}>Bấm chuông gọi nhân viên (ピンポーン♪)</Text>
                  </Pressable>
                </>
              ) : sceneType === 'clinic' ? (
                <Pressable style={styles.propBtnPrimary} onPress={() => setPropModalKind('medical_intake')}>
                  <Text style={styles.propBtnPrimaryText}>Mở Phiếu khám bệnh (問診票) &amp; Mẫu câu</Text>
                </Pressable>
              ) : sceneType === 'horenso' ? (
                <Pressable style={styles.propBtnPrimary} onPress={() => setPropModalKind('kanban')}>
                  <Text style={styles.propBtnPrimaryText}>Mở Bảng Sprint Kanban (スプリント進捗)</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.propBtn} onPress={() => setPropModalKind('cv')}>
                  <Text style={styles.propBtnText}>Xem lại tờ CV (履歴書) trên bàn</Text>
                </Pressable>
              )}
              {outcomeCard ? (
                <Pressable style={styles.propBtn} onPress={() => setPropModalKind('outcome')}>
                  <Text style={styles.propBtnText}>Xem {outcomeCard.title}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Subtitle / Prompt Card */}
          <View style={styles.subtitleCard}>
            <View style={styles.subtitleTop}>
              <Text style={styles.subtitleLabel}>
                {roleplayMeta
                  ? roleplayMeta.stageLabels[qaStage] || 'Hội thoại nhập vai 3D'
                  : flowStep === 'qa_interview'
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
              <Text style={styles.summaryTitle}>
                {roleplayMeta ? roleplayMeta.doneTitle : 'Hoàn thành 100% quy trình phỏng vấn Nhật Bản!'}
              </Text>
              <Text style={styles.summaryScore}>
                {roleplayMeta
                  ? `Điểm giao tiếp trung bình: ${avgLangScore}/100`
                  : `Tổng điểm: ${finalTotalScore}/100 (Tác phong: ${mannerScore}đ · Tiếng Nhật: ${avgLangScore}đ)`}
              </Text>
              {outcomeCard ? (
                <View style={styles.outcomeSummaryBox}>
                  <Text style={styles.outcomeSummaryTitle}>{outcomeCard.title}</Text>
                  {outcomeCard.items.map((line, i) => (
                    <Text key={i} style={styles.outcomeSummaryItem}>
                      • {line}
                    </Text>
                  ))}
                  {outcomeCard.noteVi ? (
                    <Text style={styles.outcomeSummaryNote}>{outcomeCard.noteVi}</Text>
                  ) : null}
                </View>
              ) : null}
              <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
                <Text style={styles.primaryBtnText}>Quay lại chọn kịch bản khác</Text>
              </Pressable>
            </View>
          ) : flowStep === 'roleplay_entrance' ? (
            <View style={styles.controlsCard}>
              <Text style={styles.stepGuideTitle}>
                {sceneType === 'restaurant'
                  ? 'Bước nhập cảnh — Mở cửa trượt bước vào nhà hàng'
                  : sceneType === 'clinic'
                    ? 'Bước nhập cảnh — Trình thẻ Bảo hiểm (保険証) & Vào phòng khám'
                    : 'Bước nhập cảnh — Xin phép sếp trước khi vào họp Horenso'}
              </Text>
              <Text style={styles.stepGuideDesc}>
                Click trực tiếp lên cánh cửa 3D ở trên hoặc bấm nút bên dưới để bước vào không gian 3D.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={handleRoleplayEnter}>
                <Text style={styles.primaryBtnText}>
                  {sceneType === 'restaurant'
                    ? 'Mở cửa trượt vào quán (カランコロン♪) →'
                    : sceneType === 'clinic'
                      ? 'Trình thẻ 保険証 & Vào phòng khám →'
                      : 'Gõ cửa & Xin phép "今、少しよろしいでしょうか？" →'}
                </Text>
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
                  roleplayMeta ? (
                    <>
                      {roleplayMeta.quickPhrases.map((qp, i) => (
                        <Pressable
                          key={i}
                          style={styles.etiquetteBtn}
                          disabled={submitting}
                          onPress={() => mic.setTranscript(qp.text)}
                        >
                          <Text style={styles.etiquetteText}>{qp.label}</Text>
                        </Pressable>
                      ))}
                    </>
                  ) : (
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
                  )
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
                  disabled={submitting || mic.transcribing}
                  onPress={() => (mic.listening ? mic.stopListening() : void mic.startListening())}
                >
                  <Text style={[styles.micBtnText, mic.listening && styles.micBtnTextActive]}>
                    {mic.transcribing
                      ? 'Đang chép lời...'
                      : mic.listening
                        ? `Dừng ghi âm (${mic.recordSeconds}s)`
                        : 'Nói tiếng Nhật'}
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

                {/* PREP / STAR Structure Evaluation */}
                <View style={styles.frameworkBox}>
                  <View style={styles.frameworkHeader}>
                    <Text style={styles.frameworkTitle}>
                      {FRAMEWORK_TITLES[latestEval.framework] ?? `Cấu trúc ${latestEval.framework}`}
                    </Text>
                    <Text style={styles.frameworkScore}>{latestEval.structureScore}đ</Text>
                  </View>
                  <View style={styles.frameworkRow}>
                    {(latestEval.frameworkChecklist ?? []).map((item, idx) => (
                      <View
                        key={`${item.code}-${idx}`}
                        style={[styles.fwChip, item.met ? styles.fwChipMet : styles.fwChipMiss]}
                      >
                        <Text
                          style={[
                            styles.fwChipText,
                            item.met ? styles.fwChipTextMet : styles.fwChipTextMiss,
                          ]}
                        >
                          {item.met ? '✓' : '✗'} {item.code} · {item.label.split(' (')[0]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Filler / Ấp úng (フィラー) Detection */}
                <View
                  style={[
                    styles.fillerBox,
                    (latestEval.fillersDetected?.length ?? 0) > 0
                      ? styles.fillerBoxWarn
                      : styles.fillerBoxOk,
                  ]}
                >
                  <Text
                    style={[
                      styles.fillerTitle,
                      (latestEval.fillersDetected?.length ?? 0) > 0
                        ? styles.fillerTitleWarn
                        : styles.fillerTitleOk,
                    ]}
                  >
                    {(latestEval.fillersDetected?.length ?? 0) > 0
                      ? `Từ đệm / Ấp úng (フィラー): ${latestEval.fillersDetected.join(', ')}`
                      : 'Độ trôi chảy: Tốt (0 từ đệm えーと/あのー)'}
                  </Text>
                  <Text style={styles.fillerNote}>{latestEval.fluencyNoteVi}</Text>
                </View>

                <View style={styles.correctionBox}>
                  <Text style={styles.correctionLabel}>Câu nói chuẩn &amp; lịch sự hơn:</Text>
                  <Text style={styles.correctionJa}>{latestEval.betterJapanese}</Text>
                  <Text style={styles.correctionVi}>{latestEval.feedbackVi}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyHint}>
                {roleplayMeta
                  ? `Hãy bắt đầu đối thoại tiếng Nhật cùng ${roleplayMeta.partnerLabel} qua Mic (Whisper offline) hoặc gõ — AI sẽ chấm 4 tiêu chí, bắt từ đệm và gợi ý câu nói tự nhiên hơn ngay tại đây.`
                  : 'Hoàn thành các bước gõ cửa → chào vào phòng → cúi chào 30° → ngồi xuống, sau đó AI sẽ chấm 4 tiêu chí tiếng Nhật và sửa lỗi Keigo cho từng câu trả lời của bạn.'}
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
            <Text style={styles.panelTitle}>
              {roleplayMeta ? 'Lịch sử hội thoại' : 'Diễn biến buổi phỏng vấn'}
            </Text>
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
                        : roleplayMeta
                          ? roleplayMeta.partnerLabel
                          : 'Nhà tuyển dụng'}
                  </Text>
                  <Text style={styles.logText}>{item.text}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
      <ScenarioPropModal
        kind={propModalKind}
        customContext={cvSummary || scenario?.openingVi || ''}
        outcomeCard={outcomeCard}
        onClose={() => setPropModalKind(null)}
        onPickPhrase={(ja) => mic.setTranscript(ja)}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
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
  propsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propBtnPrimary: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
  },
  propBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  propBtn: {
    backgroundColor: '#FDF8F0',
    borderWidth: 1,
    borderColor: '#C87D55',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
  },
  propBtnText: {
    color: '#9A5B37',
    fontSize: 12,
    fontWeight: '700',
  },
  outcomeSummaryBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: '#E5D5C3',
    padding: 12,
    gap: 4,
    marginVertical: 4,
  },
  outcomeSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A5B37',
  },
  outcomeSummaryItem: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 18,
  },
  outcomeSummaryNote: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    marginTop: 4,
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
  frameworkBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 11,
    gap: 8,
  },
  frameworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frameworkTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  frameworkScore: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  frameworkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fwChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
  },
  fwChipMet: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderColor: '#86EFAC',
  },
  fwChipMiss: {
    backgroundColor: '#F5F5F4',
    borderColor: '#D6D3D1',
  },
  fwChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fwChipTextMet: {
    color: '#15803D',
  },
  fwChipTextMiss: {
    color: '#78716C',
  },
  fillerBox: {
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    padding: 10,
    gap: 3,
  },
  fillerBoxWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  fillerBoxOk: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderColor: '#86EFAC',
  },
  fillerTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  fillerTitleWarn: {
    color: '#92400E',
  },
  fillerTitleOk: {
    color: '#15803D',
  },
  fillerNote: {
    fontSize: 11,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 16,
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
