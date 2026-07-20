import { z } from 'zod';

export const GetNewsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
    limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 10)),
    search: z.string().optional(),
    category: z.string().optional(),
    sortBy: z.enum(['publishedAt', 'title']).optional().default('publishedAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export const BookmarkArticleSchema = z.object({
  params: z.object({
    articleId: z.string().uuid({ message: 'Invalid article identifier format. Must be a UUIDv4.' }),
  }),
});

export type GetNewsInput = z.infer<typeof GetNewsSchema>;
export type BookmarkArticleInput = z.infer<typeof BookmarkArticleSchema>;