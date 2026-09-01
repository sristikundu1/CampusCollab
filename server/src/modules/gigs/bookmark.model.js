import {
  Schema,
  appendOnlySchemaOptions,
  model,
  objectId,
} from "../../lib/mongo/schema-helpers.js";

const bookmarkSchema = new Schema(
  {
    userId: { type: objectId, ref: "User", required: true, immutable: true },
    gigId: { type: objectId, ref: "Gig", required: true, immutable: true },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },
  },
  appendOnlySchemaOptions,
);
bookmarkSchema.index(
  { userId: 1, gigId: 1 },
  { unique: true, name: "uq_bookmarks_user_gig" },
);
bookmarkSchema.index(
  { userId: 1, createdAt: -1, _id: -1 },
  { name: "ix_bookmarks_user_cursor" },
);

export const Bookmark = model("Bookmark", bookmarkSchema, "bookmarks");
