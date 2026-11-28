import type { FastifyPluginAsync } from 'fastify';
import {
  handleAdminLogin,
  handleGetStudyState,
  handleLogin,
  handleMe,
  handlePutStudyState,
  handleRegister,
} from '../controllers/auth.controller.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', handleRegister);
  app.post('/auth/login', handleLogin);
  app.post('/auth/admin/login', handleAdminLogin);
  app.get('/auth/me', handleMe);
  app.get('/auth/study-state', handleGetStudyState);
  app.put('/auth/study-state', handlePutStudyState);
};
