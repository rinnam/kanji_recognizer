import { z } from 'zod';

/** Chuỗi ISO datetime có offset (client sinh created_at/updated_at/deleted_at). */
const isoDateTime = z.string().datetime({ offset: true });
const jlptLevel = z.enum(['N1', 'N2', 'N3', 'N4', 'N5']);

/** Query cho pull: `since` tùy chọn (nếu bỏ trống → trả toàn bộ). */
export const pullQuerySchema = z.object({
  since: isoDateTime.optional(),
});

/**
 * Một folder client đẩy lên (push). Timestamps do client sở hữu khi đồng bộ.
 * Giữ nguyên quy ước field của validators/vocabulary.ts (ISO datetime + N1..N5).
 */
export const folderPushSchema = z.object({
  id: z.string().min(1, 'id is required'),
  name: z.string().min(1, 'name is required'),
  parentId: z.string().min(1).nullable(),
  order: z.number().int().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable().optional(),
});

/** Một vocabulary client đẩy lên (push). */
export const vocabularyPushSchema = z.object({
  id: z.string().min(1, 'id is required'),
  word: z.string().min(1, 'word is required'),
  meaning: z.string().min(1, 'meaning is required'),
  reading: z.string().nullable().optional(),
  sinoVietnamese: z.string().nullable().optional(),
  example: z.string().nullable().optional(),
  exampleMeaning: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  jlptLevel: jlptLevel.nullable().optional(),
  srsInterval: z.number().int().nullable().optional(),
  srsRepetition: z.number().int().nullable().optional(),
  srsEaseFactor: z.number().min(1.3).nullable().optional(),
  srsNextReview: isoDateTime.nullable().optional(),
  folderIds: z.array(z.string().min(1)).optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable().optional(),
});

/** Body cho push: cả folders & vocabularies đều tùy chọn (có thể rỗng). */
export const pushBodySchema = z.object({
  folders: z.array(folderPushSchema).optional(),
  vocabularies: z.array(vocabularyPushSchema).optional(),
});

export type PullQuery = z.infer<typeof pullQuerySchema>;
export type FolderPushItem = z.infer<typeof folderPushSchema>;
export type VocabularyPushItem = z.infer<typeof vocabularyPushSchema>;
export type PushBody = z.infer<typeof pushBodySchema>;
