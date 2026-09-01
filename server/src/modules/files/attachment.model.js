import {
  Schema,
  addVersion,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const attachmentSchema = addVersion(
  new Schema(
    {
      uploaderId: {
        type: objectId,
        ref: "User",
        required: true,
        immutable: true,
      },
      parentType: {
        type: String,
        enum: ["PORTFOLIO_ITEM", "PROPOSAL", "PROJECT", "MESSAGE", "REPORT"],
        required: true,
      },
      parentId: objectId,
      conversationId: { type: objectId, ref: "Conversation", immutable: true },
      originalFileName: textField({ required: true, max: 255, select: false }),
      mediaTypeDeclared: textField({ required: true, max: 255 }),
      mediaTypeDetected: textField({ max: 255 }),
      sizeBytes: { type: Number, required: true, min: 1 },
      storageProvider: textField({ required: true, max: 40, select: false }),
      storageKey: textField({
        required: true,
        max: 1024,
        immutable: true,
        select: false,
      }),
      integrityHash: textField({ required: true, max: 256, select: false }),
      scanStatus: {
        type: String,
        enum: [
          "PENDING",
          "SCANNING",
          "CLEAN",
          "QUARANTINED",
          "REJECTED",
          "ERROR",
        ],
        default: "PENDING",
        required: true,
      },
      status: {
        type: String,
        enum: [
          "PENDING_UPLOAD",
          "AVAILABLE",
          "QUARANTINED",
          "REMOVED",
          "EXPIRED",
        ],
        default: "PENDING_UPLOAD",
        required: true,
      },
      scanDetailsCode: textField({ max: 80, select: false }),
      availableAt: Date,
      quarantinedAt: Date,
      removedAt: Date,
    },
    mutableSchemaOptions,
  ),
);
attachmentSchema.index(
  { storageKey: 1 },
  { unique: true, name: "uq_attachments_storage_key" },
);
attachmentSchema.index(
  { scanStatus: 1, createdAt: 1 },
  { name: "ix_attachments_scan_queue" },
);
attachmentSchema.index(
  { parentType: 1, parentId: 1, status: 1 },
  { name: "ix_attachments_parent_status" },
);

export const Attachment = model("Attachment", attachmentSchema, "attachments");
