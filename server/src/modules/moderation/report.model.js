import {
  Schema,
  addVersion,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const reportSchema = addVersion(
  new Schema(
    {
      reporterId: {
        type: objectId,
        ref: "User",
        required: true,
        immutable: true,
        select: false,
      },
      targetType: {
        type: String,
        enum: [
          "USER",
          "PROFILE",
          "GIG",
          "PROJECT",
          "PROPOSAL",
          "MESSAGE",
          "PORTFOLIO_ITEM",
          "ATTACHMENT",
        ],
        required: true,
        immutable: true,
      },
      targetId: {
        type: objectId,
        required: true,
        immutable: true,
        select: false,
      },
      reasonCode: textField({ required: true, max: 80, select: false }),
      details: textField({ max: 5000, select: false }),
      status: {
        type: String,
        enum: [
          "SUBMITTED",
          "TRIAGED",
          "LINKED_TO_CASE",
          "RESOLVED",
          "DISMISSED",
        ],
        default: "SUBMITTED",
        required: true,
      },
      priority: {
        type: String,
        enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
        default: "NORMAL",
        required: true,
        select: false,
      },
      caseId: { type: objectId, ref: "ModerationCase", select: false },
      duplicateGroupKey: textField({ max: 256, select: false }),
      submittedAt: { type: Date, required: true, immutable: true },
      resolvedAt: Date,
    },
    mutableSchemaOptions,
  ),
);
reportSchema.index(
  { status: 1, priority: -1, submittedAt: 1, _id: 1 },
  { name: "ix_reports_moderation_queue" },
);
reportSchema.index(
  { targetType: 1, targetId: 1, submittedAt: -1 },
  { name: "ix_reports_target_history" },
);
reportSchema.index(
  { reporterId: 1, submittedAt: -1, _id: -1 },
  { name: "ix_reports_reporter_cursor" },
);

export const Report = model("Report", reportSchema, "reports");
