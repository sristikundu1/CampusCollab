import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { Conversation } from "../src/modules/messaging/conversation.model.js";
import { Message } from "../src/modules/messaging/message.model.js";

if (!process.env.MONGODB_URI)
  throw new Error("MONGODB_URI is required for the isolated database test.");

const base = (process.env.MONGODB_DB_NAME || "campuscollab")
  .replace(/[^a-zA-Z0-9_-]/g, "_")
  .slice(0, 30);
const databaseName = `${base}_messaging_test_${crypto.randomBytes(4).toString("hex")}`;
if (!databaseName.includes("_messaging_test_"))
  throw new Error("Refusing to use a non-isolated database name.");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: databaseName,
  autoIndex: true,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
});

try {
  await Promise.all([Conversation.createIndexes(), Message.createIndexes()]);
  const ownerId = new mongoose.Types.ObjectId();
  const memberId = new mongoose.Types.ObjectId();
  const contextId = new mongoose.Types.ObjectId();
  const now = new Date();
  const conversation = await Conversation.create({
    contextType: "PROJECT",
    contextId,
    participants: [ownerId, memberId].map((userId, index) => ({
      userId,
      role: index === 0 ? "OWNER" : "PROJECT_MEMBER",
      status: "ACTIVE",
      canSend: true,
      joinedAt: now,
    })),
  });
  const clientMessageId = crypto.randomUUID();
  const attempts = await Promise.allSettled(
    [0, 1].map(() =>
      Message.create({
        conversationId: conversation._id,
        senderId: ownerId,
        clientMessageId,
        body: "Database concurrency verification",
        sentAt: now,
      }),
    ),
  );
  const fulfilled = attempts.filter(
    (attempt) => attempt.status === "fulfilled",
  );
  const duplicate = attempts.filter(
    (attempt) =>
      attempt.status === "rejected" && attempt.reason?.code === 11000,
  );
  if (fulfilled.length !== 1 || duplicate.length !== 1)
    throw new Error("Message idempotency index did not prevent a duplicate.");
  const message = fulfilled[0].value;
  const simultaneous = await Promise.all([
    Message.create({
      conversationId: conversation._id,
      senderId: ownerId,
      clientMessageId: crypto.randomUUID(),
      body: "Owner simultaneous message",
      sentAt: new Date(now.getTime() + 1),
    }),
    Message.create({
      conversationId: conversation._id,
      senderId: memberId,
      clientMessageId: crypto.randomUUID(),
      body: "Member simultaneous message",
      sentAt: new Date(now.getTime() + 1),
    }),
  ]);
  if (
    simultaneous.length !== 2 ||
    new Set(simultaneous.map((item) => String(item.senderId))).size !== 2
  )
    throw new Error("Simultaneous messages were not persisted correctly.");
  await Conversation.updateOne(
    { _id: conversation._id, "participants.userId": memberId },
    {
      $set: {
        "participants.$.lastReadAt": now,
        "participants.$.lastReadMessageId": message._id,
      },
    },
  );
  const stored = await Conversation.findById(conversation._id).lean();
  const reader = stored.participants.find((item) =>
    item.userId.equals(memberId),
  );
  if (!reader?.lastReadMessageId?.equals(message._id))
    throw new Error("Read state was not persisted.");
  const page = await Message.find({ conversationId: conversation._id })
    .sort({ sentAt: -1, _id: -1 })
    .limit(40)
    .lean();
  if (page.length !== 3)
    throw new Error("Deterministic message query returned an invalid page.");
  process.stdout.write(
    "MESSAGING_DATABASE_VERIFIED=conversation,idempotency,simultaneous-send,cursor,read-state\n",
  );
} finally {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
