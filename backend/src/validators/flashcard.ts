import { z } from 'zod';

/** 4 nút đánh giá SM-2 (ánh xạ q: Again=0, Hard=3, Good=4, Easy=5). */
export const srsRatingSchema = z.enum(['again', 'hard', 'good', 'easy']);

/** Query hàng đợi ôn: giới hạn số thẻ trả về. */
export const dueQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(50),
});

/** Body khi người học đánh giá một thẻ. */
export const reviewBodySchema = z.object({
  rating: srsRatingSchema,
});

export const flashcardIdParamSchema = z.object({
  id: z.string().min(1),
});

export type DueQuery = z.infer<typeof dueQuerySchema>;
export type ReviewBody = z.infer<typeof reviewBodySchema>;
