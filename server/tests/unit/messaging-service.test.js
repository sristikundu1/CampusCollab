import assert from "node:assert/strict";
import test from "node:test";
import { createMessagingService } from "../../src/modules/messaging/messaging.service.js";

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const MEMBER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const OUTSIDER = "cccccccccccccccccccccccc";
const PROJECT = "dddddddddddddddddddddddd";
const CONVERSATION = "eeeeeeeeeeeeeeeeeeeeeeee";
const config = {
  csrfSecret: "test-csrf-secret-with-more-than-thirty-two-characters",
};
const conversation = {
  _id: CONVERSATION,
  contextType: "PROJECT",
  contextId: PROJECT,
  status: "OPEN",
  participants: [
    { userId: OWNER, status: "ACTIVE", canSend: true, role: "OWNER" },
    {
      userId: MEMBER,
      status: "ACTIVE",
      canSend: true,
      role: "PROJECT_MEMBER",
    },
  ],
};

const noMessages = {
  find() {
    throw new Error("Message history must not be queried for an outsider");
  },
};

test("conversation history conceals its existence from a non-participant", async () => {
  const service = createMessagingService({
    config,
    ConversationModel: { findById: async () => conversation },
    MessageModel: noMessages,
  });
  await assert.rejects(
    service.messages(OUTSIDER, CONVERSATION, { limit: 20 }),
    (error) => error.code === "RESOURCE_NOT_FOUND" && error.status === 404,
  );
});

test("conversation creation rejects users without the trusted project relationship", async () => {
  let created = false;
  const service = createMessagingService({
    config,
    ProjectModel: {
      findById: async () => ({
        _id: PROJECT,
        ownerId: OWNER,
        title: "Trusted project",
        status: "ACTIVE",
      }),
    },
    MembershipModel: { find: async () => [] },
    ConversationModel: {
      findOne: async () => null,
      create: async () => {
        created = true;
      },
    },
  });
  await assert.rejects(
    service.resolve(OUTSIDER, { contextType: "PROJECT", contextId: PROJECT }),
    (error) => error.code === "RESOURCE_NOT_FOUND",
  );
  assert.equal(created, false);
});

test("a removed project member retains history but cannot send", async () => {
  const service = createMessagingService({
    config,
    ProjectModel: {
      findById: async () => ({
        _id: PROJECT,
        ownerId: OWNER,
        title: "Trusted project",
        status: "ACTIVE",
      }),
    },
    MembershipModel: { find: async () => [] },
    ConversationModel: { findById: async () => conversation },
    MessageModel: {
      findOne() {
        throw new Error("No message may be created after access is removed");
      },
    },
    transaction: async (work) => work(undefined),
  });
  await assert.rejects(
    service.send(MEMBER, CONVERSATION, {
      clientMessageId: "11111111-1111-4111-8111-111111111111",
      body: "This must not be sent",
    }),
    (error) => error.code === "CONVERSATION_READ_ONLY" && error.status === 403,
  );
});

test("one persisted message creates one recipient notification and polling creates none", async () => {
  const clientMessageId = "11111111-1111-4111-8111-111111111111";
  const message = {
    _id: "ffffffffffffffffffffffff",
    conversationId: CONVERSATION,
    senderId: OWNER,
    clientMessageId,
    body: "One durable message",
    sentAt: new Date(),
  };
  let stored = null;
  const notifications = [];
  const service = createMessagingService({
    config,
    ProjectModel: {
      findById: async () => ({
        _id: PROJECT,
        ownerId: OWNER,
        title: "Trusted project",
        status: "ACTIVE",
      }),
    },
    MembershipModel: {
      find: async () => [{ userId: MEMBER, status: "ACTIVE" }],
    },
    ConversationModel: {
      findById: async () => conversation,
      updateOne: async () => ({ modifiedCount: 1 }),
    },
    MessageModel: {
      findOne: async () => stored,
      create: async () => {
        stored = message;
        return [message];
      },
      findById: async () => stored,
      find: () => ({
        select() {
          return this;
        },
        sort() {
          return this;
        },
        limit() {
          return Promise.resolve([stored]);
        },
      }),
    },
    ProfileModel: {
      find: () => ({
        select() {
          return Promise.resolve([]);
        },
      }),
    },
    notificationWriter: {
      async create(value) {
        notifications.push(value);
      },
    },
    transaction: async (work) => work({}),
  });

  await service.send(OWNER, CONVERSATION, {
    clientMessageId,
    body: message.body,
  });
  await service.send(OWNER, CONVERSATION, {
    clientMessageId,
    body: message.body,
  });
  await service.messages(MEMBER, CONVERSATION, { limit: 20 });

  assert.equal(notifications.length, 1);
  assert.equal(String(notifications[0].recipientId), MEMBER);
  assert.equal(notifications[0].category, "MESSAGE_RECEIVED");
  assert.equal(notifications[0].sourceEventId, `MESSAGE_SENT:${message._id}`);
});
