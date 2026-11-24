import { z } from 'zod';

export const transcriptQuerySchema = z.object({
  id: z.string().min(1, 'id không được để trống'),
});

export const analyzeBodySchema = z.object({
  text: z.string().min(1, 'text không được để trống'),
});
