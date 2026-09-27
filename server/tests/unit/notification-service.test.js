import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationService } from "../../src/modules/notifications/notification.service.js";
import { createNotificationWriter } from "../../src/modules/notifications/notification.writer.js";

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const NOTIFICATION = "cccccccccccccccccccccccc";
const TARGET = "dddddddddddddddddddddddd";
const config = {
  csrfSecret: "test-csrf-secret-with-more-than-thirty-two-characters",
};

function chain(value) {
  return {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    lean() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

test("notification writer uses trusted content and an idempotent event identity", async () => {
  const calls = [];
  const writer = createNotificationWriter({
    NotificationModel: {
      updateOne: async (...args) => calls.push(args),
    },
  });
  const input = {
    recipientId: USER,
    actorId: OTHER,
    sourceEventId: `PROPOSAL_SUBMITTED:${TARGET}:0`,
    category: "PROPOSAL_RECEIVED",
    targetType: "PROPOSAL",
    targetId: TARGET,
  };
  await writer.create(input, "session");
  await writer.create(input, "session");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0][0], {
    recipientId: USER,
    sourceEventId: input.sourceEventId,
    category: "PROPOSAL_RECEIVED",
  });
  assert.equal(calls[0][1].$setOnInsert.title, "New proposal received");
  assert.equal(calls[0][1].$setOnInsert.preview.includes("student"), true);
  assert.equal(calls[0][2].upsert, true);
});

test("notification writer skips self-notifications and rejects invented types", async () => {
  let writes = 0;
  const writer = createNotificationWriter({
    NotificationModel: { updateOne: async () => (writes += 1) },
  });
  assert.equal(
    await writer.create({
      recipientId: USER,
      actorId: USER,
      sourceEventId: "self",
      category: "MESSAGE_RECEIVED",
      targetType: "CONVERSATION",
      targetId: TARGET,
    }),
    null,
  );
  await assert.rejects(
    writer.create({
      recipientId: USER,
      actorId: OTHER,
      sourceEventId: "forged",
      category: "ADMIN",
      targetType: "PROJECT",
      targetId: TARGET,
    }),
    TypeError,
  );
  assert.equal(writes, 0);
});

test("list is recipient-scoped, bounded, cursor paginated, and exposes only safe navigation", async () => {
  const filters = [];
  const rows = [1, 2, 3].map((offset) => ({
    _id: String(offset).repeat(24),
    recipientId: USER,
    category: "MESSAGE_RECEIVED",
    targetType: "CONVERSATION",
    targetId: TARGET,
    title: "New message",
    preview: "You have a new message.",
    status: "UNREAD",
    createdAt: new Date(`2026-09-2${offset}T00:00:00.000Z`),
  }));
  const model = {
    find(filter) {
      filters.push(filter);
      return chain(rows);
    },
  };
  const service = createNotificationService({
    config,
    NotificationModel: model,
  });
  const first = await service.list(USER, { limit: 2 });
  assert.equal(first.notifications.length, 2);
  assert.equal(first.hasMore, true);
  assert.equal(
    first.notifications[0].destination,
    `/dashboard/messages/${TARGET}`,
  );
  assert.equal("recipientId" in first.notifications[0], false);
  await service.list(USER, { limit: 2, cursor: first.nextCursor });
  assert.equal(filters[1].recipientId, USER);
  assert.ok(filters[1].$or);
});

test("read operations scope every mutation to the authenticated recipient", async () => {
  const operations = [];
  const row = {
    _id: NOTIFICATION,
    targetType: "PROJECT",
    targetId: TARGET,
    category: "JOIN_REQUEST_ACCEPTED",
    title: "Join request accepted",
    preview: "Your project join request was accepted.",
    status: "READ",
    createdAt: new Date(),
    readAt: new Date(),
  };
  const model = {
    findOneAndUpdate(filter) {
      operations.push(["one", filter]);
      return chain(row);
    },
    updateMany(filter) {
      operations.push(["all", filter]);
      return Promise.resolve({ modifiedCount: 4 });
    },
  };
  const service = createNotificationService({
    config,
    NotificationModel: model,
  });
  assert.equal((await service.markRead(USER, NOTIFICATION)).isRead, true);
  assert.deepEqual(operations[0][1], {
    _id: NOTIFICATION,
    recipientId: USER,
    status: "UNREAD",
  });
  assert.equal((await service.markAllRead(USER)).updatedCount, 4);
  assert.deepEqual(operations[1][1], { recipientId: USER, status: "UNREAD" });
});
