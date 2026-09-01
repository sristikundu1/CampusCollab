import {
  Schema,
  addVersion,
  intField,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const verificationChallengeSchema = addVersion(
  new Schema(
    {
      userId: { type: objectId, ref: "User", required: true, immutable: true },
      affiliationId: {
        type: objectId,
        ref: "UniversityAffiliation",
        immutable: true,
      },
      purpose: {
        type: String,
        enum: [
          "UNIVERSITY_VERIFY",
          "UNIVERSITY_REVERIFY",
          "PASSWORD_RESET",
          "EMAIL_CHANGE",
        ],
        required: true,
        immutable: true,
      },
      tokenHash: textField({
        required: true,
        max: 256,
        immutable: true,
        select: false,
      }),
      destinationEmail: {
        ...textField({
          required: true,
          max: 320,
          immutable: true,
          select: false,
        }),
        lowercase: true,
      },
      status: {
        type: String,
        enum: ["ISSUED", "CONSUMED", "SUPERSEDED", "REVOKED"],
        default: "ISSUED",
        required: true,
      },
      attemptCount: intField({ defaultValue: 0, max: 100 }),
      issuedAt: { type: Date, required: true, immutable: true },
      expiresAt: { type: Date, required: true, immutable: true },
      consumedAt: Date,
      supersededAt: Date,
    },
    mutableSchemaOptions,
  ),
);
verificationChallengeSchema.index(
  { tokenHash: 1 },
  { unique: true, name: "uq_verification_token_hash" },
);
verificationChallengeSchema.index(
  { userId: 1, purpose: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ISSUED" },
    name: "uq_verification_current_purpose",
  },
);
verificationChallengeSchema.index(
  { userId: 1, purpose: 1, status: 1, createdAt: -1 },
  { name: "ix_verification_user_purpose_status" },
);
verificationChallengeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_verification_expires" },
);

export const VerificationChallenge = model(
  "VerificationChallenge",
  verificationChallengeSchema,
  "verificationChallenges",
);
