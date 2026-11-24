import type { FastifyPluginAsync } from 'fastify';
import { analyzeSentence, getTranscript, recognizeKanji } from '../controllers/transcript.controller.js';

export const transcriptRoutes: FastifyPluginAsync = async (app) => {
  app.get('/transcript', getTranscript);
  app.post('/analyze', analyzeSentence);
  app.post('/kanji/recognize', recognizeKanji);
};
