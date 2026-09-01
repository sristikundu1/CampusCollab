import { z } from "zod";

const password = z
  .string()
  .min(10)
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");
const email = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());
const empty = z.object({}).strict();

export const registerRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      name: z.string().trim().min(2).max(80),
      email,
      password,
      confirmPassword: z.string(),
      primaryExperience: z
        .enum(["SEEKING_WORK", "OWNING_WORK"])
        .default("SEEKING_WORK"),
    })
    .strict()
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }),
});
export const loginRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      email,
      password: z.string().min(1).max(128),
      remember: z.boolean().default(false),
    })
    .strict(),
});
export const tokenRequest = z.object({
  params: empty,
  query: empty,
  body: z.object({ token: z.string().min(32).max(512) }).strict(),
});
export const emailRequest = z.object({
  params: empty,
  query: empty,
  body: z.object({ email }).strict(),
});
export const resetPasswordRequest = z.object({
  params: empty,
  query: empty,
  body: z
    .object({
      token: z.string().min(32).max(512),
      password,
      confirmPassword: z.string(),
    })
    .strict()
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }),
});
