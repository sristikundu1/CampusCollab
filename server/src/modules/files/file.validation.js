import { z } from "zod";

const empty = z.object({}).strict();
const noBody = z.union([z.undefined(), empty]).optional();
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

export const uploadMessageAttachmentRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      conversationId: id,
      fileName: z.string().trim().min(1).max(255),
      mediaType: z.enum(["image/png", "image/jpeg"]),
      dataBase64: z
        .string()
        .min(4)
        .max(115000)
        .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Invalid base64 data"),
    })
    .strict(),
});

export const attachmentRequest = z.object({
  params: z.object({ attachmentId: id }).strict(),
  query: empty,
  body: noBody,
});
