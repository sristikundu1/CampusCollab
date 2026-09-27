import { z } from "zod";

const empty = z.object({}).strict();
const noBody = z.union([z.undefined(), empty]).optional();
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

export const listNotificationsRequest = z.object({
  params: empty,
  query: z
    .object({
      cursor: z.string().max(1024).optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .strict(),
  body: noBody,
});

export const notificationReadRequest = z.object({
  params: z.object({ notificationId: id }).strict(),
  query: empty,
  body: noBody,
});

export const notificationEmptyRequest = z.object({
  params: empty,
  query: empty,
  body: noBody,
});
