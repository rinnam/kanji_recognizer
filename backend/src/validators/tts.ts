import { z } from 'zod';

export const ttsQuerySchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Text is required')
    .max(200, 'Text must be at most 200 characters'),
});

export type TtsQuery = z.infer<typeof ttsQuerySchema>;
