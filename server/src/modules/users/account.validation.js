import { z } from "zod";

const empty = z.object({}).strict();

export const requestDeletionRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      password: z.string().min(1).max(128),
      confirmation: z.literal("DELETE MY ACCOUNT"),
    })
    .strict(),
});

export const cancelDeletionRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      email: z.string().trim().toLowerCase().email().max(320),
      password: z.string().min(1).max(128),
    })
    .strict(),
});
