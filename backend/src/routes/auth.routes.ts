import type { FastifyPluginAsync } from 'fastify';
import { handleLogin, handleMe, handleRegister } from '../controllers/auth.controller.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', handleRegister);
  app.post('/auth/login', handleLogin);
  app.get('/auth/me', handleMe);
};
