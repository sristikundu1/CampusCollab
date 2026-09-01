import {
  Schema,
  addVersion,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const notificationSchema = addVersion(
  new Schema(
    {
      recipientId: {
        type: objectId,
        ref: "User",
        required: true,
        immutable: true,
      },
      sourceEventId: { type: String, required: true, immutable: true },
      category: textField({ required: true, max: 80, immutable: true }),
      targetType: textField({ required: true, max: 80, immutable: true }),
      targetId: { type: objectId, immutable: true, select: false },
      title: textField({ required: true, max: 160 }),
      preview: textField({ max: 300, select: false }),
      status: {
        type: String,
        enum: ["UNREAD", "READ", "ARCHIVED"],
        default: "UNREAD",
        required: true,
      },
      readAt: Date,
      archivedAt: Date,
      expiresAt: Date,
    },
    mutableSchemaOptions,
  ),
);
notificationSchema.index(
  { recipientId: 1, status: 1, createdAt: -1, _id: -1 },
  { name: "ix_notifications_recipient_status_cursor" },
);
notificationSchema.index(
  { recipientId: 1, sourceEventId: 1, category: 1 },
  { unique: true, name: "uq_notifications_event_category" },
);

export const Notification = model(
  "Notification",
  notificationSchema,
  "notifications",
);
