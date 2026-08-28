import { z } from 'zod';

export const listSkillsRequest = z.object({
  params: z.object({}).strict(),
  query: z.object({ q: z.string().trim().max(80).default(''), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict(),
  body: z.undefined().optional(),
});
