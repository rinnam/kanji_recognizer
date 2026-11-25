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

export async function runInterviewTurn(input: {
  scenarioId: string;
  stage: InterviewStage;
  history: InterviewHistoryItem[];
  userMessage: string;
  cvSummary?: string | undefined;
  action?: 'knock' | 'bow' | 'speak' | undefined;
}): Promise<InterviewTurnResponse> {
  const scenario =
    INTERVIEW_SCENARIOS.find((s) => s.id === input.scenarioId) ?? INTERVIEW_SCENARIOS[0]!;
  const cvText = input.cvSummary?.trim() || scenario.defaultCv;
  const candidateText = input.userMessage.trim();

  const nextStage = getNextStage(input.stage);
  const willFinish = input.stage === 'reverse_question' || input.stage === 'closing';

  if (!env.GEMINI_API_KEY) {
    const fallbackReplies: Record<InterviewStage, { ja: string; reading: string; vi: string }> = {
      jikoshokai: {
        ja: 'ありがとうございます。次に、あなたの強みや自己PRを教えていただけますか。',
        reading: 'ありがとうございます。つぎに、あなたのつよみやじこぴーあーるをおしえていただけますか。',
        vi: 'Cảm ơn bạn. Tiếp theo, hãy cho tôi biết điểm mạnh / tự PR (自己PR) của bạn nhé.',
      },
      jiko_pr: {
        ja: '素晴らしい強みですね。履歴書を拝見しましたが、一番力を入れた経験やプロジェクトについて詳しく教えてください。',
        reading: 'すばらしいつよみですね。りれきしょをはいけんしましたが、いちばんちからをいれたけいけんについてくわしくおしえてください。',
        vi: 'Điểm mạnh rất tốt. Tôi đã xem qua CV của bạn, hãy kể chi tiết về dự án/kinh nghiệm bạn tâm đắc nhất nhé.',
      },
      cv_q1: {
        ja: 'なるほど、よく分かりました。その経験を活かして、なぜ弊社を志望されたのか教えていただけますか。',
        reading: 'なるほど、よくわかりました。そのけいけんをいかして、なぜへいしゃをしぼうされたのかおしえていただけますか。',
        vi: 'Tôi hiểu rồi. Với kinh nghiệm đó, tại sao bạn lại ứng tuyển vào công ty chúng tôi?',
      },
      cv_q2: {
        ja: 'ありがとうございます。これまでの活動の中で一番大変だったことと、それをどう乗り越えたかも教えてください。',
        reading: 'ありがとうございます。これまでのかつどうのなかでいちばんたいへんだったことと、それをどうのりこえたかおしえてください。',
        vi: 'Cảm ơn bạn. Hãy chia sẻ khó khăn lớn nhất bạn từng gặp và cách bạn vượt qua nó.',
      },
      cv_q3: {
        ja: 'よく分かりました。最後に、弊社について何かご質問はありますか。',
        reading: 'よくわかりました。さいごに、へいしゃについてなにかごしつもんはありますか。',
        vi: 'Tôi đã rõ. Cuối cùng, bạn có câu hỏi nào dành cho công ty chúng tôi không?',
      },
      reverse_question: {
        ja: 'ご質問ありがとうございます。チームで助け合いながら成長できる環境ですのでご安心ください。本日の面接は以上となります。本日はありがとうございました。',
        reading: 'ごしつもんありがとうございます。ほんじつのめんせつはいじょうとなります。ほんじつはありがとうございました。',
        vi: 'Cảm ơn câu hỏi của bạn. Môi trường của chúng tôi luôn hỗ trợ nhau phát triển. Buổi phỏng vấn hôm nay đến đây là kết thúc. Cảm ơn bạn rất nhiều.',
      },
      closing: {
        ja: '本日はありがとうございました。お気をつけてお帰りください。',
        reading: 'ほんじつはありがとうございました。おきをつけておかえりください。',
        vi: 'Cảm ơn bạn hôm nay. Chúc bạn về bình an.',
      },
    };
    const fb = fallbackReplies[input.stage];
    return {
      replyJa: fb.ja,
      replyReading: fb.reading,
      replyVi: fb.vi,
      nextStage,
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

  const stageInstruction = STAGE_INSTRUCTIONS[input.stage];

  const systemPrompt = `Bạn là nhà tuyển dụng Nhật Bản tên ${scenario.interviewerName} (${scenario.interviewerRole}) tại ${scenario.companyName}.
Kịch bản: ${scenario.title} (Trình độ ${scenario.level}).
Nội dung CV / 履歴書 của ứng viên:
"""
${cvText}
"""

Lượt hiện tại ứng viên vừa trả lời thuộc bước: "${input.stage}".
CHỈ DẪN BẮT BUỘC CHO LƯỢT NÀY:
${stageInstruction}

Quy tắc chấm điểm & phản hồi:
1. Câu nói của nhà tuyển dụng (replyJa): 1-3 câu tiếng Nhật lịch sự tự nhiên đúng văn phong phỏng vấn Nhật, KHÔNG lặp lại câu hỏi đã hỏi ở lịch sử.
2. Chấm điểm câu trả lời vừa rồi của ứng viên (0-100):
   - keigoScore: Mức độ dùng kính ngữ / thể lịch sự です・ます / khiêm nhường ngữ.
   - grammarScore: Độ chính xác ngữ pháp.
   - naturalScore: Độ tự nhiên khi nói phỏng vấn Nhật.
   - contentScore: Mức độ trả lời đúng trọng tâm câu hỏi.
3. betterJapanese: Viết lại câu trả lời của ứng viên thành phiên bản tiếng Nhật chuẩn, tự nhiên và lịch sự hơn để ứng viên học theo.
4. feedbackVi: Nhận xét & chỉ rõ lỗi cần sửa (1-2 câu ngắn gọn bằng tiếng Việt).

CHỈ TRẢ VỀ JSON HỢP LỆ (không bọc markdown):
{
  "replyJa": "string",
  "replyReading": "string (toàn bộ bằng hiragana/katakana)",
  "replyVi": "string (dịch tiếng Việt tự nhiên)",
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
    .slice(-10)
    .map((h) => `${h.role === 'interviewer' ? 'Nhà tuyển dụng' : 'Ứng viên'}: ${h.text}`)
    .join('\n');

  const userPrompt = `Lịch sử buổi phỏng vấn:\n${historyText || '(Mở đầu)'}\n\nỨng viên vừa trả lời: ${candidateText}`;

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
      betterJapanese: parsed.evaluation?.betterJapanese?.trim() || candidateText,
      feedbackVi:
        parsed.evaluation?.feedbackVi?.trim() ||
        'Câu trả lời rõ ràng, hãy chú ý dùng thể lịch sự です/ます hoặc kính ngữ khi phỏng vấn.',
    },
  };
}
