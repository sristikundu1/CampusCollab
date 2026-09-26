import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createApp } from "../../src/app.js";
import { createLogger } from "../../src/config/logger.js";
import {
  AuthenticationError,
  NotFoundError,
} from "../../src/errors/application-error.js";
import { hashOpaqueToken } from "../../src/lib/crypto/opaque-token.js";

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const CONVERSATION = "cccccccccccccccccccccccc";
const CONTEXT = "dddddddddddddddddddddddd";
const MESSAGE = "eeeeeeeeeeeeeeeeeeeeeeee";
const csrfSecret = "test-csrf-secret-with-more-than-thirty-two-characters";
const config = {
  nodeEnv: "test",
  clientUrl: "http://localhost:5173",
  trustProxy: false,
  isProduction: false,
  sessionCookieName: "campuscollab_session",
  sessionSecret: "test-session-secret-with-more-than-thirty-two-characters",
  csrfSecret,
  brevo: null,
  requireEmailVerification: false,
};
const logger = createLogger({ level: "silent", environment: "test" });
const authService = {
  async authenticate(token) {
    if (!token) throw new AuthenticationError();
    return {
      user: { _id: token === "other-token" ? OTHER : USER },
      session: { _id: MESSAGE },
    };
  },
};
const conversation = {
  id: CONVERSATION,
  contextType: "PROJECT",
  contextId: CONTEXT,
  title: "Project team",
  participants: [],
  unreadCount: 0,
  canSend: true,
};

function service(calls) {
  return {
    async resolve(userId, body) {
      calls.push(["resolve", String(userId), body]);
      if (String(userId) === OTHER) throw new NotFoundError();
      return conversation;
    },
    async list(userId, query) {
      calls.push(["list", String(userId), query]);
      return [conversation];
    },
    async get(userId, conversationId) {
      calls.push(["get", String(userId), conversationId]);
      if (String(userId) === OTHER) throw new NotFoundError();
      return conversation;
    },
    async messages(userId, conversationId, query) {
      calls.push(["messages", String(userId), conversationId, query]);
      if (String(userId) === OTHER) throw new NotFoundError();
      return {
        messages: [
          {
            id: MESSAGE,
            conversationId,
            sender: { id: USER, displayName: "Student" },
            body: "Hello team",
            sentAt: new Date().toISOString(),
            isOwn: true,
          },
        ],
        nextCursor: "older",
        hasMore: true,
      };
    },
    async send(userId, conversationId, body) {
      calls.push(["send", String(userId), conversationId, body]);
      return { id: MESSAGE, body: body.body, isOwn: true };
    },
    async markRead(userId, conversationId, messageId) {
      calls.push(["read", String(userId), conversationId, messageId]);
      return { conversationId, lastReadMessageId: messageId };
    },
  };
}

async function withServer(work) {
  const calls = [];
  const app = createApp({
    config,
    logger,
    databaseReadiness: () => ({ ready: true }),
    authService,
    messagingService: service(calls),
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await work(`http://127.0.0.1:${server.address().port}`, calls);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function headers(token = "user-token", write = false) {
  return {
    cookie: `campuscollab_session=${token}`,
    ...(write
      ? {
          "content-type": "application/json",
          "x-csrf-token": hashOpaqueToken(token, csrfSecret),
        }
      : {}),
  };
}

test("messaging endpoints require authentication and resolve only from session identity", () =>
  withServer(async (base, calls) => {
    const anonymous = await fetch(`${base}/api/v1/conversations`);
    assert.equal(anonymous.status, 401);

    const response = await fetch(`${base}/api/v1/conversations`, {
      method: "POST",
      headers: headers("user-token", true),
      body: JSON.stringify({ contextType: "PROJECT", contextId: CONTEXT }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(calls.at(-1), [
      "resolve",
      USER,
      { contextType: "PROJECT", contextId: CONTEXT },
    ]);
  }));

test("message send derives sender from session and rejects identity injection", () =>
  withServer(async (base, calls) => {
    const rejected = await fetch(
      `${base}/api/v1/conversations/${CONVERSATION}/messages`,
      {
        method: "POST",
        headers: headers("user-token", true),
        body: JSON.stringify({
          clientMessageId: crypto.randomUUID(),
          body: "Hello",
          senderId: OTHER,
        }),
      },
    );
    assert.equal(rejected.status, 422);

    const clientMessageId = crypto.randomUUID();
    const response = await fetch(
      `${base}/api/v1/conversations/${CONVERSATION}/messages`,
      {
        method: "POST",
        headers: headers("user-token", true),
        body: JSON.stringify({ clientMessageId, body: "  Hello team  " }),
      },
    );
    assert.equal(response.status, 201);
    assert.deepEqual(calls.at(-1), [
      "send",
      USER,
      CONVERSATION,
      { clientMessageId, body: "Hello team" },
    ]);
  }));

test("history is cursor bounded and cross-user denial is concealed", () =>
  withServer(async (base, calls) => {
    const detail = await fetch(`${base}/api/v1/conversations/${CONVERSATION}`, {
      headers: headers(),
    });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).data.conversation.id, CONVERSATION);
    const response = await fetch(
      `${base}/api/v1/conversations/${CONVERSATION}/messages?limit=25`,
      { headers: headers() },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.meta.pagination.nextCursor, "older");
    assert.equal(calls.at(-1)[3].limit, 25);

    const denied = await fetch(
      `${base}/api/v1/conversations/${CONVERSATION}/messages`,
      { headers: headers("other-token") },
    );
    assert.equal(denied.status, 404);
    assert.equal((await denied.json()).error.code, "RESOURCE_NOT_FOUND");
    const deniedDetail = await fetch(
      `${base}/api/v1/conversations/${CONVERSATION}`,
      { headers: headers("other-token") },
    );
    assert.equal(deniedDetail.status, 404);
  }));

test("read state requires CSRF and a message belonging to the conversation", () =>
  withServer(async (base, calls) => {
    const missingCsrf = await fetch(
      `${base}/api/v1/conversations/${CONVERSATION}/read`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ messageId: MESSAGE }),
      },
    );
    assert.equal(missingCsrf.status, 403);
    const response = await fetch(
      `${base}/api/v1/conversations/${CONVERSATION}/read`,
      {
        method: "POST",
        headers: headers("user-token", true),
        body: JSON.stringify({ messageId: MESSAGE }),
      },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls.at(-1), ["read", USER, CONVERSATION, MESSAGE]);
  }));

test("message validation rejects oversized content and invalid identifiers", () =>
  withServer(async (base) => {
    const invalidId = await fetch(
      `${base}/api/v1/conversations/not-an-id/messages`,
      { headers: headers() },
    );
    assert.equal(invalidId.status, 422);
    const oversized = await fetch(
      `${base}/api/v1/conversations/${CONVERSATION}/messages`,
      {
        method: "POST",
        headers: headers("user-token", true),
        body: JSON.stringify({
          clientMessageId: crypto.randomUUID(),
          body: "x".repeat(5001),
        }),
      },
    );
    assert.equal(oversized.status, 422);
  }));
