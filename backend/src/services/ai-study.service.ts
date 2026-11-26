import { db } from '../config/database.js';
import { callGeminiJson } from './gemini-client.js';

const DEFAULT_OWNER_ID = '00000000-0000-4000-8000-000000000000';

// ─── #1 AI Reading from SRS Vocabularies ────────────────────────────────────

export interface ReadingQuestion {
  questionJa: string;
  options: string[];
  correctIndex: number;
  explanationVi: string;
}

export interface GeneratedReadingPassage {
  titleJa: string;
  titleVi: string;
  level: string;
  genre: string;
  passageJa: string;
  readingKana: string;
  translationVi: string;
  targetWords: Array<{ id?: string; word: string; reading: string; meaning: string }>;
  questions: ReadingQuestion[];
}

export async function generateSrsReading(input: {
  userId?: string | undefined;
  level: string;
  genre: string;
  folderId?: string | undefined;
}): Promise<GeneratedReadingPassage> {
  const ownerId = input.userId || DEFAULT_OWNER_ID;

  const rows = input.folderId
    ? await db
        .selectFrom('vocabularies')
        .innerJoin('vocabulary_folders', 'vocabulary_folders.vocabulary_id', 'vocabularies.id')
        .select([
          'vocabularies.id',
          'vocabularies.word',
          'vocabularies.reading',
          'vocabularies.meaning',
          'vocabularies.srs_repetition',
          'vocabularies.srs_next_review',
        ])
        .where('vocabularies.owner_id', '=', ownerId)
        .where('vocabularies.deleted_at', 'is', null)
        .where('vocabulary_folders.folder_id', '=', input.folderId)
        .orderBy('vocabularies.srs_next_review', 'asc')
        .orderBy('vocabularies.srs_repetition', 'asc')
        .limit(6)
        .execute()
    : await db
        .selectFrom('vocabularies')
        .select(['id', 'word', 'reading', 'meaning', 'srs_repetition', 'srs_next_review'])
        .where('owner_id', '=', ownerId)
        .where('deleted_at', 'is', null)
        .orderBy('srs_next_review', 'asc')
        .orderBy('srs_repetition', 'asc')
        .limit(6)
        .execute();

  const targetWords =
    rows.length > 0
      ? rows.map((r) => ({
          id: r.id,
          word: r.word,
          reading: r.reading ?? '',
          meaning: r.meaning,
        }))
      : [
          { word: '準備', reading: 'じゅんび', meaning: 'chuẩn bị' },
          { word: '経験', reading: 'けいけん', meaning: 'kinh nghiệm' },
          { word: '確認', reading: 'かくにん', meaning: 'xác nhận' },
          { word: '連絡', reading: 'れんらく', meaning: 'liên lạc' },
          { word: '大切', reading: 'たいせつ', meaning: 'quan trọng' },
        ];

  const wordListPrompt = targetWords
    .map((w) => `- ${w.word} (${w.reading}): ${w.meaning}`)
    .join('\n');

  const prompt = `Bạn là giáo viên tiếng Nhật luyện thi JLPT chuyên nghiệp.
Hãy sáng tác MỘT bài đọc hiểu tiếng Nhật theo yêu cầu sau:
- Cấp độ JLPT: ${input.level}
- Thể loại: ${input.genre} (ví dụ: Đoản văn, Email công sở, Tin tức ngắn, hoặc Hội thoại đời sống)
- BẮT BUỘC lồng khéo léo TẤT CẢ các từ vựng mục tiêu sau vào trong bài đọc (giữ đúng dạng chữ Kanji của từ):
${wordListPrompt}

Yêu cầu độ dài bài đọc: khoảng 180–260 ký tự tiếng Nhật (tự nhiên, mạch lạc, đúng văn phong Nhật).
Tạo đúng 3 câu hỏi đọc hiểu trắc nghiệm 4 lựa chọn (A/B/C/D) chuẩn JLPT kèm giải thích đáp án bằng tiếng Việt.

CHỈ TRẢ VỀ JSON HỢP LỆ (không bọc markdown):
{
  "titleJa": "string",
  "titleVi": "string",
  "passageJa": "string (bài đọc tiếng Nhật)",
  "readingKana": "string (phiên âm hiragana/katakana của bài đọc)",
  "translationVi": "string (bản dịch tiếng Việt mượt mà)",
  "questions": [
    {
      "questionJa": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanationVi": "string"
    }
  ]
}`;

  const parsed = await callGeminiJson<Partial<GeneratedReadingPassage>>([{ text: prompt }], {
    temperature: 0.55,
    maxOutputTokens: 2048,
    timeoutMs: 25000,
  });

  const questions: ReadingQuestion[] = Array.isArray(parsed.questions)
    ? parsed.questions.slice(0, 3).map((q) => ({
        questionJa: q?.questionJa?.trim() || '本文の内容と合っているものはどれですか。',
        options:
          Array.isArray(q?.options) && q.options.length >= 2
            ? q.options.slice(0, 4).map((o) => String(o))
            : ['はい', 'いいえ', '分かりません', 'どちらでもない'],
        correctIndex:
          typeof q?.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
            ? q.correctIndex
            : 0,
        explanationVi: q?.explanationVi?.trim() || 'Xem lại thông tin trong bài đọc.',
      }))
    : [];

  return {
    titleJa: parsed.titleJa?.trim() || '日本語の読解練習',
    titleVi: parsed.titleVi?.trim() || 'Bài luyện đọc hiểu tiếng Nhật',
    level: input.level,
    genre: input.genre,
    passageJa: parsed.passageJa?.trim() || '',
    readingKana: parsed.readingKana?.trim() || '',
    translationVi: parsed.translationVi?.trim() || '',
    targetWords,
    questions,
  };
}

