import "dotenv/config";
import mongoose from "mongoose";
import { Notification } from "../src/modules/notifications/notification.model.js";

if (!process.env.MONGODB_URI)
  throw new Error("MONGODB_URI is required to ensure notification indexes.");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME,
  autoIndex: false,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
});
try {
  const indexes = [
    await Notification.collection.createIndex(
      { recipientId: 1, createdAt: -1, _id: -1 },
      { name: "ix_notifications_recipient_cursor" },
    ),
    await Notification.collection.createIndex(
      { recipientId: 1, status: 1, createdAt: -1, _id: -1 },
      { name: "ix_notifications_recipient_status_cursor" },
    ),
    await Notification.collection.createIndex(
      { recipientId: 1, sourceEventId: 1, category: 1 },
      { unique: true, name: "uq_notifications_event_category" },
    ),
  ];
  process.stdout.write(`NOTIFICATION_INDEXES_READY=${indexes.join(",")}\n`);
} finally {
  await mongoose.disconnect();
}
