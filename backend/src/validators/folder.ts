import { z } from 'zod';

/** Chuỗi ISO datetime (client gửi created_at/updated_at). */
const isoDateTime = z.string().datetime({ offset: true });

export const createFolderSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, 'name is required'),
  parentId: z.string().min(1).nullable().optional(),
  order: z.number().int().nullable().optional(),
  createdAt: isoDateTime.optional(),
  updatedAt: isoDateTime.optional(),
});

export const updateFolderSchema = z
  .object({
    name: z.string().min(1).optional(),
    parentId: z.string().min(1).nullable().optional(),
    order: z.number().int().nullable().optional(),
    updatedAt: isoDateTime.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const listFoldersQuerySchema = z.object({
  parentId: z.string().min(1).optional(),
});

export const folderIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type ListFoldersQuery = z.infer<typeof listFoldersQuerySchema>;
