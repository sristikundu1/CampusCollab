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
const NOTIFICATION = "cccccccccccccccccccccccc";
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
    return { user: { _id: token === "other-token" ? OTHER : USER } };
  },
};

function service(calls) {
  return {
    async list(userId, query) {
      calls.push(["list", String(userId), query]);
      return {
        notifications: [{ id: NOTIFICATION, isRead: false }],
        nextCursor: "next-page",
        hasMore: true,
      };
    },
    async unreadCount(userId) {
      calls.push(["count", String(userId)]);
      return 3;
    },
    async markRead(userId, notificationId) {
      calls.push(["read", String(userId), notificationId]);
      if (String(userId) === OTHER) throw new NotFoundError();
      return { id: notificationId, isRead: true };
    },
    async markAllRead(userId) {
      calls.push(["read-all", String(userId)]);
      return { updatedCount: 3, readAt: new Date().toISOString() };
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
    notificationService: service(calls),
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
    ...(write ? { "x-csrf-token": hashOpaqueToken(token, csrfSecret) } : {}),
  };
}

test("notification list and unread count require authentication and use session identity", () =>
  withServer(async (base, calls) => {
    assert.equal((await fetch(`${base}/api/v1/notifications`)).status, 401);
    assert.equal(
      (await fetch(`${base}/api/v1/notifications/unread-count`)).status,
      401,
    );
    const list = await fetch(`${base}/api/v1/notifications?limit=12`, {
      headers: headers(),
    });
    assert.equal(list.status, 200);
    assert.equal((await list.json()).meta.pagination.nextCursor, "next-page");
    assert.deepEqual(calls.at(-1), ["list", USER, { limit: 12 }]);
    const count = await fetch(`${base}/api/v1/notifications/unread-count`, {
      headers: headers(),
    });
    assert.equal((await count.json()).data.unreadCount, 3);
    assert.deepEqual(calls.at(-1), ["count", USER]);
  }));

test("read mutations require CSRF and derive ownership from the session", () =>
  withServer(async (base, calls) => {
    const route = `${base}/api/v1/notifications/${NOTIFICATION}/read`;
    assert.equal(
      (await fetch(route, { method: "PATCH", headers: headers() })).status,
      403,
    );
    const read = await fetch(route, {
      method: "PATCH",
      headers: headers("user-token", true),
    });
    assert.equal(read.status, 200);
    assert.deepEqual(calls.at(-1), ["read", USER, NOTIFICATION]);
    const all = await fetch(`${base}/api/v1/notifications/read-all`, {
      method: "PATCH",
      headers: headers("user-token", true),
    });
    assert.equal(all.status, 200);
    assert.deepEqual(calls.at(-1), ["read-all", USER]);
  }));

test("foreign notification identifiers are concealed and protected fields are rejected", () =>
  withServer(async (base) => {
    const route = `${base}/api/v1/notifications/${NOTIFICATION}/read`;
    const denied = await fetch(route, {
      method: "PATCH",
      headers: headers("other-token", true),
    });
    assert.equal(denied.status, 404);
    const injected = await fetch(route, {
      method: "PATCH",
      headers: {
        ...headers("user-token", true),
        "content-type": "application/json",
      },
      body: JSON.stringify({ recipientId: OTHER, type: "ADMIN", read: true }),
    });
    assert.equal(injected.status, 422);
  }));

test("notification pagination and identifiers are strictly validated", () =>
  withServer(async (base) => {
    assert.equal(
      (
        await fetch(`${base}/api/v1/notifications?limit=500`, {
          headers: headers(),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/notifications/not-an-id/read`, {
          method: "PATCH",
          headers: headers("user-token", true),
        })
      ).status,
      422,
    );
  }));
