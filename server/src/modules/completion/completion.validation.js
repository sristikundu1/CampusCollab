import { z } from "zod";

const empty = z.object({}).strict();
const noBody = z.union([z.undefined(), empty]).optional();
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

export const requestCompletionRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      contextType: z.enum(["GIG", "PROJECT"]),
      contextId: id,
      summary: z
        .string()
        .trim()
        .max(1000)
        .transform((value) => value || undefined)
        .optional(),
    })
    .strict(),
});

export const listCompletionRequest = z.object({
  params: empty,
  query: z
    .object({
      status: z
        .enum([
          "PENDING_ACKNOWLEDGEMENT",
          "ACKNOWLEDGED",
          "DISPUTED",
          "RESOLVED",
          "COMPLETED",
          "CANCELLED",
        ])
        .optional(),
      role: z.enum(["ALL", "OWNER", "PARTICIPANT"]).default("ALL"),
      limit: z.coerce.number().int().min(1).max(50).default(30),
    })
    .strict(),
  body: noBody,
});

export const completionRecordRequest = z.object({
  params: z.object({ recordId: id }).strict(),
  query: empty,
  body: noBody,
});

export const respondCompletionRequest = z.object({
  params: z.object({ recordId: id }).strict(),
  query: empty,
  body: z
    .object({
      decision: z.enum(["ACKNOWLEDGED", "DISPUTED"]),
      note: z
        .string()
        .trim()
        .max(1000)
        .transform((value) => value || undefined)
        .optional(),
    })
    .strict(),
});
