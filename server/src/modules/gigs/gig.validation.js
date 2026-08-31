import { z } from 'zod';

const empty = z.object({}).strict();
const noBody = z.union([z.undefined(), empty]).optional();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const optionalText = (max) => z.string().trim().max(max).transform((value) => value || undefined).optional();
const skillRequirement = z.object({ skillId: objectId, level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']), required: z.boolean().default(true) }).strict();
const budget = z.object({ type: z.enum(['FIXED', 'RANGE', 'UNPAID']), minMinor: z.number().int().min(0).optional(), maxMinor: z.number().int().min(0).optional(), currency: z.string().trim().length(3).toUpperCase().optional() }).strict()
  .superRefine((value, context) => {
    if (value.type === 'UNPAID' && (value.minMinor !== undefined || value.maxMinor !== undefined || value.currency)) context.addIssue({ code: 'custom', message: 'Unpaid gigs cannot include monetary values' });
    if (value.type !== 'UNPAID' && (!value.currency || value.minMinor === undefined)) context.addIssue({ code: 'custom', message: 'Paid gigs require currency and an amount' });
    if (value.type === 'RANGE' && (value.maxMinor === undefined || value.maxMinor < value.minMinor)) context.addIssue({ code: 'custom', path: ['maxMinor'], message: 'Range maximum must be at least the minimum' });
  });
const gigFields = {
  title: z.string().trim().min(5).max(180), description: z.string().trim().min(20).max(10000), category: z.string().trim().min(2).max(80),
  skillRequirements: z.array(skillRequirement).max(20).refine((items) => new Set(items.map((item) => item.skillId)).size === items.length, 'Skills must be unique').default([]),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).default('REMOTE'), locationText: optionalText(160), visibility: z.enum(['PLATFORM', 'UNIVERSITY']).default('PLATFORM'),
  budget: budget.optional(), deadlineAt: z.string().datetime({ offset: true }).nullable().optional(), capacity: z.number().int().min(1).max(100).default(1),
};
const createBody = z.object(gigFields).strict();
const updateBody = z.object(Object.fromEntries(Object.entries(gigFields).map(([key, schema]) => [key, schema.optional()]))).strict().refine((value) => Object.keys(value).length > 0, 'At least one editable field is required');
const listQuery = z.object({
  q: z.string().trim().min(1).max(80).optional(), skillId: objectId.optional(), category: z.string().trim().min(1).max(80).optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(), sort: z.enum(['NEWEST', 'DEADLINE']).default('NEWEST'),
  cursor: z.string().max(1024).optional(), limit: z.coerce.number().int().min(1).max(50).default(12),
}).strict();
const mineQuery = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'ASSIGNED', 'ACTIVE', 'COMPLETION_PENDING', 'COMPLETED', 'CLOSED', 'CANCELLED', 'ARCHIVED']).optional(), cursor: z.string().max(1024).optional(), limit: z.coerce.number().int().min(1).max(50).default(12) }).strict();
const gigParams = z.object({ gigId: objectId }).strict();
const commandBody = z.object({ reasonCode: z.string().trim().min(2).max(80).optional(), note: optionalText(500) }).strict();

export const createGigRequest = z.object({ params: empty, query: empty, body: createBody });
export const listGigsRequest = z.object({ params: empty, query: listQuery, body: noBody });
export const listMineRequest = z.object({ params: empty, query: mineQuery, body: noBody });
export const gigRequest = z.object({ params: gigParams, query: empty, body: noBody });
export const updateGigRequest = z.object({ params: gigParams, query: empty, body: updateBody });
export const transitionGigRequest = z.object({ params: gigParams, query: empty, body: commandBody.optional().default({}) });
export const bookmarkListRequest = z.object({ params: empty, query: z.object({ cursor: z.string().max(1024).optional(), limit: z.coerce.number().int().min(1).max(50).default(12) }).strict(), body: noBody });
