import { NotFoundError } from "../../errors/application-error.js";
import { createCursorCodec } from "../../lib/pagination/cursor.js";
import { Notification } from "./notification.model.js";

const q = async (query, { lean = false, select } = {}) => {
  let value = query;
  if (select && value?.select) value = value.select(select);
  if (lean && value?.lean) value = value.lean();
  return value;
};

const destination = (notification) => {
  const id = notification.targetId ? String(notification.targetId) : null;
  switch (notification.targetType) {
    case "PROPOSAL":
      return id ? `/dashboard/proposals/${id}` : "/dashboard/proposals";
    case "JOIN_REQUESTS":
      return "/dashboard/join-requests";
    case "INVITATIONS":
      return "/dashboard/invitations";
    case "PROJECT":
      return id ? `/projects/${id}` : "/dashboard/projects";
    case "CONVERSATION":
      return id ? `/dashboard/messages/${id}` : "/dashboard/messages";
    case "COMPLETION":
      return "/dashboard/completions";
    case "REPORT":
      return "/dashboard/reports";
    default:
      return null;
  }
};

const serialize = (notification) => ({
  id: String(notification._id),
  type: notification.category,
  title: notification.title,
  message: notification.preview ?? "",
  isRead: notification.status !== "UNREAD",
  readAt: notification.readAt ?? null,
  createdAt: notification.createdAt,
  destination: destination(notification),
});

export function createNotificationService({
  config,
  NotificationModel = Notification,
} = {}) {
  const cursorCodec = createCursorCodec(config.csrfSecret);

  async function list(userId, input) {
    const scope = `notifications:${userId}`;
    const decoded = cursorCodec.decode(input.cursor, scope);
    const filter = {
      recipientId: userId,
      status: { $ne: "ARCHIVED" },
      ...(decoded
        ? {
            $or: [
              { createdAt: { $lt: new Date(decoded.at) } },
              { createdAt: new Date(decoded.at), _id: { $lt: decoded.id } },
            ],
          }
        : {}),
    };
    const rows = await q(
      NotificationModel.find(filter)
        .select("+targetId +preview")
        .sort({ createdAt: -1, _id: -1 })
        .limit(input.limit + 1),
      { lean: true },
    );
    const hasMore = rows.length > input.limit;
    const selected = hasMore ? rows.slice(0, input.limit) : rows;
    const last = selected.at(-1);
    return {
      notifications: selected.map(serialize),
      hasMore,
      nextCursor:
        hasMore && last
          ? cursorCodec.encode({
              scope,
              at: new Date(last.createdAt).toISOString(),
              id: String(last._id),
            })
          : null,
    };
  }

  async function unreadCount(userId) {
    return NotificationModel.countDocuments({
      recipientId: userId,
      status: "UNREAD",
    });
  }

  async function markRead(userId, notificationId) {
    const now = new Date();
    let notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, recipientId: userId, status: "UNREAD" },
      { $set: { status: "READ", readAt: now }, $inc: { version: 1 } },
      { returnDocument: "after", runValidators: true },
    ).select("+targetId +preview");
    if (!notification) {
      notification = await NotificationModel.findOne({
        _id: notificationId,
        recipientId: userId,
        status: { $ne: "ARCHIVED" },
      }).select("+targetId +preview");
    }
    if (!notification) throw new NotFoundError();
    return serialize(notification);
  }

  async function markAllRead(userId) {
    const now = new Date();
    const result = await NotificationModel.updateMany(
      { recipientId: userId, status: "UNREAD" },
      { $set: { status: "READ", readAt: now }, $inc: { version: 1 } },
      { runValidators: true },
    );
    return { updatedCount: result.modifiedCount, readAt: now };
  }

  return { list, unreadCount, markRead, markAllRead };
}
