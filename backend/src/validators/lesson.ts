import { z } from 'zod';

export const jlptLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1']);
export const lessonAccessTierSchema = z.enum(['free', 'plus', 'pro']);
export const lessonStatusSchema = z.enum(['draft', 'published']);

export const adminLessonsQuerySchema = z.object({
  level: z.enum(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1']).default('ALL'),
  status: z.enum(['all', 'draft', 'published']).default('all'),
});

export const createLessonSchema = z.object({
  title: z.string().trim().min(2, 'Tiêu đề cần ít nhất 2 ký tự').max(200),
  jlptLevel: jlptLevelSchema,
  category: z.string().trim().min(1).max(80).default('Từ vựng'),
  summary: z.string().trim().max(500).default(''),
  contentMd: z.string().max(50_000).default(''),
  accessTier: lessonAccessTierSchema.default('free'),
  status: lessonStatusSchema.default('published'),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const updateLessonSchema = createLessonSchema.partial();

export const createLessonItemSchema = z.object({
  word: z.string().trim().min(1, 'Từ tiếng Nhật không được trống').max(200),
  reading: z.string().trim().max(200).nullable().optional(),
  meaning: z.string().trim().min(1, 'Nghĩa không được trống').max(500),
  sinoVietnamese: z.string().trim().max(200).nullable().optional(),
  example: z.string().trim().max(1000).nullable().optional(),
  exampleMeaning: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const bulkLessonItemsSchema = z.object({
  items: z.array(createLessonItemSchema).min(1).max(500),
});

export const uploadLessonMaterialFileSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề tài liệu không được trống').max(200),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(160),
  base64Data: z.string().min(4),
  description: z.string().trim().max(500).default(''),
});

export const addLessonMaterialLinkSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề tài liệu không được trống').max(200),
  externalUrl: z
    .string()
    .trim()
    .url('URL tài liệu không hợp lệ')
    .refine((u) => /^https?:\/\//i.test(u), {
      message: 'Liên kết chỉ chấp nhận http:// hoặc https://',
    }),
  description: z.string().trim().max(500).default(''),
});

export const publicLessonsQuerySchema = z.object({
  level: z.enum(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1']).default('ALL'),
});
