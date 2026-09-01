import {
  Schema,
  addVersion,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const sessionSchema = addVersion(
  new Schema(
    {
      userId: { type: objectId, ref: "User", required: true, immutable: true },
      tokenHash: textField({
        required: true,
        max: 256,
        immutable: true,
        select: false,
      }),
      familyId: textField({
        required: true,
        max: 128,
        immutable: true,
        select: false,
      }),
      status: {
        type: String,
        enum: ["ACTIVE", "ROTATED", "REVOKED"],
        default: "ACTIVE",
        required: true,
      },
      authMethod: {
        type: String,
        enum: ["PASSWORD"],
        required: true,
        immutable: true,
      },
      issuedAt: { type: Date, required: true, immutable: true },
      expiresAt: { type: Date, required: true, immutable: true },
      lastSeenAt: Date,
      rotatedToSessionId: { type: objectId, ref: "Session", select: false },
      revokedAt: Date,
      revokeReason: textField({ max: 80, select: false }),
      userAgentSummary: textField({ max: 256, select: false }),
      ipHash: textField({ max: 256, select: false }),
    },
    mutableSchemaOptions,
  ),
);
sessionSchema.index(
  { tokenHash: 1 },
  { unique: true, name: "uq_sessions_token_hash" },
);
sessionSchema.index(
  { userId: 1, status: 1, createdAt: -1 },
  { name: "ix_sessions_user_status_created" },
);
sessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_sessions_expires" },
);

export const Session = model("Session", sessionSchema, "sessions");