/**
 * Marks the reading passage's SRS vocabularies as reviewed (SM-2 "good" grade)
 * inside a DB transaction, pushing srs_next_review forward & bumping updated_at for sync.
 */
export async function markReadingSrsReviewed(input: {
  userId?: string | undefined;
  vocabularyIds: string[];
}): Promise<{
  updatedCount: number;
  updatedWords: Array<{ id: string; word: string; nextIntervalDays: number }>;
}> {
  const ownerId = input.userId || DEFAULT_OWNER_ID;
  const ids = [...new Set(input.vocabularyIds)];
  if (ids.length === 0) return { updatedCount: 0, updatedWords: [] };

  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  return db.transaction().execute(async (trx) => {
    const rows = await trx
      .selectFrom('vocabularies')
      .select(['id', 'word', 'srs_repetition', 'srs_interval', 'srs_ease_factor'])
      .where('owner_id', '=', ownerId)
      .where('deleted_at', 'is', null)
      .where('id', 'in', ids)
      .execute();

    const updatedWords: Array<{ id: string; word: string; nextIntervalDays: number }> = [];

    for (const row of rows) {
      const rep = Number(row.srs_repetition ?? 0);
      const ease = Math.max(1.3, Number(row.srs_ease_factor ?? 2.5));
      const prevInterval = Math.max(0, Number(row.srs_interval ?? 0));
      const nextRep = rep + 1;
      const nextInterval =
        nextRep === 1 ? 1 : nextRep === 2 ? 6 : Math.max(1, Math.round(prevInterval * ease));
      const nextReview = new Date(now.getTime() + nextInterval * DAY_MS);

      await trx
        .updateTable('vocabularies')
        .set({
          srs_repetition: nextRep,
          srs_interval: nextInterval,
          srs_next_review: nextReview,
          updated_at: now,
        })
        .where('id', '=', row.id)
        .where('owner_id', '=', ownerId)
        .execute();

      updatedWords.push({ id: row.id, word: row.word, nextIntervalDays: nextInterval });
    }

    return { updatedCount: rows.length, updatedWords };
  });
}

// ─── #2 AI Writing & Business Email Sensei Grader ───────────────────────────

export interface WritingCorrection {
  original: string;
  fixed: string;
  reasonVi: string;
}

