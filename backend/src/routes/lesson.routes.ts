import type { FastifyPluginAsync } from 'fastify';
import {
  handleDownloadMaterialFile,
  handlePublicGetLesson,
  handlePublicListLessons,
  handleSaveLessonToFlashcards,
} from '../controllers/lesson.controller.js';

export const lessonRoutes: FastifyPluginAsync = async (app) => {
  app.get('/lessons', handlePublicListLessons);
  app.get('/lessons/:id', handlePublicGetLesson);
  app.get('/lessons/materials/:materialId/file', handleDownloadMaterialFile);
  app.post('/lessons/:id/save-flashcards', handleSaveLessonToFlashcards);
};
