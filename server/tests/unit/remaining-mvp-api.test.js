import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createApp } from "../../src/app.js";
import { createLogger } from "../../src/config/logger.js";
import { AuthenticationError } from "../../src/errors/application-error.js";
import { hashOpaqueToken } from "../../src/lib/crypto/opaque-token.js";

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ADMIN = "bbbbbbbbbbbbbbbbbbbbbbbb";
const TARGET = "cccccccccccccccccccccccc";
const REPORT = "dddddddddddddddddddddddd";
const ATTACHMENT = "eeeeeeeeeeeeeeeeeeeeeeee";
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
      user: { _id: token === "admin" ? ADMIN : USER },
      session: { _id: TARGET },
    };
  },
};

function headers(token = "user", { json = false, key = true } = {}) {
  return {
    cookie: `campuscollab_session=${token}`,
    ...(json
      ? {
          "content-type": "application/json",
          "x-csrf-token": hashOpaqueToken(token, csrfSecret),
        }
      : {}),
    ...(key ? { "idempotency-key": "remaining-mvp-0001" } : {}),
  };
}

async function run(work) {
  const calls = [];
  const report = {
    id: REPORT,
    targetType: "GIG",
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
  };
  const moderationService = {
    async createReport(userId, body) {
      calls.push(["report", String(userId), body]);
      return report;
    },
    async ownReports(userId, query) {
      calls.push(["ownReports", String(userId), query]);
      return [report];
    },
    async ownReport() {
      return report;
    },
    async adminReports(userId, query) {
      calls.push(["adminReports", String(userId), query]);
      return [report];
    },
    async adminReport() {
      return report;
    },
    async resolveReport(userId, reportId, body) {
      calls.push(["resolve", String(userId), reportId, body]);
      return { report, outcome: body.outcome };
    },
  };
  const accountService = {
    async requestDeletion(userId, body) {
      calls.push(["delete", String(userId), body]);
      return { status: "RECOVERY_WINDOW", recoveryDeadline: new Date() };
    },
    async cancelDeletion(body) {
      calls.push(["recover", body]);
      return { status: "ACTIVE" };
    },
  };
  const fileService = {
    async uploadMessageAttachment(userId, body) {
      calls.push(["upload", String(userId), body]);
      return { id: ATTACHMENT, fileName: body.fileName };
    },
    async content() {
      return {
        content: Buffer.from("image"),
        mediaType: "image/png",
        fileName: "safe.png",
      };
    },
    async remove(userId, attachmentId) {
      calls.push(["remove", String(userId), attachmentId]);
    },
  };
  const adminService = {
    async users(userId, query) {
      calls.push(["adminUsers", String(userId), query]);
      return [{ id: TARGET, email: "target@example.edu", status: "ACTIVE" }];
    },
  };
  const app = createApp({
    config,
    logger,
    databaseReadiness: () => ({ ready: true }),
    authService,
    moderationService,
    accountService,
    fileService,
    adminService,
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await work(`http://127.0.0.1:${server.address().port}`, calls);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("platform admin routes use the authenticated identity and strict query validation", () =>
  run(async (base, calls) => {
    const path = `${base}/api/v1/admin/users?status=ACTIVE&limit=20`;
    assert.equal(
      (await fetch(path, { headers: headers("admin") })).status,
      200,
    );
    assert.deepEqual(calls.at(-1), [
      "adminUsers",
      ADMIN,
      { status: "ACTIVE", limit: 20 },
    ]);
    assert.equal(
      (
        await fetch(`${base}/api/v1/admin/users?limit=5000`, {
          headers: headers("admin"),
        })
      ).status,
      422,
    );
  }));

test("report creation is authenticated, CSRF protected, strict, and session scoped", () =>
  run(async (base, calls) => {
    const path = `${base}/api/v1/reports`;
    const body = {
      targetType: "GIG",
      targetId: TARGET,
      reasonCode: "SPAM",
      details: "Repeated misleading content.",
    };
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("user", { json: true }),
          body: JSON.stringify({ ...body, reporterId: ADMIN }),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("user", { json: true }),
          body: JSON.stringify(body),
        })
      ).status,
      201,
    );
    assert.deepEqual(calls.at(-1), ["report", USER, body]);
  }));

test("moderation routes pass only the authenticated admin identity and validated decisions", () =>
  run(async (base, calls) => {
    assert.equal(
      (
        await fetch(`${base}/api/v1/admin/reports?status=SUBMITTED`, {
          headers: headers("admin"),
        })
      ).status,
      200,
    );
    assert.deepEqual(calls.at(-1).slice(0, 2), ["adminReports", ADMIN]);
    const path = `${base}/api/v1/admin/reports/${REPORT}:resolve`;
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("admin", { json: true }),
          body: JSON.stringify({
            outcome: "DELETE_EVERYTHING",
            reasonCode: "X",
          }),
        })
      ).status,
      422,
    );
    const body = { outcome: "NO_VIOLATION", reasonCode: "REVIEWED" };
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("admin", { json: true }),
          body: JSON.stringify(body),
        })
      ).status,
      200,
    );
    assert.deepEqual(calls.at(-1), ["resolve", ADMIN, REPORT, body]);
  }));

test("account deletion requires exact confirmation while recovery uses no session identity", () =>
  run(async (base, calls) => {
    const path = `${base}/api/v1/users/me/account-deletion`;
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("user", { json: true }),
          body: JSON.stringify({ password: "secret", confirmation: "DELETE" }),
        })
      ).status,
      422,
    );
    const body = {
      password: "secret",
      confirmation: "DELETE MY ACCOUNT",
    };
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("user", { json: true }),
          body: JSON.stringify(body),
        })
      ).status,
      202,
    );
    assert.deepEqual(calls.at(-1), ["delete", USER, body]);
    assert.equal(
      (
        await fetch(`${path}:cancel`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": "recover-account-0001",
          },
          body: JSON.stringify({
            email: "student@example.edu",
            password: "secret",
          }),
        })
      ).status,
      200,
    );
    assert.equal(calls.at(-1)[0], "recover");
  }));

test("attachment API validates type-shaped input and protects writes with the session", () =>
  run(async (base, calls) => {
    const path = `${base}/api/v1/attachments/messages`;
    const body = {
      conversationId: TARGET,
      fileName: "diagram.png",
      mediaType: "image/png",
      dataBase64: "iVBORw0KGgo=",
    };
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("user", { json: true }),
          body: JSON.stringify({ ...body, uploaderId: ADMIN }),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("user", { json: true }),
          body: JSON.stringify(body),
        })
      ).status,
      201,
    );
    assert.deepEqual(calls.at(-1), ["upload", USER, body]);
    const content = await fetch(
      `${base}/api/v1/attachments/${ATTACHMENT}/content`,
      { headers: headers("user") },
    );
    assert.equal(content.status, 200);
    assert.equal(content.headers.get("cache-control"), "private, no-store");
    assert.equal(content.headers.get("x-content-type-options"), "nosniff");
  }));
