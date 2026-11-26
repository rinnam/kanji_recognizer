import { env } from '../config/env.js';
import { callGeminiJson } from './gemini-client.js';
import { transcribeWithLocalWhisper } from './whisper.service.js';

export type InterviewStage =
  | 'jikoshokai'
  | 'jiko_pr'
  | 'cv_q1'
  | 'cv_q2'
  | 'cv_q3'
  | 'reverse_question'
  | 'closing';

export interface InterviewScenario {
  id: string;
  category: 'interview' | 'roleplay';
  title: string;
  companyName: string;
  interviewerName: string;
  interviewerRole: string;
  level: string;
  description: string;
  defaultCv: string;
  openingJa: string;
  openingReading: string;
  openingVi: string;
}

export interface InterviewHistoryItem {
  role: 'interviewer' | 'candidate';
  text: string;
}

export interface FrameworkCheckItem {
  code: string;
  label: string;
  met: boolean;
}

export type EvaluationFramework = 'PREP' | 'STAR' | 'HORENSO' | 'SERVICE' | 'MEDICAL';

export interface InterviewEvaluation {
  keigoScore: number;
  grammarScore: number;
  naturalScore: number;
  contentScore: number;
  structureScore: number;
  framework: EvaluationFramework;
  frameworkChecklist: FrameworkCheckItem[];
  fillersDetected: string[];
  fluencyNoteVi: string;
  betterJapanese: string;
  feedbackVi: string;
}

export interface DynamicOutcomeCard {
  title: string;
  items: string[];
  noteVi: string;
}

export interface InterviewTurnResponse {
  candidateTranscript?: string;
  advanceStage?: boolean;
  replyJa: string;
  replyReading: string;
  replyVi: string;
  nextStage: InterviewStage;
  finished: boolean;
  evaluation: InterviewEvaluation;
  outcomeCard?: DynamicOutcomeCard | undefined;
}

export interface ParsedCvResponse {
  summary: string;
  focusTopics: string[];
}

export interface TranscribedAudioResponse {
  transcript: string;
  fillers: string[];
}