export interface GradedWritingResult {
  totalScore: number;
  scores: {
    grammar: number;
    keigo: number;
    vocabulary: number;
    naturalness: number;
  };
  corrections: WritingCorrection[];
  improvedJa: string;
  improvedVi: string;
  summaryVi: string;
}

function clamp100(v: unknown, fallback = 75): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function gradeJapaneseWriting(input: {
  promptTitle: string;
  style: string;
  text: string;
}): Promise<GradedWritingResult> {
  const prompt = `Bạn là giáo viên tiếng Nhật (Sensei) chuyên sửa bài viết và Business Email (ビジネスメール).
Đề bài: ${input.promptTitle}
Phong cách yêu cầu: ${input.style}
Bài viết của học viên:
"""
${input.text.trim()}
"""

Hãy chấm điểm bài viết trên thang 100 (ngữ pháp, kính ngữ Keigo, từ vựng, độ tự nhiên bản xứ), liệt kê các lỗi cần sửa (mỗi lỗi ghi rõ câu gốc -> câu sửa -> lý do ngắn gọn bằng tiếng Việt), và viết lại toàn bộ bài viết ở phiên bản chuẩn tự nhiên như người Nhật viết.

CHỈ TRẢ VỀ JSON HỢP LỆ (không bọc markdown):
{
  "totalScore": number,
  "scores": {
    "grammar": number,
    "keigo": number,
    "vocabulary": number,
    "naturalness": number
  },
  "corrections": [
    { "original": "string", "fixed": "string", "reasonVi": "string" }
  ],
  "improvedJa": "string (bản viết lại chuẩn người Nhật)",
  "improvedVi": "string (dịch tiếng Việt của bản chuẩn)",
  "summaryVi": "string (nhận xét tổng quan 2-3 câu tiếng Việt)"
}`;

  const parsed = await callGeminiJson<Partial<GradedWritingResult>>([{ text: prompt }], {
    temperature: 0.35,
    maxOutputTokens: 1800,
  });

  const grammar = clamp100(parsed.scores?.grammar, 78);
  const keigo = clamp100(parsed.scores?.keigo, 75);
  const vocabulary = clamp100(parsed.scores?.vocabulary, 78);
  const naturalness = clamp100(parsed.scores?.naturalness, 75);
  const computedTotal = Math.round((grammar + keigo + vocabulary + naturalness) / 4);

  return {
    totalScore: clamp100(parsed.totalScore, computedTotal),
    scores: { grammar, keigo, vocabulary, naturalness },
    corrections: Array.isArray(parsed.corrections)
      ? parsed.corrections
          .filter((c) => c && (c.original || c.fixed))
          .slice(0, 8)
          .map((c) => ({
            original: String(c.original ?? ''),
            fixed: String(c.fixed ?? ''),
            reasonVi: String(c.reasonVi ?? ''),
          }))
      : [],
    improvedJa: parsed.improvedJa?.trim() || input.text.trim(),
    improvedVi: parsed.improvedVi?.trim() || '',
    summaryVi: parsed.summaryVi?.trim() || 'Bài viết truyền đạt được ý chính, hãy tham khảo bản sửa chuẩn bản xứ bên dưới.',
  };
}

// ─── #3 AI Flashcard Extraction (Image / Text) & Kanji Mnemonics ────────────

export interface ExtractedFlashcard {
  word: string;
  reading: string;
  meaning: string;
  sinoVietnamese: string;
  jlptLevel: string;
  example: string;
  exampleMeaning: string;
}

