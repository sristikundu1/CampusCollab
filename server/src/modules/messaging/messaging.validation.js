import { z } from "zod";

const empty = z.object({}).strict();
const noBody = z.union([z.undefined(), empty]).optional();
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

export const resolveConversationRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      contextType: z.enum(["PROJECT", "GIG_ENGAGEMENT"]),
      contextId: id,
    })
    .strict(),
});

export const listConversationsRequest = z.object({
  params: empty,
  query: z
    .object({ limit: z.coerce.number().int().min(1).max(50).default(30) })
    .strict(),
  body: noBody,
});

const conversationParams = z.object({ conversationId: id }).strict();

export const conversationRequest = z.object({
  params: conversationParams,
  query: empty,
  body: noBody,
});

export const listMessagesRequest = z.object({
  params: conversationParams,
  query: z
    .object({
      cursor: z.string().max(1024).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(40),
    })
    .strict(),
  body: noBody,
});

export const sendMessageRequest = z.object({
  params: conversationParams,
  query: empty,
  body: z
    .object({
      clientMessageId: z.string().uuid(),
      body: z
        .string()
        .trim()
        .max(5000)
        .transform((value) => value || undefined)
        .optional(),
      attachmentIds: z
        .array(id)
        .max(3)
        .refine(
          (values) => new Set(values).size === values.length,
          "Attachments must be unique",
        )
        .optional(),
    })
    .strict()
    .refine(
      (value) => value.body || value.attachmentIds?.length,
      "A message or attachment is required",
    ),
});

export const markReadRequest = z.object({
  params: conversationParams,
  query: empty,
  body: z.object({ messageId: id }).strict(),
});
