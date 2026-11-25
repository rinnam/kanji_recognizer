import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { recognizeKanjiStrokes } from '../services/kanji.service.js';

const recognizeSchema = z.object({
  strokes: z.array(z.array(z.array(z.number()))).min(1),
});

export const kanjiRoutes: FastifyPluginAsync = async (app) => {
  app.post('/kanji/recognize', async (req, reply) => {
    const parsed = recognizeSchema.parse(req.body);
    const candidates = await recognizeKanjiStrokes(parsed.strokes);
    return reply.send({ candidates });
  });
};