export async function extractFlashcardsWithAi(input: {
  text?: string | undefined;
  imageBase64?: string | undefined;
  mimeType?: string | undefined;
  maxCards?: number | undefined;
}): Promise<ExtractedFlashcard[]> {
  const limit = Math.max(3, Math.min(20, input.maxCards ?? 12));
  const prompt = `Bạn là chuyên gia biên soạn Flashcard tiếng Nhật cho người Việt.
Hãy trích xuất tối đa ${limit} từ vựng / ngữ pháp tiếng Nhật quan trọng nhất từ tài liệu / hình ảnh đính kèm.
Mỗi từ BẮT BUỘC có đủ:
- word: chữ Nhật (Kanji/Kana)
- reading: cách đọc Hiragana/Katakana
- meaning: nghĩa tiếng Việt ngắn gọn, chính xác
- sinoVietnamese: âm Hán Việt IN HOA (nếu có Kanji, vd: "CHUẨN BỊ", không có thì để "")
- jlptLevel: "N5" | "N4" | "N3" | "N2" | "N1"
- example: 1 câu ví dụ ngắn bằng tiếng Nhật
- exampleMeaning: nghĩa tiếng Việt của câu ví dụ

CHỈ TRẢ VỀ JSON HỢP LỆ (không bọc markdown):
{
  "cards": [
    {
      "word": "string",
      "reading": "string",
      "meaning": "string",
      "sinoVietnamese": "string",
      "jlptLevel": "N3",
      "example": "string",
      "exampleMeaning": "string"
    }
  ]
}`;

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (input.text?.trim()) {
    parts.push({ text: `Nội dung văn bản:\n${input.text.trim().slice(0, 8000)}` });
  }
  if (input.imageBase64 && input.imageBase64.length > 20) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType || 'image/jpeg',
        data: input.imageBase64,
      },
    });
  }

  const parsed = await callGeminiJson<{ cards?: Partial<ExtractedFlashcard>[] }>(parts, {
    temperature: 0.3,
    maxOutputTokens: 2400,
    timeoutMs: 25000,
  });

  if (!Array.isArray(parsed.cards)) return [];
  return parsed.cards
    .filter((c) => c && typeof c.word === 'string' && c.word.trim().length > 0)
    .slice(0, limit)
    .map((c) => ({
      word: c.word!.trim(),
      reading: String(c.reading ?? '').trim(),
      meaning: String(c.meaning ?? '').trim(),
      sinoVietnamese: String(c.sinoVietnamese ?? '').trim().toUpperCase(),
      jlptLevel: String(c.jlptLevel ?? 'N3').trim(),
      example: String(c.example ?? '').trim(),
      exampleMeaning: String(c.exampleMeaning ?? '').trim(),
    }));
}

export interface KanjiMnemonicResult {
  word: string;
  radicalBreakdown: string;
  storyVi: string;
  usageTipVi: string;
}

const mnemonicCache = new Map<string, { expiresAt: number; data: KanjiMnemonicResult }>();

export async function generateKanjiMnemonic(input: {
  word: string;
  reading?: string | undefined;
  meaning?: string | undefined;
}): Promise<KanjiMnemonicResult> {
  const key = input.word.trim();
  const cached = mnemonicCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const prompt = `Hãy tạo mẹo nhớ nhanh (Mnemonic) bằng tiếng Việt cho từ tiếng Nhật sau để học viên dễ nhớ lâu khi học Flashcard:
- Từ: ${key}
- Cách đọc: ${input.reading || '(không rõ)'}
- Nghĩa: ${input.meaning || '(không rõ)'}

CHỈ TRẢ VỀ JSON HỢP LỆ (không bọc markdown):
{
  "radicalBreakdown": "Tách ngắn gọn các bộ thủ / thành phần chữ Hán (1 dòng)",
  "storyVi": "Câu chuyện liên tưởng thú vị, dễ nhớ bằng tiếng Việt (1-2 câu ngắn)",
  "usageTipVi": "Lưu ý sắc thái hoặc phân biệt nhanh với từ dễ nhầm (1 câu ngắn)"
}`;

  const parsed = await callGeminiJson<Partial<KanjiMnemonicResult>>([{ text: prompt }], {
    temperature: 0.5,
    maxOutputTokens: 512,
  });

  const data: KanjiMnemonicResult = {
    word: key,
    radicalBreakdown: parsed.radicalBreakdown?.trim() || '',
    storyVi: parsed.storyVi?.trim() || 'Hãy liên kết âm Hán Việt và hình ảnh thực tế khi dùng từ này.',
    usageTipVi: parsed.usageTipVi?.trim() || '',
  };

  mnemonicCache.set(key, { expiresAt: Date.now() + 60 * 60 * 1000, data });
  return data;
}
