import "dotenv/config";
import mongoose from "mongoose";
import { Conversation } from "../src/modules/messaging/conversation.model.js";
import { Message } from "../src/modules/messaging/message.model.js";

if (!process.env.MONGODB_URI)
  throw new Error("MONGODB_URI is required to ensure messaging indexes.");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME,
  autoIndex: false,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
});
try {
  const indexes = [
    await Conversation.collection.createIndex(
      { "participants.userId": 1, status: 1, lastMessageAt: -1, _id: -1 },
      { name: "ix_conversations_participant_activity" },
    ),
    await Conversation.collection.createIndex(
      { contextType: 1, contextId: 1 },
      { unique: true, name: "uq_conversations_context" },
    ),
    await Message.collection.createIndex(
      { conversationId: 1, sentAt: -1, _id: -1 },
      { name: "ix_messages_conversation_cursor" },
    ),
    await Message.collection.createIndex(
      { conversationId: 1, senderId: 1, clientMessageId: 1 },
      { unique: true, name: "uq_messages_client_identity" },
    ),
  ];
  process.stdout.write(`MESSAGING_INDEXES_READY=${indexes.join(",")}\n`);
} finally {
  await mongoose.disconnect();
}
