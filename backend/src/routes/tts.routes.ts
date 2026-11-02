import type { FastifyPluginAsync } from 'fastify';
import { getTtsAudio } from '../controllers/tts.controller.js';

export const ttsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/tts', getTtsAudio);
};
