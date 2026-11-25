import { env } from '../config/env.js';

export type InterviewStage = 'entrance' | 'self_intro' | 'motivation' | 'situational' | 'closing';

export interface InterviewScenario {
  id: string;
  title: string;
  companyName: string;
  interviewerName: string;
  interviewerRole: string;
  level: string;
  description: string;
  openingJa: string;
  openingReading: string;
  openingVi: string;
}

export interface InterviewHistoryItem {
  role: 'interviewer' | 'candidate';
  text: string;
}

export interface InterviewEvaluation {
  keigoScore: number;
  grammarScore: number;
  naturalScore: number;
  contentScore: number;
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

export const INTERVIEW_SCENARIOS: InterviewScenario[] = [
  {
    id: 'baito',
    title: 'Phỏng vấn làm thêm (アルバイト)',
    companyName: 'Sakura Coffee Tokyo',
    interviewerName: 'Tanaka Kenji (田中 健二)',
    interviewerRole: 'Quản lý cửa hàng (店長)',
    level: 'N4 – N3',
    description: 'Luyện tác phong chào hỏi, giới thiệu bản thân, lịch làm việc và xử lý tình huống với khách hàng.',
    openingJa: 'こんにちは。本日はお越しいただきありがとうございます。どうぞおかけください。まず、簡単に自己紹介をお願いします。',
    openingReading: 'こんにちは。ほんじつはおこしいただきありがとうございます。どうぞおかけください。まず、かんたんにじこしょうかいをおねがいします。',
    openingVi: 'Xin chào. Cảm ơn bạn hôm nay đã đến. Mời bạn ngồi. Trước tiên, hãy giới thiệu ngắn gọn về bản thân bạn nhé.',
  },
  {
    id: 'it_engineer',
    title: 'Phỏng vấn Kỹ sư IT (ITエンジニア)',
    companyName: 'Mirai Tech Japan Inc.',
    interviewerName: 'Sato Yuki (佐藤 由紀)',
    interviewerRole: 'Trưởng phòng Kỹ thuật (開発部長)',
    level: 'N3 – N2',
    description: 'Phỏng vấn công ty công nghệ Nhật: kinh nghiệm dự án, lý do chọn Nhật Bản và cách làm việc nhóm.',
    openingJa: '本日は面接にお越しいただき、ありがとうございます。開発部の佐藤と申します。それでは、自己紹介とこれまでの経験について教えていただけますか。',
    openingReading: 'ほんじつはめんせつにおこしいただき、ありがとうございます。かいはつぶのさとうともうします。それでは、じこしょうかいとこれまでのけいけんについておしえていただけますか。',
    openingVi: 'Cảm ơn bạn hôm nay đã đến buổi phỏng vấn. Tôi là Sato thuộc phòng Phát triển. Bạn có thể giới thiệu bản thân và kinh nghiệm trước đây của mình không?',
  },
  {
    id: 'study_abroad',
    title: 'Phỏng vấn Du học / Trường Nhật ngữ',
    companyName: 'Học viện Nhật ngữ Kibou',
    interviewerName: 'Yamada Haruo (山田 春夫)',
    interviewerRole: 'Cán bộ tuyển sinh (入試担当)',
    level: 'N4 – N3',
    description: 'Luyện trả lời mục tiêu du học, kế hoạch học tập và lý do yêu thích tiếng Nhật.',
    openingJa: 'こんにちは。本日は面接にご参加いただきありがとうございます。はじめに、お名前と日本語を勉強しようと思ったきっかけを教えてください。',
    openingReading: 'こんにちは。ほんじつはめんせつにごさんかいただきありがとうございます。はじめに、おなまえとにほんごをべんきょうしようとおもったきっかけをおしえてください。',
    openingVi: 'Xin chào. Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Trước hết, hãy cho tôi biết tên bạn và cơ duyên khiến bạn muốn học tiếng Nhật.',
  },
];

const STAGE_ORDER: InterviewStage[] = [
  'entrance',
  'self_intro',
  'motivation',
  'situational',
  'closing',
];

function getNextStage(current: InterviewStage): InterviewStage {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return 'closing';
  return STAGE_ORDER[idx + 1] ?? 'closing';
}

function clampScore(v: unknown, fallback = 75): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function runInterviewTurn(input: {
  scenarioId: string;
  stage: InterviewStage;
  history: InterviewHistoryItem[];
  userMessage: string;
  action?: 'knock' | 'bow' | 'speak' | undefined;
}): Promise<InterviewTurnResponse> {
  const scenario =
    INTERVIEW_SCENARIOS.find((s) => s.id === input.scenarioId) ?? INTERVIEW_SCENARIOS[0]!;
  const candidateText =
    input.action === 'knock'
      ? '（ノックして）失礼いたします。'
      : input.action === 'bow'
        ? '（お辞儀をして）よろしくお願いいたします。'
        : input.userMessage.trim();

  const suggestedNext = getNextStage(input.stage);
  const willFinish = input.stage === 'closing';

  if (!env.GEMINI_API_KEY) {
    return {
      replyJa: willFinish
        ? '本日はありがとうございました。結果は後日ご連絡いたします。お気をつけてお帰りください。'
        : 'ありがとうございます。とても分かりやすかったです。では次に、志望動機を教えていただけますか。',
      replyReading: willFinish
        ? 'ほんじつはありがとうございました。けっかはごじつごれんらくいたします。おきをつけておかえりください。'
        : 'ありがとうございます。とてもわかりやすかったです。ではつぎに、しぼうどうきをおしえていただけますか。',
      replyVi: willFinish
        ? 'Cảm ơn bạn hôm nay. Kết quả sẽ được thông báo sau. Chúc bạn về bình an.'
        : 'Cảm ơn bạn, rất dễ hiểu. Tiếp theo, bạn có thể cho biết lý do ứng tuyển không?',
      nextStage: suggestedNext,
      finished: willFinish,
      evaluation: {
        keigoScore: 80,
        grammarScore: 80,
        naturalScore: 78,
        contentScore: 82,
        betterJapanese: candidateText || 'よろしくお願いいたします。',
        feedbackVi: 'Chưa cấu hình GEMINI_API_KEY trong backend/.env — đang chạy chế độ mẫu.',
      },
    };
  }

  const systemPrompt = `Bạn là nhà tuyển dụng Nhật Bản tên ${scenario.interviewerName} (${scenario.interviewerRole}) tại ${scenario.companyName}.
Kịch bản: ${scenario.title} (${scenario.level}).
Chặng hiện tại: ${input.stage}. Chặng tiếp theo gợi ý: ${suggestedNext}.
Quy trình 5 chặng chuẩn Nhật: entrance (vào phòng) -> self_intro (tự giới thiệu) -> motivation (lý do ứng tuyển) -> situational (câu hỏi tình huống) -> closing (câu hỏi ngược & kết thúc).

Nhiệm vụ:
1. Đọc câu trả lời của ứng viên và lịch sử hội thoại.
2. Đóng vai nhà tuyển dụng Nhật Bản lịch sự, chuyên nghiệp để phản hồi tự nhiên bằng tiếng Nhật (1-2 câu ngắn gọn, rõ ràng, phù hợp trình độ ${scenario.level}) và dẫn sang câu hỏi tiếp theo (nếu stage là "closing" thì chào kết thúc buổi phỏng vấn và đặt finished: true).
3. Chấm điểm câu trả lời của ứng viên (0-100) theo 4 tiêu chí: keigoScore (kính ngữ & lễ nghi), grammarScore (ngữ pháp), naturalScore (độ tự nhiên văn nói), contentScore (nội dung).
4. Viết betterJapanese (câu nói tiếng Nhật chuẩn & lịch sự hơn ứng viên nên dùng) và feedbackVi (nhận xét & sửa lỗi ngắn gọn 1-2 câu bằng tiếng Việt).

CHỈ TRẢ VỀ JSON HỢP LỆ theo đúng schema sau (không bọc markdown):
{
  "replyJa": "string",
  "replyReading": "string (toàn bộ bằng hiragana/katakana)",
  "replyVi": "string (dịch tiếng Việt)",
  "nextStage": "entrance | self_intro | motivation | situational | closing",
  "finished": boolean,
  "evaluation": {
    "keigoScore": number,
    "grammarScore": number,
    "naturalScore": number,
    "contentScore": number,
    "betterJapanese": "string",
    "feedbackVi": "string"
  }
}`;

  const historyText = input.history
    .slice(-8)
    .map((h) => `${h.role === 'interviewer' ? 'Nhà tuyển dụng' : 'Ứng viên'}: ${h.text}`)
    .join('\n');

  const userPrompt = `Lịch sử gần đây:\n${historyText || '(Bắt đầu buổi phỏng vấn)'}\n\nỨng viên vừa nói/làm: ${candidateText}`;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<InterviewTurnResponse>;

  const nextStage = STAGE_ORDER.includes(parsed.nextStage as InterviewStage)
    ? (parsed.nextStage as InterviewStage)
    : suggestedNext;

  return {
    replyJa:
      parsed.replyJa?.trim() ||
      'ありがとうございます。もう少し詳しく教えていただけますか。',
    replyReading: parsed.replyReading?.trim() || '',
    replyVi: parsed.replyVi?.trim() || 'Cảm ơn bạn. Bạn có thể chia sẻ chi tiết hơn không?',
    nextStage,
    finished: Boolean(parsed.finished ?? willFinish),
    evaluation: {
      keigoScore: clampScore(parsed.evaluation?.keigoScore, 78),
      grammarScore: clampScore(parsed.evaluation?.grammarScore, 80),
      naturalScore: clampScore(parsed.evaluation?.naturalScore, 76),
      contentScore: clampScore(parsed.evaluation?.contentScore, 80),
      betterJapanese: parsed.evaluation?.betterJapanese?.trim() || candidateText,
      feedbackVi:
        parsed.evaluation?.feedbackVi?.trim() ||
        'Câu trả lời rõ ràng, hãy chú ý dùng thể lịch sự です/ます hoặc kính ngữ khi phỏng vấn.',
    },
  };
}