export const INTERVIEW_SCENARIOS: InterviewScenario[] = [
  {
    id: 'it_engineer',
    category: 'interview',
    title: 'Phỏng vấn Kỹ sư IT (ITエンジニア)',
    companyName: 'Mirai Tech Japan Inc.',
    interviewerName: 'Sato Yuki (佐藤 由紀)',
    interviewerRole: 'Trưởng phòng Kỹ thuật (開発部長)',
    level: 'N3 – N2',
    description:
      'Đủ 6 chặng chuẩn Nhật: 自己紹介 → 自己PR → 3 câu hỏi đào sâu từ CV/Dự án → 逆質問 (hỏi ngược công ty) → Ra về.',
    defaultCv:
      'Chuyên ngành: Công nghệ thông tin (Năm 4). Kỹ năng: TypeScript, React, Node.js, PostgreSQL. Dự án nổi bật: Xây dựng ứng dụng học tiếng Nhật Kanji Nest (Flashcard SRS, game đối kháng WebSocket). Chứng chỉ: JLPT N3. Điểm mạnh: Tự học nhanh, làm việc nhóm tốt.',
    openingJa:
      '本日は面接にお越しいただき、ありがとうございます。開発部の佐藤と申します。それではまず、1分ほどで自己紹介をお願いいたします。',
    openingReading:
      'ほんじつはめんせつにおこしいただき、ありがとうございます。かいはつぶのさとうともうします。それではまず、いっぷんほどでじこしょうかいをおねがいいたします。',
    openingVi:
      'Cảm ơn bạn hôm nay đã đến buổi phỏng vấn. Tôi là Sato thuộc phòng Phát triển. Trước tiên, bạn hãy tự giới thiệu bản thân (自己紹介) trong khoảng 1 phút nhé.',
  },
  {
    id: 'baito',
    category: 'interview',
    title: 'Phỏng vấn làm thêm (アルバイト)',
    companyName: 'Sakura Coffee Tokyo',
    interviewerName: 'Tanaka Kenji (田中 健二)',
    interviewerRole: 'Quản lý cửa hàng (店長)',
    level: 'N4 – N3',
    description:
      'Đủ 6 chặng: 自己紹介 → 自己PR → 3 câu hỏi theo CV (kinh nghiệm phục vụ, lịch làm việc, tình huống khách) → 逆質問.',
    defaultCv:
      'Du học sinh năm 2 tại Tokyo. Từng làm phục vụ quán cafe 6 tháng ở Việt Nam. Có thể làm 4 buổi/tuần (tối thứ 2, 4, 6 và cuối tuần). Trình độ tiếng Nhật: N3. Điểm mạnh: Luôn đúng giờ, giao tiếp thân thiện và cười tươi với khách.',
    openingJa:
      '本日はお越しいただきありがとうございます。店長の田中と申します。まず最初に、簡単に自己紹介をお願いいたします。',
    openingReading:
      'ほんじつはおこしいただきありがとうございます。てんちょうのたなかともうします。まずさいしょに、かんたんにじこしょうかいをおねがいいたします。',
    openingVi:
      'Cảm ơn bạn hôm nay đã đến. Tôi là Tanaka, quản lý cửa hàng. Trước tiên, hãy tự giới thiệu ngắn gọn về bản thân bạn nhé.',
  },
  {
    id: 'study_abroad',
    category: 'interview',
    title: 'Phỏng vấn Du học / Trường Nhật ngữ',
    companyName: 'Học viện Nhật ngữ Kibou',
    interviewerName: 'Yamada Haruo (山田 春夫)',
    interviewerRole: 'Cán bộ tuyển sinh (入試担当)',
    level: 'N4 – N3',
    description:
      'Đủ 6 chặng: 自己紹介 → 自己PR → 3 câu hỏi về hồ sơ học tập, kế hoạch tài chính & mục tiêu tại Nhật → 逆質問.',
    defaultCv:
      'Tốt nghiệp THPT loại Giỏi, đã học tiếng Nhật 1 năm (đạt N4, đang ôn N3). Gia đình hỗ trợ tài chính ổn định. Mục tiêu: Học trường Nhật ngữ 1.5 năm đạt N2, sau đó thi vào đại học chuyên ngành Kinh tế hoặc CNTT tại Nhật.',
    openingJa:
      '本日は面接にご参加いただきありがとうございます。入試担当の山田と申します。はじめに、自己紹介をお願いいたします。',
    openingReading:
      'ほんじつはめんせつにごさんかいただきありがとうございます。にゅうしたんとうのやまだともうします。はじめに、じこしょうかいをおねがいいたします。',
    openingVi:
      'Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Tôi là Yamada phụ trách tuyển sinh. Trước hết, hãy tự giới thiệu về bản thân bạn nhé.',
  },
  // ─── #5 Roleplay Đời sống & Công sở 3D ───────────────────────────────────
  {
    id: 'roleplay_horenso',
    category: 'roleplay',
    title: 'Họp Horenso (報連相) với sếp Nhật',
    companyName: 'Phòng Dự án IT · Tokyo',
    interviewerName: 'Takahashi PM (高橋 マネージャー)',
    interviewerRole: 'Quản lý dự án (PM)',
    level: 'N3 – N2',
    description:
      'Luyện báo cáo tiến độ (報告), liên lạc sự cố trễ deadline (連絡) và xin ý kiến giải pháp (相談) chuẩn văn hóa công sở Nhật.',
    defaultCv: 'Bối cảnh: Bạn là thành viên nhóm phát triển, cần báo cáo tiến độ task tuần này và trao đổi về một bug nhỏ có thể làm chậm 1 ngày.',
    openingJa:
      'お疲れ様です。今週のタスクの進捗はいかがですか。何か困っていることや相談したいことがあれば教えてください。',
    openingReading:
      'おつかれさまです。こんしゅうのたすくのしんちょくはいかがですか。なにかこまっていることやそうだんしたいことがあればおしえてください。',
    openingVi:
      'Vất vả cho bạn rồi. Tiến độ task tuần này thế nào? Nếu có khó khăn hay điều gì cần trao đổi thì báo mình nhé.',
  },
  {
    id: 'roleplay_clinic',
    category: 'roleplay',
    title: 'Đi khám bệnh tại Nhật (病院での診察)',
    companyName: 'Phòng khám Nội khoa Shinjuku',
    interviewerName: 'Bác sĩ Kobayashi (小林 先生)',
    interviewerRole: 'Bác sĩ nội khoa (医師)',
    level: 'N4 – N3',
    description:
      'Luyện mô tả triệu chứng (sốt, đau đầu, ho), thời điểm bắt đầu, tiền sử dị ứng thuốc và hỏi cách uống thuốc tại phòng khám Nhật.',
    defaultCv: 'Bối cảnh: Bạn bị cảm nhẹ / sốt 38 độ từ tối hôm qua, đau họng và hơi mệt nên đi khám bác sĩ.',
    openingJa:
      'こんにちは。今日はどうされましたか。いつ頃から、どんな症状がありますか。',
    openingReading:
      'こんにちは。きょうはどうされましたか。いつごろから、どんなしょうじょうがありますか。',
    openingVi:
      'Xin chào. Hôm nay bạn thấy trong người thế nào? Triệu chứng bắt đầu từ lúc nào và biểu hiện ra sao?',
  },
  {
    id: 'roleplay_restaurant',
    category: 'roleplay',
    title: 'Gọi món & Xử lý tình huống tại Nhà hàng Nhật',
    companyName: 'Nhà hàng Washoku Sakura',
    interviewerName: 'Nhân viên Suzuki (鈴木 スタッフ)',
    interviewerRole: 'Nhân viên phục vụ (ホール担当)',
    level: 'N5 – N4',
    description:
      'Luyện giao tiếp tự nhiên khi đặt bàn, hỏi món gợi ý, báo dị ứng thực phẩm, gọi thêm đồ uống và thanh toán tại quán ăn Nhật.',
    defaultCv: 'Bối cảnh: Bạn đi ăn tối cùng bạn bè tại quán ăn Nhật, muốn hỏi món đặc sản và lưu ý không ăn được đồ cay/hải sản.',
    openingJa:
      'いらっしゃいませ！何名様でしょうか。お席にご案内いたしますので、ご注文がお決まりになりましたらお呼びください。',
    openingReading:
      'いらっしゃいませ！なんめいさまでしょうか。おせきにごあんないいたしますので、ごちゅうもんがおきまりになりましたらおよびください。',
    openingVi:
      'Xin kính chào quý khách! Quý khách đi mấy người ạ? Tôi xin dẫn vào bàn, khi nào chọn xong món xin cứ gọi nhé.',
  },
];

const STAGE_ORDER: InterviewStage[] = [
  'jikoshokai',
  'jiko_pr',
  'cv_q1',
  'cv_q2',
  'cv_q3',
  'reverse_question',
  'closing',
];

