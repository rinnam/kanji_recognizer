import { z } from 'zod';

const isoDateTime = z.string().datetime({ offset: true });
const jlptLevel = z.enum(['N1', 'N2', 'N3', 'N4', 'N5']);

export const createVocabularySchema = z.object({
  id: z.string().min(1).optional(),
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
  createdAt: isoDateTime.optional(),
  updatedAt: isoDateTime.optional(),
});

export const updateVocabularySchema = z
  .object({
    word: z.string().min(1).optional(),
    meaning: z.string().min(1).optional(),
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
    updatedAt: isoDateTime.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const listVocabulariesQuerySchema = z.object({
  folderId: z.string().min(1).optional(),
  jlptLevel: jlptLevel.optional(),
  search: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const vocabularyIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateVocabularyInput = z.infer<typeof createVocabularySchema>;
export type UpdateVocabularyInput = z.infer<typeof updateVocabularySchema>;
export type ListVocabulariesQuery = z.infer<typeof listVocabulariesQuerySchema>;
