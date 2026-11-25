import type { FastifyReply, FastifyRequest } from 'fastify';
import { fetchVideoTranscript } from '../services/transcript.service.js';
import { tokenizeText } from '../services/tokenizer.service.js';
import { recognizeKanjiStrokes } from '../services/kanji-recognizer.service.js';
import { analyzeBodySchema, transcriptQuerySchema } from '../validators/transcript.js';

export async function getTranscript(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const query = transcriptQuerySchema.parse(req.query);

  try {
    const data = await fetchVideoTranscript(query.id);
    void reply.send(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Không tải được phụ đề';
    void reply.code(400).send({
      error: 'TranscriptError',
      message,
    });
  }
}

export async function analyzeSentence(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = analyzeBodySchema.parse(req.body);

  try {
    const tokens = await tokenizeText(body.text);
    void reply.send({ text: body.text, tokens });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi phân tích câu';
    void reply.code(400).send({
      error: 'AnalyzeError',
      message,
    });
  }
}

export async function recognizeKanji(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = req.body as { strokes?: number[][][] };
  if (!body || !Array.isArray(body.strokes)) {
    void reply.code(400).send({
      error: 'ValidationError',
      message: 'Dữ liệu nét vẽ strokes không hợp lệ',
    });
    return;
  }

  try {
    const candidates = recognizeKanjiStrokes(body.strokes);
    void reply.send({ candidates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi nhận diện nét vẽ';
    void reply.code(500).send({
      error: 'RecognizeError',
      message,
    });
  }
}

const translationCache = new Map<string, string>();

export async function translateSentence(
  req: { query: unknown },
  reply: { status: (code: number) => { send: (body: unknown) => unknown }; send: (body: unknown) => unknown },
) {
  const q = req.query as { text?: string };
  const text = typeof q?.text === 'string' ? q.text.trim() : '';
  if (!text) {
    return reply.status(400).send({ message: 'Thiếu tham số text.' });
  }
  const cached = translationCache.get(text);
  if (cached !== undefined) {
    return reply.send({ translation: cached });
  }
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return reply.status(502).send({ message: 'Không gọi được dịch vụ dịch.' });
    }
    const data = (await resp.json()) as unknown[];
    const segments = Array.isArray(data[0]) ? (data[0] as unknown[][]) : [];
    const translation = segments.map((s) => (typeof s[0] === 'string' ? s[0] : '')).join('').trim();
    translationCache.set(text, translation);
    return reply.send({ translation });
  } catch {
    return reply.status(502).send({ message: 'Lỗi kết nối dịch tiếng Việt.' });
  }
}
