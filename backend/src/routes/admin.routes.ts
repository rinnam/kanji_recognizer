import type { FastifyPluginAsync } from 'fastify';
import {
  handleAdminAddLessonItem,
  handleAdminAddMaterialLink,
  handleAdminAdjustPoints,
  handleAdminBulkAddLessonItems,
  handleAdminCreateLesson,
  handleAdminCreateOrder,
  handleAdminDeleteLesson,
  handleAdminDeleteLessonItem,
  handleAdminDeleteMaterial,
  handleAdminGetLesson,
  handleAdminListLessons,
  handleAdminListOrders,
  handleAdminListUsers,
  handleAdminOverview,
  handleAdminSetSubscription,
  handleAdminUpdateLesson,
  handleAdminUpdateOrder,
  handleAdminUpdateUserBan,
  handleAdminUpdateUserRole,
  handleAdminUploadMaterialFile,
} from '../controllers/admin.controller.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/admin/overview', handleAdminOverview);

  app.get('/admin/orders', handleAdminListOrders);
  app.post('/admin/orders', handleAdminCreateOrder);
  app.patch('/admin/orders/:id', handleAdminUpdateOrder);

  app.get('/admin/users', handleAdminListUsers);
  app.patch('/admin/users/:id/role', handleAdminUpdateUserRole);
  app.patch('/admin/users/:id/ban', handleAdminUpdateUserBan);
  app.post('/admin/users/:id/subscription', handleAdminSetSubscription);
  app.post('/admin/users/:id/points', handleAdminAdjustPoints);

  app.get('/admin/lessons', handleAdminListLessons);
  app.post('/admin/lessons', handleAdminCreateLesson);
  app.get('/admin/lessons/:id', handleAdminGetLesson);
  app.patch('/admin/lessons/:id', handleAdminUpdateLesson);
  app.delete('/admin/lessons/:id', handleAdminDeleteLesson);

  app.post('/admin/lessons/:id/items', handleAdminAddLessonItem);
  app.post('/admin/lessons/:id/items/bulk', handleAdminBulkAddLessonItems);
  app.delete('/admin/lessons/:id/items/:itemId', handleAdminDeleteLessonItem);

  app.post(
    '/admin/lessons/:id/materials/file',
    { bodyLimit: 24 * 1024 * 1024 },
    handleAdminUploadMaterialFile,
  );
  app.post('/admin/lessons/:id/materials/link', handleAdminAddMaterialLink);
  app.delete('/admin/lessons/:id/materials/:materialId', handleAdminDeleteMaterial);
};
