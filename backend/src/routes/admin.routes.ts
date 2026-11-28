import type { FastifyPluginAsync } from 'fastify';
import {
  handleAdminAddLessonItem,
  handleAdminAddMaterialLink,
  handleAdminAdjustPoints,
  handleAdminBulkAddLessonItems,
  handleAdminCreateGrammarBlitz,
  handleAdminCreateGrammarPoint,
  handleAdminCreateGrammarStar,
  handleAdminCreateLesson,
  handleAdminCreateOrder,
  handleAdminCreateShadowingVideo,
  handleAdminDeleteGrammarBlitz,
  handleAdminDeleteGrammarPoint,
  handleAdminDeleteGrammarStar,
  handleAdminDeleteLesson,
  handleAdminDeleteLessonItem,
  handleAdminDeleteMaterial,
  handleAdminDeleteShadowingVideo,
  handleAdminGetLesson,
  handleAdminGetSubscriptionDetail,
  handleAdminListGrammarBlitz,
  handleAdminListGrammarPoints,
  handleAdminListGrammarStar,
  handleAdminListLessons,
  handleAdminListOrders,
  handleAdminListPlans,
  handleAdminListShadowingVideos,
  handleAdminListSubscriptions,
  handleAdminListUsers,
  handleAdminOverview,
  handleAdminResetPlan,
  handleAdminSetSubscription,
  handleAdminUpdateGrammarBlitz,
  handleAdminUpdateGrammarPoint,
  handleAdminUpdateGrammarStar,
  handleAdminUpdateLesson,
  handleAdminUpdateLessonItem,
  handleAdminUpdateOrder,
  handleAdminUpdatePlan,
  handleAdminUpdateShadowingVideo,
  handleAdminUpdateUserBan,
  handleAdminUpdateUserRole,
  handleAdminUploadMaterialFile,
} from '../controllers/admin.controller.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/admin/overview', handleAdminOverview);

  app.get('/admin/orders', handleAdminListOrders);
  app.post('/admin/orders', handleAdminCreateOrder);
  app.patch('/admin/orders/:id', handleAdminUpdateOrder);

  app.get('/admin/subscriptions', handleAdminListSubscriptions);
  app.get('/admin/subscriptions/:userId', handleAdminGetSubscriptionDetail);

  app.get('/admin/plans', handleAdminListPlans);
  app.patch('/admin/plans/:tier', handleAdminUpdatePlan);
  app.post('/admin/plans/:tier/reset', handleAdminResetPlan);

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
  app.patch('/admin/lessons/:id/items/:itemId', handleAdminUpdateLessonItem);
  app.delete('/admin/lessons/:id/items/:itemId', handleAdminDeleteLessonItem);

  app.post(
    '/admin/lessons/:id/materials/file',
    { bodyLimit: 24 * 1024 * 1024 },
    handleAdminUploadMaterialFile,
  );
  app.post('/admin/lessons/:id/materials/link', handleAdminAddMaterialLink);
  app.delete('/admin/lessons/:id/materials/:materialId', handleAdminDeleteMaterial);

  app.get('/admin/shadowing', handleAdminListShadowingVideos);
  app.post('/admin/shadowing', handleAdminCreateShadowingVideo);
  app.patch('/admin/shadowing/:id', handleAdminUpdateShadowingVideo);
  app.delete('/admin/shadowing/:id', handleAdminDeleteShadowingVideo);

  app.get('/admin/grammar', handleAdminListGrammarPoints);
  app.post('/admin/grammar', handleAdminCreateGrammarPoint);
  app.patch('/admin/grammar/:id', handleAdminUpdateGrammarPoint);
  app.delete('/admin/grammar/:id', handleAdminDeleteGrammarPoint);

  app.get('/admin/grammar/star', handleAdminListGrammarStar);
  app.post('/admin/grammar/star', handleAdminCreateGrammarStar);
  app.patch('/admin/grammar/star/:id', handleAdminUpdateGrammarStar);
  app.delete('/admin/grammar/star/:id', handleAdminDeleteGrammarStar);

  app.get('/admin/grammar/blitz', handleAdminListGrammarBlitz);
  app.post('/admin/grammar/blitz', handleAdminCreateGrammarBlitz);
  app.patch('/admin/grammar/blitz/:id', handleAdminUpdateGrammarBlitz);
  app.delete('/admin/grammar/blitz/:id', handleAdminDeleteGrammarBlitz);
};