const STAGE_INSTRUCTIONS: Record<InterviewStage, string> = {
  jikoshokai:
    'Ứng viên vừa hoàn thành 自己紹介 (Tự giới thiệu). Hãy phản hồi lịch sự (1 câu ngắn) rồi chuyển sang hỏi 自己PR (điểm mạnh / điều muốn PR về bản thân).',
  jiko_pr:
    'Ứng viên vừa trả lời 自己PR (Điểm mạnh). Hãy nhận xét ngắn gọn tích cực, sau đó đặt CÂU HỎI CV #1 đào sâu trực tiếp vào 1 chi tiết cụ thể (dự án / kinh nghiệm / kỹ năng) có trong CV của ứng viên.',
  cv_q1:
    'Ứng viên vừa trả lời Câu hỏi CV #1. Hãy phản hồi tự nhiên rồi đặt CÂU HỎI CV #2 dựa trên một điểm khác trong CV hoặc hỏi về 志望動機 (lý do ứng tuyển vào công ty/trường và liên hệ với kinh nghiệm trong CV).',
  cv_q2:
    'Ứng viên vừa trả lời Câu hỏi CV #2. Hãy phản hồi rồi đặt CÂU HỎI CV #3 mang tính tình huống/đào sâu từ CV (ví dụ: khó khăn lớn nhất từng gặp, cách xử lý áp lực, hoặc kế hoạch tương lai 3 năm tới).',
  cv_q3:
    'Ứng viên vừa trả lời Câu hỏi CV #3. Hãy cảm ơn câu trả lời, rồi chuyển sang phần 逆質問 (Câu hỏi ngược): hỏi rõ "最後に、弊社（または当校）について何かご質問はありますか？" để ứng viên đặt câu hỏi cho công ty.',
  reverse_question:
    'Ứng viên vừa đặt câu hỏi ngược (逆質問) hoặc nói không có câu hỏi. Hãy trả lời lịch sự, chân thành câu hỏi đó (1-2 câu), sau đó tuyên bố KẾT THÚC buổi phỏng vấn chuẩn Nhật: "本日の面接は以上となります。結果は後日ご連絡いたします。本日はありがとうございました。"',
  closing:
    'Buổi phỏng vấn đã kết thúc. Chào tạm biệt lịch sự "本日はありがとうございました。お気をつけてお帰りください。"',
};

const PREP_TEMPLATE: FrameworkCheckItem[] = [
  { code: 'P', label: 'Kết luận (Point)', met: false },
  { code: 'R', label: 'Lý do (Reason)', met: false },
  { code: 'E', label: 'Ví dụ cụ thể (Example)', met: false },
  { code: 'P', label: 'Chốt lại (Point)', met: false },
];

const STAR_TEMPLATE: FrameworkCheckItem[] = [
  { code: 'S', label: 'Bối cảnh (Situation)', met: false },
  { code: 'T', label: 'Nhiệm vụ (Task)', met: false },
  { code: 'A', label: 'Hành động (Action)', met: false },
  { code: 'R', label: 'Kết quả (Result)', met: false },
];

const HORENSO_TEMPLATE: FrameworkCheckItem[] = [
  { code: '報', label: 'Báo cáo tiến độ', met: false },
  { code: '連', label: 'Liên lạc sự cố', met: false },
  { code: '相', label: 'Đề xuất & Xin ý kiến', met: false },
  { code: '確', label: 'Chốt hành động', met: false },
];

const SERVICE_TEMPLATE: FrameworkCheckItem[] = [
  { code: '数', label: 'Rõ số lượng / món', met: false },
  { code: '礼', label: 'Lịch sự tự nhiên', met: false },
  { code: '伝', label: 'Đúng yêu cầu', met: false },
  { code: '流', label: 'Trôi chảy', met: false },
];

const MEDICAL_TEMPLATE: FrameworkCheckItem[] = [
  { code: '症', label: 'Rõ triệu chứng / chấn thương', met: false },
  { code: '時', label: 'Rõ thời điểm / mức độ', met: false },
  { code: '薬', label: 'Thông tin dị ứng / thuốc', met: false },
  { code: '礼', label: 'Lịch sự dễ hiểu', met: false },
];

const FILLER_REGEX =
  /(えー+と|えっと|あのー+|あのお|うー+ん|そのー+|まあ|なんか|えー+|あー+|umm+|uh+|à+|ờ+)/gi;

export function detectTextFillers(text: string): string[] {
  const matches = text.match(FILLER_REGEX) ?? [];
  return [...new Set(matches.map((m) => m.trim()).filter(Boolean))];
}

function expectedFrameworkForScenario(
  scenarioId: string,
  stage: InterviewStage,
): EvaluationFramework {
  if (scenarioId === 'roleplay_restaurant') return 'SERVICE';
  if (scenarioId === 'roleplay_clinic') return 'MEDICAL';
  if (scenarioId === 'roleplay_horenso') return 'HORENSO';
  return stage === 'cv_q1' || stage === 'cv_q3' ? 'STAR' : 'PREP';
}

function templateForFramework(framework: EvaluationFramework): FrameworkCheckItem[] {
  switch (framework) {
    case 'STAR':
      return STAR_TEMPLATE;
    case 'HORENSO':
      return HORENSO_TEMPLATE;
    case 'SERVICE':
      return SERVICE_TEMPLATE;
    case 'MEDICAL':
      return MEDICAL_TEMPLATE;
    default:
      return PREP_TEMPLATE;
  }
}

function getNextStage(current: InterviewStage): InterviewStage {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return 'closing';
  return STAGE_ORDER[idx + 1] ?? 'closing';
}

