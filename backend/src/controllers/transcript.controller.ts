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
