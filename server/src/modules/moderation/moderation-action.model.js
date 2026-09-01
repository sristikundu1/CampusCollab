import {
  Schema,
  appendOnlySchemaOptions,
  model,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const moderationActionSchema = new Schema(
  {
    caseId: {
      type: objectId,
      ref: "ModerationCase",
      required: true,
      immutable: true,
    },
    actorUserId: {
      type: objectId,
      ref: "User",
      required: true,
      immutable: true,
      select: false,
    },
    targetType: textField({
      required: true,
      max: 80,
      immutable: true,
      select: false,
    }),
    targetId: {
      type: objectId,
      required: true,
      immutable: true,
      select: false,
    },
    actionType: {
      type: String,
      enum: [
        "WARNING",
        "CONTENT_RESTRICT",
        "CONTENT_HIDE",
        "TEMP_SUSPEND",
        "INDEFINITE_SUSPEND",
        "REINSTATE",
        "NO_ACTION",
        "ESCALATE",
      ],
      required: true,
      immutable: true,
    },
    reasonCode: textField({
      required: true,
      max: 80,
      immutable: true,
      select: false,
    }),
    reasonDetails: textField({ max: 4000, immutable: true, select: false }),
    status: {
      type: String,
      enum: ["PROPOSED", "EFFECTIVE", "REVERSED", "EXPIRED"],
      default: "EFFECTIVE",
      required: true,
    },
    effectiveAt: { type: Date, required: true, immutable: true },
    expiresAt: Date,
    reversedByActionId: { type: objectId, ref: "ModerationAction" },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },
  },
  appendOnlySchemaOptions,
);
moderationActionSchema.index(
  { targetType: 1, targetId: 1, status: 1, effectiveAt: -1 },
  { name: "ix_moderation_actions_target_effective" },
);
moderationActionSchema.index(
  { caseId: 1, createdAt: 1 },
  { name: "ix_moderation_actions_case_history" },
);

export const ModerationAction = model(
  "ModerationAction",
  moderationActionSchema,
  "moderationActions",
);
