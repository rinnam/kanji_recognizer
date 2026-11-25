import type { FastifyPluginAsync } from 'fastify';
import {
  analyzeSentence,
  getTranscript,
  getVideoLibrary,
  recognizeKanji,
  saveVideoLibrary,
  translateSentence,
} from '../controllers/transcript.controller.js';

export const transcriptRoutes: FastifyPluginAsync = async (app) => {
  app.get('/transcript', getTranscript);
  app.get('/transcript/translate', translateSentence);
  app.get('/transcript/library', getVideoLibrary);
  app.post('/transcript/library', saveVideoLibrary);
  app.post('/analyze', analyzeSentence);
  app.post('/kanji/recognize', recognizeKanji);
};
