import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { Notification } from "../src/modules/notifications/notification.model.js";

if (!process.env.MONGODB_URI)
  throw new Error("MONGODB_URI is required for the isolated database test.");

const base = (process.env.MONGODB_DB_NAME || "campuscollab")
  .replace(/[^a-zA-Z0-9_-]/g, "_")
  .slice(0, 10);
const databaseName = `${base}_notification_test_${crypto.randomBytes(4).toString("hex")}`;
if (!databaseName.includes("_notification_test_"))
  throw new Error("Refusing to use a non-isolated database name.");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: databaseName,
  autoIndex: true,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
});

try {
  await Notification.createIndexes();
  const recipientId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();
  const targetId = new mongoose.Types.ObjectId();
  const sourceEventId = `MESSAGE_SENT:${new mongoose.Types.ObjectId()}`;
  const input = {
    recipientId,
    sourceEventId,
    category: "MESSAGE_RECEIVED",
    targetType: "CONVERSATION",
    targetId,
    title: "New message",
    preview: "You have a new message.",
  };
  const attempts = await Promise.allSettled([
    Notification.create(input),
    Notification.create(input),
  ]);
  if (
    attempts.filter((entry) => entry.status === "fulfilled").length !== 1 ||
    attempts.filter(
      (entry) => entry.status === "rejected" && entry.reason?.code === 11000,
    ).length !== 1
  )
    throw new Error("Notification event deduplication index failed.");
  const stored = attempts.find((entry) => entry.status === "fulfilled").value;
  await Notification.create({
    ...input,
    sourceEventId: `MESSAGE_SENT:${new mongoose.Types.ObjectId()}`,
    category: "PROJECT_INVITATION_RECEIVED",
    targetType: "INVITATIONS",
    targetId: new mongoose.Types.ObjectId(),
    title: "Project invitation",
    preview: "You received an invitation to join a project.",
  });
  const page = await Notification.find({ recipientId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(20)
    .lean();
  if (page.length !== 2)
    throw new Error("Notification pagination query failed.");
  await Notification.updateOne(
    { _id: stored._id, recipientId, status: "UNREAD" },
    { $set: { status: "READ", readAt: new Date() } },
  );
  if (
    (await Notification.countDocuments({ recipientId, status: "UNREAD" })) !== 1
  )
    throw new Error("Persisted notification read state is invalid.");
  if ((await Notification.countDocuments({ recipientId: otherId })) !== 0)
    throw new Error("Recipient scoping is invalid.");
  const names = new Set(
    (await Notification.collection.indexes()).map((index) => index.name),
  );
  for (const expected of [
    "ix_notifications_recipient_cursor",
    "ix_notifications_recipient_status_cursor",
    "uq_notifications_event_category",
  ])
    if (!names.has(expected)) throw new Error(`Missing index: ${expected}`);
  process.stdout.write(
    "NOTIFICATION_DATABASE_VERIFIED=persistence,recipient,deduplication,cursor,read-state,indexes\n",
  );
} finally {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
