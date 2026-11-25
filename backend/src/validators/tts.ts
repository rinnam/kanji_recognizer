import { z } from 'zod';

export const ttsQuerySchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Text is required')
    .max(500, 'Text must be at most 500 characters'),
  full: z.enum(['0', '1']).optional(),
});

export type TtsQuery = z.infer<typeof ttsQuerySchema>;
