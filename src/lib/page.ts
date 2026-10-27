import { z } from 'zod';

export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    has_more: z.boolean(),
  });
}

export type Page<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
};
