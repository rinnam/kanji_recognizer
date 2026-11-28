import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createManualOrder,
  getAdminOverview,
  listAdminUsers,
  listPaymentOrders,
  updatePaymentOrderStatus,
  updateUserBan,
  updateUserRole,
} from '../services/admin.service.js';
import {
  addLessonItem,
  addLessonMaterialLink,
  bulkAddLessonItems,
  createLesson,
  deleteLesson,
  deleteLessonItem,
  deleteLessonMaterial,
  getAdminLessonDetail,
  listAdminLessons,
  updateLesson,
  uploadLessonMaterialFile,
} from '../services/lesson.service.js';
import {
  adminAdjustUserKs,
  adminSetUserSubscription,
} from '../services/membership.service.js';
import { requireAdminUser } from '../utils/admin-guard.js';
import {
  adminAdjustPointsSchema,
  adminCreateOrderSchema,
  adminOrdersQuerySchema,
  adminOverviewQuerySchema,
  adminSetSubscriptionSchema,
  adminUpdateOrderSchema,
  adminUpdateUserBanSchema,
  adminUpdateUserRoleSchema,
  adminUsersQuerySchema,
} from '../validators/admin.js';
import {
  addLessonMaterialLinkSchema,
  adminLessonsQuerySchema,
  bulkLessonItemsSchema,
  createLessonItemSchema,
  createLessonSchema,
  updateLessonSchema,
  uploadLessonMaterialFileSchema,
} from '../validators/lesson.js';

export async function handleAdminOverview(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const parsed = adminOverviewQuerySchema.parse(req.query ?? {});
  const data = await getAdminOverview(parsed);
  return reply.send(data);
}

export async function handleAdminListOrders(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const parsed = adminOrdersQuerySchema.parse(req.query ?? {});
  const data = await listPaymentOrders(parsed);
  return reply.send(data);
}

export async function handleAdminCreateOrder(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const parsed = adminCreateOrderSchema.parse(req.body ?? {});
  const result = await createManualOrder(admin.id, parsed);
  return reply.status(201).send(result);
}

export async function handleAdminUpdateOrder(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = adminUpdateOrderSchema.parse(req.body ?? {});
  const result = await updatePaymentOrderStatus(admin.id, id, parsed);
  return reply.send(result);
}

export async function handleAdminListUsers(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const parsed = adminUsersQuerySchema.parse(req.query ?? {});
  const data = await listAdminUsers(parsed);
  return reply.send(data);
}

export async function handleAdminUpdateUserRole(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = adminUpdateUserRoleSchema.parse(req.body ?? {});
  const result = await updateUserRole(admin.id, id, parsed.role);
  return reply.send(result);
}

export async function handleAdminUpdateUserBan(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = adminUpdateUserBanSchema.parse(req.body ?? {});
  const result = await updateUserBan(admin.id, id, parsed.isBanned);
  return reply.send(result);
}

export async function handleAdminSetSubscription(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = adminSetSubscriptionSchema.parse(req.body ?? {});
  const result = await adminSetUserSubscription({
    adminId: admin.id,
    targetUserId: id,
    ...parsed,
  });
  return reply.send(result);
}

export async function handleAdminAdjustPoints(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = adminAdjustPointsSchema.parse(req.body ?? {});
  const result = await adminAdjustUserKs({
    adminId: admin.id,
    targetUserId: id,
    delta: parsed.delta,
    reason: parsed.reason,
  });
  return reply.send(result);
}

export async function handleAdminListLessons(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const parsed = adminLessonsQuerySchema.parse(req.query ?? {});
  const data = await listAdminLessons(parsed);
  return reply.send(data);
}

export async function handleAdminCreateLesson(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const parsed = createLessonSchema.parse(req.body ?? {});
  const lesson = await createLesson(admin.id, parsed);
  return reply.status(201).send({ lesson });
}

export async function handleAdminGetLesson(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const detail = await getAdminLessonDetail(id);
  return reply.send(detail);
}

export async function handleAdminUpdateLesson(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = updateLessonSchema.parse(req.body ?? {});
  const lesson = await updateLesson(admin.id, id, parsed);
  return reply.send({ lesson });
}

export async function handleAdminDeleteLesson(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const result = await deleteLesson(admin.id, id);
  return reply.send(result);
}

export async function handleAdminAddLessonItem(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = createLessonItemSchema.parse(req.body ?? {});
  const item = await addLessonItem(id, parsed);
  return reply.status(201).send({ item });
}

export async function handleAdminBulkAddLessonItems(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = bulkLessonItemsSchema.parse(req.body ?? {});
  const result = await bulkAddLessonItems(admin.id, id, parsed.items);
  return reply.status(201).send(result);
}

export async function handleAdminDeleteLessonItem(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id, itemId } = req.params as { id: string; itemId: string };
  const result = await deleteLessonItem(id, itemId);
  return reply.send(result);
}

export async function handleAdminUploadMaterialFile(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = uploadLessonMaterialFileSchema.parse(req.body ?? {});
  const material = await uploadLessonMaterialFile(admin.id, id, parsed);
  return reply.status(201).send({ material });
}

export async function handleAdminAddMaterialLink(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id } = req.params as { id: string };
  const parsed = addLessonMaterialLinkSchema.parse(req.body ?? {});
  const material = await addLessonMaterialLink(admin.id, id, parsed);
  return reply.status(201).send({ material });
}

export async function handleAdminDeleteMaterial(req: FastifyRequest, reply: FastifyReply) {
  const admin = await requireAdminUser(req, reply);
  if (!admin) return;
  const { id, materialId } = req.params as { id: string; materialId: string };
  const result = await deleteLessonMaterial(admin.id, id, materialId);
  return reply.send(result);
}