function clampScore(v: unknown, fallback = 78): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Parses a real uploaded CV (PDF / Image / TXT) with Gemini Flash multimodal API. */
export async function parseUploadedCv(input: {
  fileName: string;
  mimeType: string;
  base64Data: string;
}): Promise<ParsedCvResponse> {
  if (!env.GEMINI_API_KEY) {
    return {
      summary: `Đã nhận tệp ${input.fileName} (cần cấu hình GEMINI_API_KEY để AI trích xuất tự động).`,
      focusTopics: ['Dự án nổi bật', 'Kỹ năng chuyên môn', 'Lý do ứng tuyển'],
    };
  }

  const prompt = `Bạn là chuyên gia tuyển dụng Nhật Bản (人事担当者).
Hãy đọc kỹ hồ sơ CV / 履歴書 đính kèm (tên file: ${input.fileName}) và trích xuất thông tin súc tích để làm dữ liệu đặt câu hỏi phỏng vấn.

CHỈ TRẢ VỀ JSON HỢP LỆ (không bọc markdown):
{
  "summary": "Đoạn tóm tắt 5-8 dòng bằng tiếng Việt (giữ nguyên tên dự án, công ty, công nghệ, chứng chỉ JLPT, học vấn, kinh nghiệm, điểm mạnh có thật trong CV)",
  "focusTopics": ["3 điểm cụ thể có thật trong CV mà nhà tuyển dụng Nhật sẽ hỏi xoáy nhất"]
}`;

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (input.mimeType.startsWith('text/')) {
    const decoded = Buffer.from(input.base64Data, 'base64').toString('utf8');
    parts.push({ text: `Nội dung CV:\n${decoded.slice(0, 12000)}` });
  } else {
    parts.push({
      inlineData: {
        mimeType: input.mimeType || 'application/pdf',
        data: input.base64Data,
      },
    });
  }

  const parsed = await callGeminiJson<Partial<ParsedCvResponse>>(parts);
  return {
    summary: parsed.summary?.trim() || `CV từ tệp ${input.fileName}`,
    focusTopics: Array.isArray(parsed.focusTopics)
      ? parsed.focusTopics.filter((x): x is string => typeof x === 'string').slice(0, 4)
      : [],
  };
}

/** Transcribes spoken Japanese audio 100% locally via faster-whisper (0 Gemini tokens!). */
export async function transcribeInterviewAudio(input: {
  mimeType: string;
  base64Data: string;
  scenarioId?: string | undefined;
  contextHint?: string | undefined;
}): Promise<TranscribedAudioResponse> {
  try {
    const transcript = await transcribeWithLocalWhisper(input.base64Data, input.mimeType, {
      scenarioId: input.scenarioId,
      contextHint: input.contextHint,
    });
    const fillers = detectTextFillers(transcript);
    return { transcript, fillers };
  } catch {
    // Fallback to Gemini Audio only if local Python faster-whisper is not installed
    const prompt = `Hãy chép lời (transcribe) chính xác đoạn ghi âm tiếng Nhật sau đây (bối cảnh: ${input.scenarioId || 'interview'}).
Lưu ý chọn đúng chữ Kanji theo ngữ cảnh nếu có từ đồng âm (vd quán ăn: 鮭定食 chứ không phải 酒定食; bệnh viện: 症状 chứ không phải 賞状).
Giữ nguyên từ đệm nếu có (えーと, あのー, うーん, そのー, まあ).
CHỈ TRẢ VỀ JSON HỢP LỆ: { "transcript": "string", "fillers": ["string"] }`;

    const parsed = await callGeminiJson<Partial<TranscribedAudioResponse>>([
      { text: prompt },
      {
        inlineData: {
          mimeType: input.mimeType || 'audio/webm',
          data: input.base64Data,
        },
      },
    ]);

    const transcript = parsed.transcript?.trim() || '';
    const aiFillers = Array.isArray(parsed.fillers)
      ? parsed.fillers.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    const fillers = [...new Set([...aiFillers, ...detectTextFillers(transcript)])];
    return { transcript, fillers };
  }
}

