import { z } from "zod";
const empty = z.object({}).strict();
const noBody = z.union([z.undefined(), empty]).optional();
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const reason = z.string().trim().min(2).max(80);
export const adminUsersRequest = z.object({
  params: empty,
  query: z
    .object({
      q: z.string().trim().max(100).optional(),
      status: z
        .enum([
          "PENDING_VERIFICATION",
          "ACTIVE",
          "TEMPORARILY_SUSPENDED",
          "INDEFINITELY_SUSPENDED",
          "DEACTIVATED",
          "DELETION_PENDING",
          "DELETED",
        ])
        .optional(),
      limit: z.coerce.number().int().min(1).max(50).default(30),
    })
    .strict(),
  body: noBody,
});
export const adminUserCommandRequest = z.object({
  params: z.object({ userId: id }).strict(),
  query: empty,
  body: z
    .object({ reasonCode: reason, until: z.coerce.date().optional() })
    .strict(),
});
export const adminSkillsRequest = z.object({
  params: empty,
  query: z
    .object({
      q: z.string().trim().max(80).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    })
    .strict(),
  body: noBody,
});
export const adminCreateSkillRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      name: z.string().trim().min(2).max(80),
      category: z.string().trim().min(2).max(80),
      aliases: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    })
    .strict(),
});
export const adminUpdateSkillRequest = z.object({
  params: z.object({ skillId: id }).strict(),
  query: empty,
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      category: z.string().trim().min(2).max(80).optional(),
      aliases: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      reasonCode: reason,
    })
    .strict(),
});
export const adminUniversitiesRequest = z.object({
  params: empty,
  query: z
    .object({
      q: z.string().trim().max(100).optional(),
      status: z.enum(["PROPOSED", "ACTIVE", "INACTIVE"]).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    })
    .strict(),
  body: noBody,
});
export const adminCreateUniversityRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      name: z.string().trim().min(2).max(160),
      shortName: z.string().trim().min(2).max(32).optional(),
      countryCode: z.string().trim().length(2).toUpperCase(),
      region: z.string().trim().max(100).optional(),
      websiteUrl: z.string().url().max(2048).optional(),
      status: z.enum(["PROPOSED", "ACTIVE"]).default("PROPOSED"),
    })
    .strict(),
});
export const adminUpdateUniversityRequest = z.object({
  params: z.object({ universityId: id }).strict(),
  query: empty,
  body: z
    .object({
      name: z.string().trim().min(2).max(160).optional(),
      shortName: z.string().trim().min(2).max(32).optional(),
      countryCode: z.string().trim().length(2).toUpperCase().optional(),
      region: z.string().trim().max(100).optional(),
      websiteUrl: z.string().url().max(2048).optional(),
      status: z.enum(["PROPOSED", "ACTIVE", "INACTIVE"]).optional(),
      reasonCode: reason,
    })
    .strict(),
});
export const adminCreateDomainRequest = z.object({
  params: z.object({ universityId: id }).strict(),
  query: empty,
  body: z
    .object({
      domain: z
        .string()
        .trim()
        .toLowerCase()
        .max(253)
        .regex(/^(?!-)(?:[a-z0-9-]+\.)+[a-z]{2,}$/),
      matchMode: z.enum(["EXACT", "SUBDOMAIN_ALLOWED"]).default("EXACT"),
      status: z.enum(["PENDING_REVIEW", "ACTIVE"]).default("PENDING_REVIEW"),
      evidenceSummary: z.string().trim().max(1000).optional(),
    })
    .strict(),
});
export const adminUpdateDomainRequest = z.object({
  params: z.object({ domainId: id }).strict(),
  query: empty,
  body: z
    .object({
      status: z.enum(["PENDING_REVIEW", "ACTIVE", "INACTIVE", "REJECTED"]),
      reasonCode: reason,
    })
    .strict(),
});
