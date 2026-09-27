import { z } from "zod";

const empty = z.object({}).strict();
const noBody = z.union([z.undefined(), empty]).optional();
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const targetType = z.enum([
  "USER",
  "PROFILE",
  "GIG",
  "PROJECT",
  "PROPOSAL",
  "MESSAGE",
  "PORTFOLIO_ITEM",
]);
const reportStatus = z.enum([
  "SUBMITTED",
  "TRIAGED",
  "LINKED_TO_CASE",
  "RESOLVED",
  "DISMISSED",
]);

export const createReportRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      targetType,
      targetId: id,
      reasonCode: z.enum([
        "HARASSMENT",
        "SPAM",
        "SCAM_OR_FRAUD",
        "HATE_OR_ABUSE",
        "INAPPROPRIATE_CONTENT",
        "IMPERSONATION",
        "PRIVACY_VIOLATION",
        "OTHER",
      ]),
      details: z
        .string()
        .trim()
        .max(5000)
        .transform((value) => value || undefined)
        .optional(),
    })
    .strict(),
});

export const listOwnReportsRequest = z.object({
  params: empty,
  query: z
    .object({
      status: reportStatus.optional(),
      limit: z.coerce.number().int().min(1).max(50).default(30),
    })
    .strict(),
  body: noBody,
});

export const reportRequest = z.object({
  params: z.object({ reportId: id }).strict(),
  query: empty,
  body: noBody,
});

export const adminListReportsRequest = z.object({
  params: empty,
  query: z
    .object({
      status: reportStatus.optional(),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
      targetType: targetType.optional(),
      limit: z.coerce.number().int().min(1).max(50).default(30),
    })
    .strict(),
  body: noBody,
});

export const resolveReportRequest = z.object({
  params: z.object({ reportId: id }).strict(),
  query: empty,
  body: z
    .object({
      outcome: z.enum([
        "NO_VIOLATION",
        "WARNING",
        "CONTENT_RESTRICT",
        "CONTENT_HIDE",
        "TEMP_SUSPEND",
        "INDEFINITE_SUSPEND",
      ]),
      reasonCode: z.string().trim().min(2).max(80),
      note: z.string().trim().max(4000).optional(),
      suspendUntil: z.coerce.date().optional(),
    })
    .strict()
    .superRefine((value, context) => {
      if (value.outcome === "TEMP_SUSPEND" && !value.suspendUntil)
        context.addIssue({
          code: "custom",
          path: ["suspendUntil"],
          message: "A temporary suspension requires an end date",
        });
    }),
});
