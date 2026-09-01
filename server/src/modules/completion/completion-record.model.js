import {
  Schema,
  addVersion,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const completionRecordSchema = addVersion(
  new Schema(
    {
      contextType: {
        type: String,
        enum: ["GIG_PROPOSAL", "PROJECT_MEMBERSHIP"],
        required: true,
        immutable: true,
      },
      contextId: { type: objectId, required: true, immutable: true },
      resourceId: { type: objectId, required: true, immutable: true },
      ownerId: { type: objectId, ref: "User", required: true, immutable: true },
      participantId: {
        type: objectId,
        ref: "User",
        required: true,
        immutable: true,
      },
      status: {
        type: String,
        enum: [
          "PENDING_ACKNOWLEDGEMENT",
          "ACKNOWLEDGED",
          "DISPUTED",
          "RESOLVED",
          "COMPLETED",
          "CANCELLED",
        ],
        default: "PENDING_ACKNOWLEDGEMENT",
        required: true,
      },
      requestedAt: { type: Date, required: true, immutable: true },
      responseDueAt: { type: Date, required: true },
      participantResponse: {
        type: String,
        enum: ["ACKNOWLEDGED", "DISPUTED"],
        select: false,
      },
      respondedAt: Date,
      reportId: { type: objectId, ref: "Report", select: false },
      resolutionType: textField({ max: 80, select: false }),
      resolvedByUserId: { type: objectId, ref: "User", select: false },
      resolvedAt: Date,
      completedAt: Date,
      cancelledAt: Date,
      idempotencyKey: textField({
        required: true,
        min: 8,
        max: 128,
        immutable: true,
        select: false,
      }),
    },
    mutableSchemaOptions,
  ),
);
completionRecordSchema.index(
  { contextType: 1, contextId: 1 },
  { unique: true, name: "uq_completion_context" },
);
completionRecordSchema.index(
  { participantId: 1, status: 1, responseDueAt: 1 },
  { name: "ix_completion_participant_due" },
);
completionRecordSchema.index(
  { ownerId: 1, status: 1, requestedAt: -1 },
  { name: "ix_completion_owner_status" },
);

export const CompletionRecord = model(
  "CompletionRecord",
  completionRecordSchema,
  "completionRecords",
);
