import { env } from '../config/env.js';

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

export interface InterviewEvaluation {
  keigoScore: number;
  grammarScore: number;
  naturalScore: number;
  contentScore: number;
  structureScore: number;
  framework: 'PREP' | 'STAR';
  frameworkChecklist: FrameworkCheckItem[];
  fillersDetected: string[];
  fluencyNoteVi: string;
  betterJapanese: string;
  feedbackVi: string;
}

export interface InterviewTurnResponse {
  replyJa: string;
  replyReading: string;
  replyVi: string;
  nextStage: InterviewStage;
  finished: boolean;
  evaluation: InterviewEvaluation;
}

export interface ParsedCvResponse {
  summary: string;
  focusTopics: string[];
}

export interface TranscribedAudioResponse {
  transcript: string;
  fillers: string[];
}

const GEMINI_MODEL_CHAIN = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
] as const;

export const INTERVIEW_SCENARIOS: InterviewScenario[] = [
  {
    id: 'it_engineer',
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

const FILLER_REGEX =
  /(えー+と|えっと|あのー+|あのお|うー+ん|そのー+|まあ|なんか|えー+|あー+|umm+|uh+|à+|ờ+)/gi;

export function detectTextFillers(text: string): string[] {
  const matches = text.match(FILLER_REGEX) ?? [];
  return [...new Set(matches.map((m) => m.trim()).filter(Boolean))];
}

function expectedFrameworkForStage(stage: InterviewStage): 'PREP' | 'STAR' {
  return stage === 'cv_q1' || stage === 'cv_q3' ? 'STAR' : 'PREP';
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

async function callGeminiJson<T>(parts: Array<Record<string, unknown>>): Promise<T> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing in backend/.env');
  }
  let lastErr = 'Unknown Gemini error';
  for (const model of GEMINI_MODEL_CHAIN) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        lastErr = `${model} HTTP ${res.status}: ${errText.slice(0, 160)}`;
        if (res.status === 503 || res.status === 429 || res.status === 404 || res.status >= 500) {
          continue;
        }
        throw new Error(lastErr);
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`All Gemini models failed: ${lastErr}`);
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

/** Transcribes spoken Japanese audio using Gemini Flash, preserving verbatim fillers (えーと, あのー, うーん...). */
export async function transcribeInterviewAudio(input: {
  mimeType: string;
  base64Data: string;
}): Promise<TranscribedAudioResponse> {
  const prompt = `Hãy chép lời (transcribe) chính xác đoạn ghi âm tiếng Nhật phỏng vấn sau đây.
QUAN TRỌNG:
- Giữ nguyên NGUYÊN VĂN tất cả từ đệm / tiếng ấp úng nếu người nói có phát ra (ví dụ: えーと, えっと, あのー, うーん, そのー, まあ, なんか, à, ờ).
- Liệt kê các từ đệm / tiếng ấp úng nghe được vào mảng "fillers".

CHỈ TRẢ VỀ JSON HỢP LỆ:
{
  "transcript": "string (tiếng Nhật người dùng vừa nói, giữ nguyên từ đệm)",
  "fillers": ["string"]
}`;

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
  const regexFillers = detectTextFillers(transcript);
  const fillers = [...new Set([...aiFillers, ...regexFillers])];

  return { transcript, fillers };
}

export async function runInterviewTurn(input: {
  scenarioId: string;
  stage: InterviewStage;
  history: InterviewHistoryItem[];
  userMessage: string;
  cvSummary?: string | undefined;
  fillersFromAudio?: string[] | undefined;
  action?: 'knock' | 'bow' | 'speak' | undefined;
}): Promise<InterviewTurnResponse> {
  const scenario =
    INTERVIEW_SCENARIOS.find((s) => s.id === input.scenarioId) ?? INTERVIEW_SCENARIOS[0]!;
  const cvText = input.cvSummary?.trim() || scenario.defaultCv;
  const candidateText = input.userMessage.trim();
  const framework = expectedFrameworkForStage(input.stage);
  const templateChecklist = framework === 'STAR' ? STAR_TEMPLATE : PREP_TEMPLATE;

  const detectedFillers = [
    ...new Set([...(input.fillersFromAudio ?? []), ...detectTextFillers(candidateText)]),
  ];

  const nextStage = getNextStage(input.stage);
  const willFinish = input.stage === 'reverse_question' || input.stage === 'closing';

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

  const stageInstruction = STAGE_INSTRUCTIONS[input.stage];
  const frameworkSpec =
    framework === 'STAR'
      ? 'STAR: S (Bối cảnh - Situation), T (Nhiệm vụ - Task), A (Hành động của riêng ứng viên - Action), R (Kết quả cụ thể - Result)'
      : 'PREP: P (Kết luận trước - Point), R (Lý do - Reason), E (Ví dụ/bằng chứng cụ thể - Example), P (Chốt lại - Point)';

  const systemPrompt = `Bạn là nhà tuyển dụng Nhật Bản tên ${scenario.interviewerName} (${scenario.interviewerRole}) tại ${scenario.companyName}.
Kịch bản: ${scenario.title} (Trình độ ${scenario.level}).
Nội dung CV / 履歴書 THẬT của ứng viên:
"""
${cvText}
"""

Lượt hiện tại ứng viên vừa trả lời thuộc bước: "${input.stage}".
CHỈ DẪN BẮT BUỘC CHO LƯỢT NÀY:
${stageInstruction}

CHẤM ĐIỂM CHUYÊN SÂU:
1. Đánh giá cấu trúc câu trả lời theo khung **${framework}** (${frameworkSpec}): kiểm tra từng yếu tố (met: true/false) và chấm structureScore (0-100).
2. Phát hiện từ đệm / ấp úng (フィラー như えーと, あのー, うーん, そのー, まあ, à, ờ) có trong câu nói (hệ thống đã sơ bộ phát hiện: ${JSON.stringify(detectedFillers)}). Viết fluencyNoteVi nhận xét ngắn gọn độ trôi chảy & cách khắc phục từ đệm.
3. Chấm keigoScore, grammarScore, naturalScore, contentScore (0-100).
4. Viết betterJapanese: phiên bản trả lời tiếng Nhật lịch sự hơn, theo đúng cấu trúc ${framework} và không có từ đệm.
5. Viết feedbackVi: nhận xét & sửa lỗi cụ thể 1-2 câu bằng tiếng Việt (nêu rõ thiếu phần nào của ${framework} nếu có).

CHỈ TRẢ VỀ JSON HỢP LỆ (không bọc markdown):
{
  "replyJa": "string (1-3 câu tiếng Nhật lịch sự của nhà tuyển dụng)",
  "replyReading": "string (hiragana/katakana)",
  "replyVi": "string (dịch tiếng Việt)",
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
    "betterJapanese": "string",
    "feedbackVi": "string"
  }
}`;

  const historyText = input.history
    .slice(-10)
    .map((h) => `${h.role === 'interviewer' ? 'Nhà tuyển dụng' : 'Ứng viên'}: ${h.text}`)
    .join('\n');

  const userPrompt = `Lịch sử buổi phỏng vấn:\n${historyText || '(Mở đầu)'}\n\nỨng viên vừa trả lời: ${candidateText}`;

  const parsed = await callGeminiJson<Partial<InterviewTurnResponse>>([
    { text: `${systemPrompt}\n\n${userPrompt}` },
  ]);

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
      ...(Array.isArray(parsed.evaluation?.fillersDetected)
        ? parsed.evaluation!.fillersDetected.filter((x): x is string => typeof x === 'string')
        : []),
    ]),
  ];

  return {
    replyJa:
      parsed.replyJa?.trim() ||
      'ありがとうございます。もう少し詳しく教えていただけますか。',
    replyReading: parsed.replyReading?.trim() || '',
    replyVi: parsed.replyVi?.trim() || 'Cảm ơn bạn. Bạn có thể chia sẻ chi tiết hơn không?',
    nextStage,
    finished: willFinish,
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
      betterJapanese: parsed.evaluation?.betterJapanese?.trim() || candidateText,
      feedbackVi:
        parsed.evaluation?.feedbackVi?.trim() ||
        `Hãy cố gắng trình bày đủ cấu trúc ${framework} để nhà tuyển dụng Nhật dễ nắm bắt ý chính.`,
    },
  };
}
