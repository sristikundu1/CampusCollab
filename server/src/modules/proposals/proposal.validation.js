import { z } from "zod";

const empty = z.object({}).strict();
const noBody = z.union([z.undefined(), empty]).optional();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional();
const proposedBudget = z
  .object({
    type: z.enum(["FIXED", "RANGE", "UNPAID"]),
    minMinor: z.number().int().min(0).optional(),
    maxMinor: z.number().int().min(0).optional(),
    currency: z.string().trim().length(3).toUpperCase().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.type === "UNPAID" &&
      (value.minMinor !== undefined ||
        value.maxMinor !== undefined ||
        value.currency)
    )
      context.addIssue({
        code: "custom",
        message: "Unpaid proposals cannot include monetary values",
      });
    if (
      value.type !== "UNPAID" &&
      (value.minMinor === undefined || !value.currency)
    )
      context.addIssue({
        code: "custom",
        message: "Paid proposals require an amount and currency",
      });
    if (
      value.type === "RANGE" &&
      (value.maxMinor === undefined || value.maxMinor < value.minMinor)
    )
      context.addIssue({
        code: "custom",
        path: ["maxMinor"],
        message: "Maximum must be at least the minimum",
      });
  });
const revision = z
  .object({
    coverMessage: z.string().trim().min(20).max(5000),
    proposedBudget: proposedBudget.optional(),
    proposedDuration: optionalText(120),
    availability: optionalText(300),
  })
  .strict();
const proposalParams = z.object({ proposalId: objectId }).strict();
const gigParams = z.object({ gigId: objectId }).strict();
const statuses = z.enum([
  "SUBMITTED",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "CLOSED",
]);
const listQuery = z
  .object({
    status: statuses.optional(),
    gigId: objectId.optional(),
    sort: z.enum(["NEWEST", "OLDEST"]).default("NEWEST"),
    cursor: z.string().max(1024).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .strict();
const decision = z
  .object({ reasonCode: optionalText(80), note: optionalText(1000) })
  .strict()
  .optional()
  .default({});

export const submitProposalRequest = z.object({
  params: gigParams,
  query: empty,
  body: revision,
});
export const proposalListRequest = z.object({
  params: empty,
  query: listQuery,
  body: noBody,
});
export const ownerProposalListRequest = z.object({
  params: gigParams,
  query: listQuery.omit({ gigId: true }),
  body: noBody,
});
export const proposalRequest = z.object({
  params: proposalParams,
  query: empty,
  body: noBody,
});
export const updateProposalRequest = z.object({
  params: proposalParams,
  query: empty,
  body: revision,
});
export const proposalCommandRequest = z.object({
  params: proposalParams,
  query: empty,
  body: decision,
});
