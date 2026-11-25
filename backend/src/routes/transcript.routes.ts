import type { FastifyPluginAsync } from 'fastify';
import { analyzeSentence, getTranscript, recognizeKanji, translateSentence } from '../controllers/transcript.controller.js';

export const transcriptRoutes: FastifyPluginAsync = async (app) => {
  app.get('/transcript', getTranscript);
  app.get('/transcript/translate', translateSentence);
  app.post('/analyze', analyzeSentence);
  app.post('/kanji/recognize', recognizeKanji);
};
