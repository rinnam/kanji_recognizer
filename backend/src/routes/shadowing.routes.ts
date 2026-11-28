import type { FastifyPluginAsync } from 'fastify';
import {
  handleDeleteUserShadowingVideo,
  handleListPublicShadowingVideos,
  handleSaveUserShadowingVideo,
} from '../controllers/shadowing.controller.js';

export const shadowingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/shadowing/videos', handleListPublicShadowingVideos);
  app.post('/shadowing/my-videos', handleSaveUserShadowingVideo);
  app.delete('/shadowing/my-videos/:videoId', handleDeleteUserShadowingVideo);
};