export async function runInterviewTurn(input: {
  scenarioId: string;
  stage: InterviewStage;
  history: InterviewHistoryItem[];
  userMessage: string;
  cvSummary?: string | undefined;
  fillersFromAudio?: string[] | undefined;
  audioBase64?: string | undefined;
  audioMimeType?: string | undefined;
  action?: 'knock' | 'bow' | 'speak' | undefined;
}): Promise<InterviewTurnResponse> {
  const scenario =
    INTERVIEW_SCENARIOS.find((s) => s.id === input.scenarioId) ?? INTERVIEW_SCENARIOS[0]!;
  const cvText = input.cvSummary?.trim() || scenario.defaultCv;
  const candidateText = input.userMessage.trim();
  const framework = expectedFrameworkForScenario(scenario.id, input.stage);
  const templateChecklist = templateForFramework(framework);

  const detectedFillers = [
    ...new Set([...(input.fillersFromAudio ?? []), ...detectTextFillers(candidateText)]),
  ];

  const isRoleplay = scenario.category === 'roleplay';
  const nextStage = getNextStage(input.stage);
  const willFinish = isRoleplay
    ? input.stage === 'cv_q2' || input.stage === 'reverse_question' || input.stage === 'closing'
    : input.stage === 'reverse_question' || input.stage === 'closing';

  if (!env.GEMINI_API_KEY) {
    return {
      replyJa: willFinish
        ? '本日の面接は以上となります。本日はありがとうございました。'
        : 'ありがとうございます。履歴書の内容についてもう少し詳しく教えていただけますか。',
      replyReading: willFinish
        ? 'ほんじつのめんせつはいじょうとなります。ほんじつはありがとうございました。'
        : 'ありがとうございます。りれきしょのないようについてもうすこしくわしくおしえていただけますか。',
      replyVi: willFinish
        ? 'Buổi phỏng vấn hôm nay đến đây là kết thúc. Cảm ơn bạn rất nhiều.'
        : 'Cảm ơn bạn. Bạn có thể chia sẻ chi tiết hơn về nội dung trong CV không?',
      nextStage,
      finished: willFinish,
      evaluation: {
        keigoScore: 80,
        grammarScore: 80,
        naturalScore: 78,
        contentScore: 82,
        structureScore: 75,
        framework,
        frameworkChecklist: templateChecklist,
        fillersDetected: detectedFillers,
        fluencyNoteVi:
          detectedFillers.length > 0
            ? `Phát hiện từ đệm (${detectedFillers.join(', ')}) — hãy ngắt nghỉ 0.5 giây thay vì nói "えーと/あのー".`
            : 'Chưa phát hiện từ đệm ấp úng (フィラー).',
        betterJapanese: candidateText || 'よろしくお願いいたします。',
        feedbackVi: 'Chưa cấu hình GEMINI_API_KEY trong backend/.env — đang chạy chế độ mẫu.',
      },
    };
  }

  const roleplayStepGuides: Record<string, Partial<Record<InterviewStage, string>>> = {
    roleplay_restaurant: {
      jikoshokai:
        'Bước 1/4 (入店・案内): Khách vừa báo số người/chỗ ngồi hoặc yêu cầu đầu tiên (bám sát bối cảnh tùy chỉnh của khách nếu có). Hãy dẫn khách vào bàn lịch sự ("かしこまりました。こちらのお席へどうぞ"), đưa thực đơn お品書き và hỏi khách muốn gọi đồ uống hay món gì.',
      jiko_pr:
        'Bước 2/4 (注文): Khách vừa gọi món hoặc hỏi món gợi ý (Menu quán có: 鮭定食 ¥1,100 [cá hồi nướng], カツ丼 ¥980 [thịt heo chiên xù trứng], 辛口味噌ラーメン ¥950 [mì cay], 海鮮天ぷら盛り合わせ ¥1,350 [tempura hải sản], 野菜天ぷら定食 ¥1,050 [tempura rau củ], ウーロン茶 ¥300, 生ビール ¥550, 抹茶アイス ¥420). Hãy xác nhận món khách vừa gọi một cách thân thiện, rồi HỎI khách có gọi thêm đồ uống hay có dị ứng thực phẩm/món nào không ăn được không ("アレルギーや苦手な食材はございますか？"). LƯU Ý: CHỈ nhắc mâu thuẫn dị ứng (vd cá hồi là hải sản) NẾU TRONG LỊCH SỬ HỘI THOẠI KHÁCH ĐÃ THẬT SỰ NÓI LÀ DỊ ỨNG; nếu khách CHƯA nói dị ứng thì TUYỆT ĐỐI KHÔNG tự giả vờ khách đã báo!',
      cv_q1:
        'Bước 3/4 (注文確定): Khách vừa báo yêu cầu đặc biệt / dị ứng / đồ uống / xác nhận đơn. Hãy xác nhận lại đơn hàng chu đáo (kiểm tra logic nguyên liệu hợp lý) rồi nói ngắn gọn hẹn khách chờ bếp chuẩn bị (ví dụ: "かしこまりました。それではご用意いたしますので、少々お待ちくださいませ。"). TUYỆT ĐỐI KHÔNG tự tua thời gian kiểu "……お待たせいたしました！" và KHÔNG hỏi thanh toán (お会計) trong lượt này vì khách còn chưa ăn.',
      cv_q2:
        'Bước 4/4 (食後・お会計): Thời điểm lúc này là khách ĐÃ DÙNG BỮA XONG và vừa gọi thanh toán hoặc nói ごちそうさまでした (hoặc gọi thêm tráng miệng trước khi về). Hãy phản hồi lịch sự, tính tổng tiền dựa trên ĐÚNG các món khách đã gọi trong lịch sử, chào cảm ơn chuẩn quán Nhật ("ありがとうございました！またお越しくださいませ！") VÀ điền trường outcomeCard dạng Hóa đơn (伝票).',
    },
    roleplay_clinic: {
      jikoshokai:
        'Bước 1/4 (症状の説明): Bệnh nhân vừa mô tả vấn đề sức khỏe/chấn thương. QUAN TRỌNG: Đọc kỹ bối cảnh tùy chỉnh và lời nói thật của bệnh nhân (ví dụ: nếu bị gãy chân / trật khớp / đau bụng / dị ứng thì HỎI ĐÚNG VỀ CHẤN THƯƠNG/BỆNH ĐÓ — TUYỆT ĐỐI KHÔNG tự bịa hỏi sốt hay đau họng nếu bệnh nhân không bị cảm!). Hãy hỏi sâu 1-2 câu chuyên môn phù hợp (bị từ lúc nào, mức độ đau/sưng/cử động...).',
      jiko_pr:
        'Bước 2/4 (問診): Bệnh nhân vừa trả lời chi tiết tình trạng. Hãy phản hồi ân cần đúng với bệnh/chấn thương của bệnh nhân và hỏi về tiền sử dị ứng thuốc (薬のアレルギー) hoặc thuốc đang sử dụng.',
      cv_q1:
        'Bước 3/4 (アレルギー確認・診断): Bệnh nhân vừa trả lời thông tin dị ứng. Hãy đưa ra kết luận sơ bộ & hướng xử lý THỰC TẾ đúng với bệnh/chấn thương (ví dụ: gãy chân → chụp X-quang レントゲン & nẹp/bó bột + thuốc giảm đau; cảm cúm → đơn thuốc uống sau ăn; đau bụng → thuốc dạ dày...) và hỏi bệnh nhân có thắc mắc gì không.',
      cv_q2:
        'Bước 4/4 (処方箋・お大事に): Bệnh nhân vừa hỏi thêm hoặc cảm ơn. Hãy dặn dò cách chăm sóc/uống thuốc/tái khám ĐÚNG với ca bệnh của bệnh nhân, chào "お大事になさってください。" VÀ điền trường outcomeCard dạng Phiếu chẩn đoán & Đơn thuốc (診断メモ・処方箋).',
    },
    roleplay_horenso: {
      jikoshokai:
        'Bước 1/4 (報告 - Báo cáo): Nhân viên vừa trình bày tình hình ban đầu (bám sát 100% bối cảnh tùy chỉnh ở trên: vd tiến độ sprint, sập server production, đổi yêu cầu khách hàng...). Hãy ghi nhận và hỏi sâu về rủi ro / mức độ ảnh hưởng hiện tại.',
      jiko_pr:
        'Bước 2/4 (連絡 - Liên lạc vấn đề): Nhân viên vừa thông tin chi tiết vấn đề/rủi ro. Hãy khen ngợi việc báo sớm (早めに連絡してくれてありがとう) và hỏi nhân viên đề xuất phương án xử lý (相談) như thế nào.',
      cv_q1:
        'Bước 3/4 (相談 - Thảo luận giải pháp): Nhân viên vừa đề xuất hướng xử lý. Hãy góp ý thực tế đúng theo sự cố đó, thống nhất phương án và hỏi xác nhận thời điểm hoàn thành / hành động tiếp theo cụ thể.',
      cv_q2:
        'Bước 4/4 (確認・締め): Nhân viên vừa chốt hành động. Hãy xác nhận đồng ý, chào kết thúc chuẩn công sở Nhật ("承知しました。引き続きよろしくお願いします。お疲れ様でした。") VÀ điền trường outcomeCard dạng Biên bản chốt hành động Horenso (確認メモ).',
    },
  };

  const stageInstruction = isRoleplay
    ? roleplayStepGuides[scenario.id]?.[input.stage] ||
      (willFinish
        ? `Đây là lượt cuối của buổi Roleplay (${scenario.title}). Hãy phản hồi tự nhiên và chào kết thúc lịch sự bằng tiếng Nhật.`
        : `Bạn đang nhập vai ${scenario.interviewerName} trong tình huống "${scenario.title}". Hãy phản hồi tự nhiên (1-2 câu tiếng Nhật trình độ ${scenario.level}) và hỏi tiếp câu sát bối cảnh.`)
    : STAGE_INSTRUCTIONS[input.stage];

  const frameworkSpecMap: Record<EvaluationFramework, string> = {
    PREP: 'PREP: P (Kết luận trước), R (Lý do), E (Ví dụ cụ thể), P (Chốt lại)',
    STAR: 'STAR: S (Bối cảnh), T (Nhiệm vụ), A (Hành động của riêng ứng viên), R (Kết quả cụ thể)',
    HORENSO: 'HORENSO: 報 (Báo cáo rõ ràng), 連 (Liên lạc kịp thời rủi ro), 相 (Đề xuất & xin ý kiến), 確 (Chốt hành động tiếp theo)',
    SERVICE: 'SERVICE (Giao tiếp dịch vụ): 数 (Rõ số lượng/món), 礼 (Lịch sự tự nhiên), 伝 (Đúng yêu cầu), 流 (Trôi chảy) — KHÔNG ép khung PREP',
    MEDICAL: 'MEDICAL (Giao tiếp y tế): 症 (Rõ triệu chứng/chấn thương), 時 (Thời điểm/mức độ), 薬 (Dị ứng/thuốc), 礼 (Lịch sự dễ hiểu) — KHÔNG ép khung PREP',
  };
  const frameworkSpec = frameworkSpecMap[framework];

  const aiRoleLabel =
    scenario.id === 'roleplay_restaurant'
      ? 'Nhân viên nhà hàng'
      : scenario.id === 'roleplay_clinic'
        ? 'Bác sĩ'
        : scenario.id === 'roleplay_horenso'
          ? 'Quản lý dự án (PM)'
          : 'Nhà tuyển dụng';

  const learnerRoleLabel =
    scenario.id === 'roleplay_restaurant'
      ? 'Khách hàng (Người học)'
      : scenario.id === 'roleplay_clinic'
        ? 'Bệnh nhân (Người học)'
        : scenario.id === 'roleplay_horenso'
          ? 'Nhân viên (Người học)'
          : 'Ứng viên (Người học)';

  const roleDescriptor = isRoleplay
    ? `Bạn đang nhập vai ${aiRoleLabel}: ${scenario.interviewerName} (${scenario.interviewerRole}) tại ${scenario.companyName} trong bối cảnh "${scenario.title}". Người đối thoại với bạn là ${learnerRoleLabel}.`
    : `Bạn là ${aiRoleLabel} tên ${scenario.interviewerName} (${scenario.interviewerRole}) tại ${scenario.companyName}. Người đối thoại với bạn là ${learnerRoleLabel}.`;

  const contextHeading = isRoleplay
    ? 'Ghi chú bối cảnh / mục tiêu riêng của NGƯỜI HỌC (CHỈ để hiểu chủ đề chung — nhân vật AI KHÔNG ĐỌC ĐƯỢC SUY NGHĨ của người học):'
    : 'Nội dung CV / 履歴書 THẬT của ứng viên:';

  const antiMetagamingRule = isRoleplay
    ? `\n- QUY TẮC BẮT BUỘC (KHÔNG ĐỌC SUY NGHĨ / NO METAGAMING): ${aiRoleLabel} CHỈ biết những thông tin mà ${learnerRoleLabel} ĐÃ THẬT SỰ NÓI RA trong "Lịch sử hội thoại" hoặc câu vừa nói ở dưới. TUYỆT ĐỐI CẤM giả vờ người học đã báo dị ứng / triệu chứng / chi tiết từ phần "Ghi chú bối cảnh" ở trên nếu trong lịch sử hội thoại người học CHƯA HỀ NÓI câu nào về điều đó (không được nói kiểu "先ほど海鮮が苦手と伺いましたが..." khi khách chưa hề nhắc đến hải sản!). Hãy cứ phản hồi đúng những gì người học thực sự vừa nói và đặt câu hỏi mở tự nhiên để người học tự nói ra.`
    : '';

  const systemPrompt = `${roleDescriptor}
Trình độ mục tiêu: ${scenario.level}.
${contextHeading}
"""
${cvText}
"""

Lượt hiện tại thuộc bước: "${input.stage}".
CHỈ DẪN BẮT BUỘC CHO LƯỢT NÀY:
${stageInstruction}

NGUYÊN TẮC HỘI THOẠI TỰ NHIÊN:${antiMetagamingRule}
- Chỉ nói ĐÚNG 1 hành động/phản hồi tự nhiên của ${aiRoleLabel} trong lượt này; TUYỆT ĐỐI KHÔNG tự tua thời gian hay tự biên tự diễn 2 cảnh trong cùng 1 câu (không viết kiểu "少々お待ちください……お待たせいたしました！").
- Giữ logic thực tế đời thường (không nhận các yêu cầu mâu thuẫn vật lý như "cá hồi bỏ hải sản").
- Trường "advanceStage": đặt true nếu ${learnerRoleLabel} đã hoàn thành mục tiêu của bước "${input.stage}"; đặt false NẾU ${learnerRoleLabel} mới chỉ hỏi thông tin trung gian (vd: "おすすめは何ですか？" khi chưa chốt món, xin nhắc lại câu hỏi "もう一度お願いします", đang đổi lại món do dị ứng, hoặc ở bước cuối nhà hàng gọi thêm tráng miệng thay vì gọi thanh toán お会計) để giữ nguyên bước hiện tại cho người học nói tiếp!
- Trường "replyVi" dịch bằng tiếng Việt tự nhiên, đời thường (vd: "set cơm cá hồi nướng" thay vì dịch cứng "suất cá hồi định thực").

CHẤM ĐIỂM CÂU NÓI CỦA ${learnerRoleLabel.toUpperCase()} (KHÔNG chấm câu trả lời của ${aiRoleLabel}):
0. XỬ LÝ TỪ ĐỒNG ÂM TỪ NHẬN DIỆN GIỌNG NÓI (STT Homophone Disambiguation): Câu của ${learnerRoleLabel} có thể đến từ nhận diện giọng nói tiếng Nhật, nên đôi khi bị đổi nhầm chữ Kanji đồng âm (vd: "さけていしょく" = 鮭定食 nhưng ghi 酒定食; 症状 ghi 賞状; 故障 ghi 交渉; お箸 ghi お橋). Nếu gặp từ đồng âm vô lý với bối cảnh nhưng đọc giống hệt từ đúng: hãy tự hiểu đúng ý, KHÔNG trừ điểm ngữ pháp/nội dung vì lỗi Kanji của máy STT, và ghi bản đã sửa đúng Kanji vào "candidateTranscript".
1. Đánh giá CÂU CỦA ${learnerRoleLabel} theo khung **${framework}** (${frameworkSpec}): điền đúng 4 mục vào frameworkChecklist (met: true/false) và chấm structureScore (0-100). Với câu giao tiếp ngắn (như báo số người / gọi món ở nhà hàng), chấm công bằng theo độ rõ ràng & lịch sự, KHÔNG đòi hỏi dài dòng kiểu phỏng vấn.
2. Phát hiện từ đệm / ấp úng (フィラー như えーと, あのー, うーん, そのー, まあ, à, ờ) trong câu của ${learnerRoleLabel} (sơ bộ: ${JSON.stringify(detectedFillers)}). Viết fluencyNoteVi nhận xét ngắn gọn.
3. Chấm keigoScore, grammarScore, naturalScore, contentScore (0-100) cho CÂU CỦA ${learnerRoleLabel}.
4. Viết betterJapanese: phiên bản nói tiếng Nhật tự nhiên & lịch sự hơn CHO CHÍNH CÂU VỪA NÓI CỦA ${learnerRoleLabel} (tuyệt đối KHÔNG viết lời thoại của ${aiRoleLabel}!).
5. Viết feedbackVi: nhận xét & gợi ý cải thiện ngắn gọn 1-2 câu bằng tiếng Việt CHO CÂU VỪA NÓI CỦA ${learnerRoleLabel} (tuyệt đối KHÔNG tự nhận xét hay tự khen lời thoại của ${aiRoleLabel}!).
${
  willFinish && isRoleplay
    ? '6. Nếu advanceStage = true (buổi hội thoại kết thúc / khách yêu cầu thanh toán / chốt xong đơn thuốc / chốt kế hoạch), BẮT BUỘC điền trường "outcomeCard" tổng kết thực tế cuối buổi; nếu advanceStage = false (khách gọi thêm món / hỏi thêm câu phụ chưa kết thúc), để "outcomeCard": null.'
    : ''
}

CHỈ TRẢ VỀ JSON HỢP LỆ (không bọc markdown):
{
  "candidateTranscript": "string",
  "advanceStage": boolean,
  "replyJa": "string (1-3 câu tiếng Nhật của ${aiRoleLabel})",
  "replyReading": "string (hiragana/katakana)",
  "replyVi": "string (dịch tiếng Việt tự nhiên)",
  "outcomeCard": ${
    willFinish && isRoleplay
      ? '{ "title": "string", "items": ["string"], "noteVi": "string" } | null'
      : 'null'
  },
  "evaluation": {
    "keigoScore": number,
    "grammarScore": number,
    "naturalScore": number,
    "contentScore": number,
    "structureScore": number,
    "framework": "${framework}",
    "frameworkChecklist": [
      { "code": "string", "label": "string", "met": boolean }
    ],
    "fillersDetected": ["string"],
    "fluencyNoteVi": "string",
    "betterJapanese": "string (câu sửa lại cho ${learnerRoleLabel})",
    "feedbackVi": "string (nhận xét câu của ${learnerRoleLabel})"
  }
}`;

  const historyText = input.history
    .slice(-10)
    .map((h) => `${h.role === 'interviewer' ? aiRoleLabel : learnerRoleLabel}: ${h.text}`)
    .join('\n');

  const hasAudio = Boolean(input.audioBase64 && input.audioBase64.length > 20);
  const userPrompt = hasAudio
    ? `Lịch sử hội thoại:\n${historyText || '(Mở đầu)'}\n\n${learnerRoleLabel} vừa trả lời trực tiếp bằng ĐOẠN GHI ÂM đính kèm. Hãy nghe kỹ giọng nói, phát hiện mọi từ đệm/ấp úng, chép lại vào candidateTranscript, chấm điểm câu nói của ${learnerRoleLabel} và phản hồi tiếp với vai ${aiRoleLabel}.`
    : `Lịch sử hội thoại:\n${historyText || '(Mở đầu)'}\n\n${learnerRoleLabel} vừa nói: ${candidateText}`;

  const parts: Array<Record<string, unknown>> = [{ text: `${systemPrompt}\n\n${userPrompt}` }];
  if (hasAudio && input.audioBase64) {
    parts.push({
      inlineData: {
        mimeType: input.audioMimeType || 'audio/webm',
        data: input.audioBase64,
      },
    });
  }

  const parsed = await callGeminiJson<Partial<InterviewTurnResponse>>(parts);
  const resolvedCandidateText = parsed.candidateTranscript?.trim() || candidateText;
  const resolvedAdvance = parsed.advanceStage !== false;
  const effectiveNextStage = resolvedAdvance ? nextStage : input.stage;
  const effectiveFinished = resolvedAdvance && willFinish;
  const fillersFromResolved = detectTextFillers(resolvedCandidateText);

  const rawChecklist = parsed.evaluation?.frameworkChecklist;
  const normalizedChecklist: FrameworkCheckItem[] =
    Array.isArray(rawChecklist) && rawChecklist.length === 4
      ? rawChecklist.map((item, idx) => ({
          code: item?.code || templateChecklist[idx]!.code,
          label: item?.label || templateChecklist[idx]!.label,
          met: Boolean(item?.met),
        }))
      : templateChecklist;

  const mergedFillers = [
    ...new Set([
      ...detectedFillers,
      ...fillersFromResolved,
      ...(Array.isArray(parsed.evaluation?.fillersDetected)
        ? parsed.evaluation!.fillersDetected.filter((x): x is string => typeof x === 'string')
        : []),
    ]),
  ];

  const rawOutcome = effectiveFinished ? parsed.outcomeCard : undefined;
  const outcomeCard: DynamicOutcomeCard | undefined =
    rawOutcome && typeof rawOutcome.title === 'string' && rawOutcome.title.trim()
      ? {
          title: rawOutcome.title.trim(),
          items: Array.isArray(rawOutcome.items)
            ? rawOutcome.items.map((x) => String(x)).filter(Boolean).slice(0, 8)
            : [],
          noteVi: String(rawOutcome.noteVi ?? '').trim(),
        }
      : undefined;

  return {
    candidateTranscript: resolvedCandidateText,
    advanceStage: resolvedAdvance,
    replyJa:
      parsed.replyJa?.trim() ||
      'ありがとうございます。もう少し詳しく教えていただけますか。',
    replyReading: parsed.replyReading?.trim() || '',
    replyVi: parsed.replyVi?.trim() || 'Cảm ơn bạn. Bạn có thể chia sẻ chi tiết hơn không?',
    nextStage: effectiveNextStage,
    finished: effectiveFinished,
    outcomeCard,
    evaluation: {
      keigoScore: clampScore(parsed.evaluation?.keigoScore, 78),
      grammarScore: clampScore(parsed.evaluation?.grammarScore, 80),
      naturalScore: clampScore(parsed.evaluation?.naturalScore, 76),
      contentScore: clampScore(parsed.evaluation?.contentScore, 80),
      structureScore: clampScore(parsed.evaluation?.structureScore, 72),
      framework,
      frameworkChecklist: normalizedChecklist,
      fillersDetected: mergedFillers,
      fluencyNoteVi:
        parsed.evaluation?.fluencyNoteVi?.trim() ||
        (mergedFillers.length > 0
          ? `Phát hiện từ đệm (${mergedFillers.join(', ')}) — hãy dừng nhẹ im lặng thay vì nói từ đệm.`
          : 'Diễn đạt trôi chảy, không mắc lỗi từ đệm (フィラー).'),
      betterJapanese: parsed.evaluation?.betterJapanese?.trim() || resolvedCandidateText,
      feedbackVi:
        parsed.evaluation?.feedbackVi?.trim() ||
        `Hãy cố gắng trình bày đủ cấu trúc ${framework} để nhà tuyển dụng Nhật dễ nắm bắt ý chính.`,
    },
  };
}
