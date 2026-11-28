import { z } from 'zod';

export const grammarLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1']);

export const grammarCategorySchema = z.enum([
  'time_sequence',
  'cause_result',
  'purpose_habit',
  'condition_scope',
  'contrast',
  'compound_particle',
  'inference_quote',
  'state_attitude',
]);

export const grammarStatusSchema = z.enum(['published', 'hidden']);

export const grammarExampleSchema = z.object({
  ja: z.string().trim().min(1, 'Câu ví dụ tiếng Nhật không được trống.').max(400),
  reading: z.string().trim().max(400).default(''),
  vi: z.string().trim().min(1, 'Nghĩa ví dụ không được trống.').max(400),
});

export const adminGrammarQuerySchema = z.object({
  level: z.enum(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1']).default('ALL'),
  category: z.string().trim().max(60).optional().default('ALL'),
  status: z.enum(['all', 'published', 'hidden']).default('all'),
  q: z.string().trim().max(120).optional().default(''),
});

export const adminBlitzQuerySchema = adminGrammarQuerySchema.extend({
  kind: z.enum(['all', 'particle', 'conjugation']).default('all'),
});

export const createGrammarPointSchema = z.object({
  level: grammarLevelSchema,
  category: grammarCategorySchema,
  pattern: z.string().trim().min(1, 'Mẫu ngữ pháp không được trống.').max(200),
  structure: z.string().trim().min(1, 'Cấu trúc không được trống.').max(400),
  meaningVi: z.string().trim().min(1, 'Nghĩa tiếng Việt không được trống.').max(500),
  nuanceVi: z.string().trim().max(1000).optional().default(''),
  examples: z.array(grammarExampleSchema).max(10).default([]),
  status: grammarStatusSchema.default('published'),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const updateGrammarPointSchema = createGrammarPointSchema.partial();

export const createGrammarStarSchema = z.object({
  level: grammarLevelSchema,
  meaningVi: z.string().trim().min(1, 'Nghĩa câu không được trống.').max(400),
  prefixJa: z.string().trim().max(200).optional().default(''),
  suffixJa: z.string().trim().max(200).optional().default(''),
  parts: z.tuple([
    z.string().trim().min(1, 'Mảnh 1 không được trống.').max(120),
    z.string().trim().min(1, 'Mảnh 2 không được trống.').max(120),
    z.string().trim().min(1, 'Mảnh 3 không được trống.').max(120),
    z.string().trim().min(1, 'Mảnh 4 không được trống.').max(120),
  ]),
  starIndex: z.coerce.number().int().min(0).max(3),
  explanationVi: z.string().trim().max(600).optional().default(''),
  status: grammarStatusSchema.default('published'),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const updateGrammarStarSchema = createGrammarStarSchema.partial();

export const createGrammarBlitzSchema = z.object({
  kind: z.enum(['particle', 'conjugation']),
  level: grammarLevelSchema,
  promptMain: z.string().trim().min(1, 'Câu hỏi chính không được trống.').max(300),
  promptSub: z.string().trim().max(200).optional().default(''),
  meaningVi: z.string().trim().min(1, 'Nghĩa không được trống.').max(400),
  correct: z.string().trim().min(1, 'Đáp án đúng không được trống.').max(120),
  choices: z.tuple([
    z.string().trim().min(1, 'Lựa chọn 1 không được trống.').max(120),
    z.string().trim().min(1, 'Lựa chọn 2 không được trống.').max(120),
    z.string().trim().min(1, 'Lựa chọn 3 không được trống.').max(120),
    z.string().trim().min(1, 'Lựa chọn 4 không được trống.').max(120),
  ]),
  tipVi: z.string().trim().max(600).optional().default(''),
  status: grammarStatusSchema.default('published'),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const updateGrammarBlitzSchema = createGrammarBlitzSchema.partial();

export const publicGrammarQuerySchema = z.object({
  level: z.enum(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1']).default('ALL'),
});
