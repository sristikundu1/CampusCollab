import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createApp } from "../../src/app.js";
import { createLogger } from "../../src/config/logger.js";
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from "../../src/errors/application-error.js";
import { hashOpaqueToken } from "../../src/lib/crypto/opaque-token.js";

const APPLICANT = "aaaaaaaaaaaaaaaaaaaaaaaa",
  OWNER = "bbbbbbbbbbbbbbbbbbbbbbbb",
  GIG = "cccccccccccccccccccccccc",
  PROPOSAL = "dddddddddddddddddddddddd";
const csrfSecret = "test-csrf-secret-with-more-than-thirty-two-characters";
const config = {
  nodeEnv: "test",
  clientUrl: "http://localhost:5173",
  trustProxy: false,
  isProduction: false,
  sessionCookieName: "campuscollab_session",
  sessionSecret: "test-session-secret-with-more-than-thirty-two-characters",
  csrfSecret,
  smtp: null,
  requireEmailVerification: false,
};
const logger = createLogger({ level: "silent", environment: "test" });
const authService = {
  async authenticate(token) {
    if (!token) throw new AuthenticationError();
    return {
      user: { _id: token === "owner-token" ? OWNER : APPLICANT },
      session: { _id: PROPOSAL },
    };
  },
};
const proposal = {
  id: PROPOSAL,
  gig: { id: GIG, title: "Campus design system", status: "PUBLISHED" },
  applicant: { id: APPLICANT, displayName: "Applicant" },
  status: "SUBMITTED",
  currentRevision: {
    coverMessage: "I can deliver this campus project carefully.",
    proposedBudget: { type: "UNPAID" },
  },
  revisions: [],
};
function fakeService(calls) {
  return {
    async submit(userId, gigId, body, context) {
      calls.push(["submit", String(userId), gigId, body, context]);
      if (String(userId) === OWNER)
        throw new ConflictError("SELF_PROPOSAL_NOT_ALLOWED");
      return proposal;
    },
    async mine(userId, query) {
      calls.push(["mine", String(userId), query]);
      return { proposals: [proposal], nextCursor: null, hasMore: false };
    },
    async get(userId, id) {
      calls.push(["get", String(userId), id]);
      if (String(userId) === OWNER && id !== PROPOSAL)
        throw new NotFoundError();
      return proposal;
    },
    async update(userId, id, body) {
      calls.push(["update", String(userId), id, body]);
      if (String(userId) === OWNER) throw new NotFoundError();
      return { ...proposal, currentRevision: body };
    },
    async withdraw(userId, id) {
      calls.push(["withdraw", String(userId), id]);
      if (String(userId) === OWNER) throw new NotFoundError();
      return { ...proposal, status: "WITHDRAWN" };
    },
    async forGig(userId, gigId, query) {
      calls.push(["forGig", String(userId), gigId, query]);
      if (String(userId) !== OWNER) throw new NotFoundError();
      return {
        proposals: [proposal],
        gig: { id: GIG, title: "Campus design system" },
        nextCursor: null,
        hasMore: false,
      };
    },
    async decide(userId, id, action, body) {
      calls.push(["decide", String(userId), id, action, body]);
      if (String(userId) !== OWNER) throw new NotFoundError();
      return {
        proposal: {
          ...proposal,
          status:
            action === "accept"
              ? "ACCEPTED"
              : action === "reject"
                ? "REJECTED"
                : "SHORTLISTED",
        },
        gig: { id: GIG },
      };
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
    proposalService: fakeService(calls),
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await work(`http://127.0.0.1:${server.address().port}`, calls);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
function headers(token = "applicant-token", json = false, idempotency = true) {
  return {
    cookie: `campuscollab_session=${token}`,
    ...(json
      ? {
          "x-csrf-token": hashOpaqueToken(token, csrfSecret),
          "content-type": "application/json",
        }
      : {}),
    ...(idempotency ? { "idempotency-key": "proposal-request-0001" } : {}),
  };
}
const valid = {
  coverMessage:
    "I can deliver this campus project carefully and communicate progress.",
  proposedBudget: { type: "UNPAID" },
  proposedDuration: "Two weeks",
  availability: "Available ten hours weekly",
};

test("proposal submission requires authentication, CSRF, idempotency, and strict validation", () =>
  withServer(async (base, calls) => {
    assert.equal(
      (
        await fetch(`${base}/api/v1/gigs/${GIG}/proposals`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(valid),
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/gigs/${GIG}/proposals`, {
          method: "POST",
          headers: headers("applicant-token", true, false),
          body: JSON.stringify(valid),
        })
      ).status,
      422,
    );
    for (const injected of [
      { applicantId: OWNER },
      { userId: OWNER },
      { status: "ACCEPTED" },
      { role: "ADMIN" },
    ])
      assert.equal(
        (
          await fetch(`${base}/api/v1/gigs/${GIG}/proposals`, {
            method: "POST",
            headers: headers("applicant-token", true),
            body: JSON.stringify({ ...valid, ...injected }),
          })
        ).status,
        422,
      );
    assert.equal(calls.length, 0);
  }));

test("proposal submission uses only authenticated session identity", () =>
  withServer(async (base, calls) => {
    const response = await fetch(`${base}/api/v1/gigs/${GIG}/proposals`, {
      method: "POST",
      headers: headers("applicant-token", true),
      body: JSON.stringify(valid),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(calls.at(-1).slice(0, 3), ["submit", APPLICANT, GIG]);
    assert.equal(calls.at(-1)[4].idempotencyKey, "proposal-request-0001");
  }));

test("applicant can list, view, revise, and withdraw only through authenticated identity", () =>
  withServer(async (base, calls) => {
    assert.equal(
      (await fetch(`${base}/api/v1/proposals/mine`, { headers: headers() }))
        .status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/proposals/${PROPOSAL}`, {
          headers: headers(),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/proposals/${PROPOSAL}`, {
          method: "PATCH",
          headers: headers("applicant-token", true),
          body: JSON.stringify(valid),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/proposals/${PROPOSAL}:withdraw`, {
          method: "POST",
          headers: headers("applicant-token", true),
          body: "{}",
        })
      ).status,
      200,
    );
    assert.equal(calls.at(-1)[0], "withdraw");
  }));

test("owner review and decisions conceal resources from unrelated users", () =>
  withServer(async (base, calls) => {
    assert.equal(
      (
        await fetch(`${base}/api/v1/gigs/${GIG}/proposals`, {
          headers: headers("owner-token"),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/gigs/${GIG}/proposals`, {
          headers: headers("applicant-token"),
        })
      ).status,
      404,
    );
    for (const action of ["shortlist", "accept", "reject"]) {
      assert.equal(
        (
          await fetch(`${base}/api/v1/proposals/${PROPOSAL}:${action}`, {
            method: "POST",
            headers: headers("owner-token", true),
            body: "{}",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await fetch(`${base}/api/v1/proposals/${PROPOSAL}:${action}`, {
            method: "POST",
            headers: headers("applicant-token", true),
            body: "{}",
          })
        ).status,
        404,
      );
    }
    assert.equal(
      calls.filter((entry) => entry[0] === "decide" && entry[1] === OWNER)
        .length,
      3,
    );
  }));

test("proposal identifiers, filters, and duplicate query parameters are rejected safely", () =>
  withServer(async (base) => {
    assert.equal(
      (
        await fetch(`${base}/api/v1/proposals/not-an-id`, {
          headers: headers(),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/proposals/mine?status=INVENTED`, {
          headers: headers(),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/proposals/mine?sort=NEWEST&sort=OLDEST`, {
          headers: headers(),
        })
      ).status,
      400,
    );
  }));
