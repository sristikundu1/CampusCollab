import {
  Schema,
  addVersion,
  intField,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const participantSchema = new Schema(
  {
    userId: { type: objectId, ref: "User", required: true, immutable: true },
    role: {
      type: String,
      enum: ["OWNER", "GIG_PARTICIPANT", "PROJECT_MEMBER"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "READ_ONLY", "REMOVED"],
      default: "ACTIVE",
      required: true,
    },
    canSend: { type: Boolean, required: true },
    joinedAt: { type: Date, required: true },
    accessChangedAt: Date,
    lastReadAt: Date,
    lastReadMessageId: { type: objectId, ref: "Message" },
  },
  { _id: false, strict: "throw" },
);
const conversationSchema = addVersion(
  new Schema(
    {
      contextType: {
        type: String,
        enum: ["GIG_ENGAGEMENT", "PROJECT"],
        required: true,
        immutable: true,
      },
      contextId: { type: objectId, required: true, immutable: true },
      participants: {
        type: [participantSchema],
        required: true,
        validate: [
          (v) =>
            v.length > 0 &&
            v.length <= 101 &&
            new Set(v.map((x) => String(x.userId))).size === v.length,
          "Participants must be unique and bounded",
        ],
      },
      status: {
        type: String,
        enum: ["OPEN", "READ_ONLY", "CLOSED", "RESTRICTED"],
        default: "OPEN",
        required: true,
      },
      lastMessageId: { type: objectId, ref: "Message" },
      lastMessageAt: Date,
      lastMessagePreview: textField({ max: 160, select: false }),
      messageCount: { ...intField({ defaultValue: 0 }), select: false },
    },
    mutableSchemaOptions,
  ),
);
conversationSchema.index(
  { "participants.userId": 1, status: 1, lastMessageAt: -1, _id: -1 },
  { name: "ix_conversations_participant_activity" },
);
conversationSchema.index(
  { contextType: 1, contextId: 1 },
  { unique: true, name: "uq_conversations_context" },
);

export const Conversation = model(
  "Conversation",
  conversationSchema,
  "conversations",
);
