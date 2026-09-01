import { z } from "zod";

const empty = z.object({}).strict();
const noBody = z.undefined().optional();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional();
const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine(
    (value) => new URL(value).protocol === "https:",
    "URL must use HTTPS",
  );
const link = z
  .object({
    type: z.enum(["WEBSITE", "GITHUB", "LINKEDIN", "BEHANCE", "OTHER"]),
    url: httpsUrl,
    label: optionalText(50),
  })
  .strict();
const education = z
  .object({
    institutionName: z.string().trim().min(2).max(160),
    qualification: optionalText(120),
    field: optionalText(120),
    startYear: z.number().int().min(1900).max(2200).optional(),
    endYear: z.number().int().min(1900).max(2200).optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.startYear || !value.endYear || value.endYear >= value.startYear,
    { path: ["endYear"], message: "End year must not precede start year" },
  );

const profileFields = {
  displayName: z.string().trim().min(2).max(80).optional(),
  headline: optionalText(120),
  department: optionalText(120),
  graduationYear: z.number().int().min(1900).max(2200).nullable().optional(),
  bio: optionalText(2000),
  experienceLevel: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
    .nullable()
    .optional(),
  educationEntries: z.array(education).max(10).optional(),
  externalLinks: z.array(link).max(10).optional(),
  visibility: z.enum(["PLATFORM", "UNIVERSITY", "PRIVATE"]).optional(),
};
const strictPartialProfile = z
  .object(profileFields)
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );

export const createProfileRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({ ...profileFields, displayName: z.string().trim().min(2).max(80) })
    .strict(),
});
export const updateProfileRequest = z.object({
  params: empty,
  query: empty,
  body: strictPartialProfile,
});
export const ownProfileRequest = z.object({
  params: empty,
  query: empty,
  body: noBody,
});
export const publicProfileRequest = z.object({
  params: z.object({ userId: objectId }).strict(),
  query: empty,
  body: noBody,
});

const skillEntry = z
  .object({
    skillId: objectId,
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
    evidence: optionalText(300),
  })
  .strict();
export const replaceSkillsRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      skills: z
        .array(skillEntry)
        .max(30)
        .refine(
          (items) =>
            new Set(items.map((item) => item.skillId)).size === items.length,
          "Skills must be unique",
        ),
    })
    .strict(),
});
const availability = z
  .object({
    status: z.enum(["AVAILABLE", "LIMITED", "UNAVAILABLE"]),
    hoursPerWeek: z.number().int().min(0).max(80).nullable().optional(),
    availableFrom: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.status === "UNAVAILABLE" &&
      value.hoursPerWeek != null &&
      value.hoursPerWeek !== 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["hoursPerWeek"],
        message: "Unavailable profiles cannot advertise weekly hours",
      });
    }
    if (
      value.status !== "UNAVAILABLE" &&
      (!value.hoursPerWeek || value.hoursPerWeek < 1)
    ) {
      context.addIssue({
        code: "custom",
        path: ["hoursPerWeek"],
        message: "Enter at least one available hour per week",
      });
    }
  });
export const availabilityRequest = z.object({
  params: empty,
  query: empty,
  body: availability,
});

const portfolioLink = z
  .object({
    type: z.enum(["PROJECT", "REPOSITORY", "DEMO", "ARTICLE", "OTHER"]),
    url: httpsUrl,
    label: optionalText(50),
  })
  .strict();
const portfolioFields = {
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(3000),
  role: optionalText(120),
  skillIds: z
    .array(objectId)
    .max(20)
    .refine(
      (items) => new Set(items).size === items.length,
      "Skills must be unique",
    )
    .default([]),
  startedAt: z.string().datetime({ offset: true }).nullable().optional(),
  endedAt: z.string().datetime({ offset: true }).nullable().optional(),
  externalLinks: z.array(portfolioLink).max(10).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
};
const validateDates = (value) =>
  !value.startedAt ||
  !value.endedAt ||
  new Date(value.endedAt) >= new Date(value.startedAt);
export const createPortfolioRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object(portfolioFields)
    .strict()
    .refine(validateDates, {
      path: ["endedAt"],
      message: "End date must not precede start date",
    }),
});
export const portfolioItemRequest = z.object({
  params: z.object({ itemId: objectId }).strict(),
  query: empty,
  body: noBody,
});
export const updatePortfolioRequest = z.object({
  params: z.object({ itemId: objectId }).strict(),
  query: empty,
  body: z
    .object({
      ...portfolioFields,
      title: portfolioFields.title.optional(),
      description: portfolioFields.description.optional(),
      skillIds: portfolioFields.skillIds.optional(),
      externalLinks: portfolioFields.externalLinks.optional(),
      status: portfolioFields.status.optional(),
    })
    .strict()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required",
    )
    .refine(validateDates, {
      path: ["endedAt"],
      message: "End date must not precede start date",
    }),
});
export const portfolioListRequest = z.object({
  params: empty,
  query: z
    .object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional() })
    .strict(),
  body: noBody,
});
export const publicPortfolioListRequest = z.object({
  params: z.object({ userId: objectId }).strict(),
  query: empty,
  body: noBody,
});
