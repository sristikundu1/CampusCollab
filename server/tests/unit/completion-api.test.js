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

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const PARTICIPANT = "bbbbbbbbbbbbbbbbbbbbbbbb";
const OTHER = "cccccccccccccccccccccccc";
const RESOURCE = "dddddddddddddddddddddddd";
const RECORD = "eeeeeeeeeeeeeeeeeeeeeeee";
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
const ids = { owner: OWNER, participant: PARTICIPANT, other: OTHER };
const authService = {
  async authenticate(token) {
    if (!token) throw new AuthenticationError();
    return { user: { _id: ids[token] }, session: { _id: RESOURCE } };
  },
};

function headers(token, { json = false, key = true } = {}) {
  return {
    cookie: `campuscollab_session=${token}`,
    ...(json
      ? {
          "content-type": "application/json",
          "x-csrf-token": hashOpaqueToken(token, csrfSecret),
        }
      : {}),
    ...(key ? { "idempotency-key": "completion-command-0001" } : {}),
  };
}

async function run(work) {
  const calls = [];
  const record = {
    id: RECORD,
    ownerId: OWNER,
    participantId: PARTICIPANT,
    status: "PENDING_ACKNOWLEDGEMENT",
  };
  const completionService = {
    async request(userId, body, context) {
      calls.push(["request", String(userId), body, context]);
      return { records: [record], count: 1 };
    },
    async list(userId, query) {
      calls.push(["list", String(userId), query]);
      return [record];
    },
    async get(userId) {
      if (String(userId) === OTHER) throw new NotFoundError();
      return record;
    },
    async respond(userId, recordId, body) {
      calls.push(["respond", String(userId), recordId, body]);
      if (String(userId) !== PARTICIPANT) throw new NotFoundError();
      return { ...record, status: "COMPLETED" };
    },
  };
  const app = createApp({
    config,
    logger,
    databaseReadiness: () => ({ ready: true }),
    authService,
    completionService,
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await work(`http://127.0.0.1:${server.address().port}`, calls);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("completion request requires authentication, CSRF, idempotency, and strict input", () =>
  run(async (base, calls) => {
    const path = `${base}/api/v1/completion-records`;
    const body = { contextType: "GIG", contextId: RESOURCE };
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
          headers: headers("owner", { json: true, key: false }),
          body: JSON.stringify(body),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("owner", { json: true }),
          body: JSON.stringify({ ...body, ownerId: OTHER }),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("owner", { json: true }),
          body: JSON.stringify(body),
        })
      ).status,
      201,
    );
    assert.deepEqual(calls.at(-1).slice(0, 3), ["request", OWNER, body]);
  }));

test("completion reads and responses derive identity from the authenticated session", () =>
  run(async (base, calls) => {
    assert.equal(
      (
        await fetch(`${base}/api/v1/completion-records?role=PARTICIPANT`, {
          headers: headers("participant"),
        })
      ).status,
      200,
    );
    assert.deepEqual(calls.at(-1).slice(0, 2), ["list", PARTICIPANT]);
    assert.equal(
      (
        await fetch(`${base}/api/v1/completion-records/${RECORD}:respond`, {
          method: "POST",
          headers: headers("owner", { json: true }),
          body: JSON.stringify({ decision: "ACKNOWLEDGED" }),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/completion-records/${RECORD}:respond`, {
          method: "POST",
          headers: headers("participant", { json: true }),
          body: JSON.stringify({ decision: "ACKNOWLEDGED" }),
        })
      ).status,
      200,
    );
    assert.deepEqual(calls.at(-1), [
      "respond",
      PARTICIPANT,
      RECORD,
      { decision: "ACKNOWLEDGED" },
    ]);
  }));

test("completion validation rejects malformed IDs, invented decisions, and protected fields", () =>
  run(async (base, calls) => {
    for (const body of [
      { decision: "COMPLETED" },
      { decision: "ACKNOWLEDGED", participantId: OTHER },
      { decision: "ACKNOWLEDGED", status: "COMPLETED" },
    ])
      assert.equal(
        (
          await fetch(`${base}/api/v1/completion-records/${RECORD}:respond`, {
            method: "POST",
            headers: headers("participant", { json: true }),
            body: JSON.stringify(body),
          })
        ).status,
        422,
      );
    assert.equal(
      (
        await fetch(`${base}/api/v1/completion-records/not-an-id`, {
          headers: headers("participant"),
        })
      ).status,
      422,
    );
    assert.equal(calls.length, 0);
  }));
