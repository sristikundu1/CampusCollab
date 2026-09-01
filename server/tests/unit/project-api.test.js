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
const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa",
  STUDENT = "bbbbbbbbbbbbbbbbbbbbbbbb",
  OTHER = "cccccccccccccccccccccccc",
  PROJECT = "dddddddddddddddddddddddd",
  OPENING = "eeeeeeeeeeeeeeeeeeeeeeee",
  REQUEST = "ffffffffffffffffffffffff",
  INVITE = "111111111111111111111111",
  MEMBER = "222222222222222222222222";
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
      user: {
        _id: token === "owner" ? OWNER : token === "other" ? OTHER : STUDENT,
      },
      session: { _id: PROJECT },
    };
  },
};
const project = {
  id: PROJECT,
  title: "Accessible campus research portal",
  description:
    "A collaborative platform for sharing student research and opportunities.",
  projectType: "RESEARCH",
  skills: [],
  visibility: "PLATFORM",
  openings: [
    {
      id: OPENING,
      roleName: "Frontend contributor",
      description: "Build accessible interfaces.",
      skills: [],
      capacity: 1,
      filledCount: 0,
      remainingCapacity: 1,
      status: "OPEN",
    },
  ],
  acceptingMembers: true,
  status: "RECRUITING",
  owner: { id: OWNER, displayName: "Project Owner" },
  isOwner: true,
  isMember: false,
  version: 0,
};
function services(calls) {
  return {
    projectService: {
      async create(u, b) {
        calls.push(["create", String(u), b]);
        return project;
      },
      async list(q, u) {
        calls.push(["list", q, String(u || "")]);
        return {
          projects: [{ ...project, isOwner: false }],
          hasMore: false,
          nextCursor: null,
        };
      },
      async mine(u, q) {
        calls.push(["mine", String(u), q]);
        return { projects: [project], hasMore: false, nextCursor: null };
      },
      async get(id, u) {
        calls.push(["get", id, String(u || "")]);
        if (String(u) === OTHER) throw new NotFoundError();
        return project;
      },
      async update(u, id, b) {
        calls.push(["update", String(u), id, b]);
        if (String(u) !== OWNER) throw new NotFoundError();
        return project;
      },
      async publish(u, id) {
        calls.push(["publish", String(u), id]);
        if (String(u) !== OWNER) throw new NotFoundError();
        return project;
      },
      async transition(u, id, b) {
        calls.push(["transition", String(u), id, b]);
        return project;
      },
      async recruitment() {
        return project;
      },
      async addOpening() {
        return project.openings[0];
      },
      async updateOpening() {
        return project.openings[0];
      },
      async closeOpening() {
        return project.openings[0];
      },
      async reopenOpening() {
        return project.openings[0];
      },
    },
    participationService: {
      async submitJoin(u, p, o, b, c) {
        calls.push(["join", String(u), p, o, b, c]);
        return { id: REQUEST, status: "PENDING" };
      },
      async myJoins() {
        return { items: [], hasMore: false, nextCursor: null };
      },
      async projectJoins(u, p) {
        if (String(u) !== OWNER) throw new NotFoundError();
        return { items: [{ id: REQUEST }], hasMore: false, nextCursor: null };
      },
      async getJoin() {
        return { id: REQUEST };
      },
      async withdrawJoin() {
        return { id: REQUEST, status: "WITHDRAWN" };
      },
      async acceptJoin(u) {
        calls.push(["acceptJoin", String(u)]);
        if (String(u) !== OWNER) throw new NotFoundError();
        return { id: MEMBER };
      },
      async rejectJoin() {
        return { id: REQUEST };
      },
      async sendInvite(u, p, o, b) {
        calls.push(["invite", String(u), p, o, b]);
        if (String(u) !== OWNER) throw new NotFoundError();
        return { id: INVITE };
      },
      async myInvitations() {
        return { items: [], hasMore: false, nextCursor: null };
      },
      async projectInvitations() {
        return { items: [], hasMore: false, nextCursor: null };
      },
      async getInvitation() {
        return { id: INVITE };
      },
      async acceptInvitation(u) {
        calls.push(["acceptInvite", String(u)]);
        return { id: MEMBER };
      },
      async rejectInvitation() {
        return { id: INVITE };
      },
      async revokeInvitation() {
        return { id: INVITE };
      },
      async members() {
        return [];
      },
      async leave() {
        return { id: MEMBER };
      },
      async remove() {
        return { id: MEMBER };
      },
      async candidates() {
        return [];
      },
    },
  };
}
async function run(work) {
  const calls = [],
    s = services(calls),
    app = createApp({
      config,
      logger,
      databaseReadiness: () => ({ ready: true }),
      authService,
      ...s,
    }),
    server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await work(`http://127.0.0.1:${server.address().port}`, calls);
  } finally {
    await new Promise((r) => server.close(r));
  }
}
function headers(token = "owner", json = false, key = true) {
  return {
    cookie: `campuscollab_session=${token}`,
    ...(json
      ? {
          "content-type": "application/json",
          "x-csrf-token": hashOpaqueToken(token, csrfSecret),
        }
      : {}),
    ...(key ? { "idempotency-key": "project-command-0001" } : {}),
  };
}
const input = {
  title: project.title,
  description: project.description,
  projectType: "RESEARCH",
  visibility: "PLATFORM",
  requiredSkillIds: [],
  openings: [
    {
      roleName: "Frontend contributor",
      description: "Build accessible interfaces.",
      requiredSkillIds: [],
      capacity: 1,
    },
  ],
};
test("project discovery is public while creation uses authenticated session ownership", () =>
  run(async (base, calls) => {
    assert.equal((await fetch(`${base}/api/v1/projects`)).status, 200);
    assert.equal(
      (
        await fetch(`${base}/api/v1/projects`, {
          method: "POST",
          headers: headers("owner", true),
          body: JSON.stringify(input),
        })
      ).status,
      201,
    );
    assert.deepEqual(calls.at(-1).slice(0, 2), ["create", OWNER]);
  }));
test("project create rejects owner, role, capability, and lifecycle spoofing", () =>
  run(async (base, calls) => {
    for (const extra of [
      { ownerId: OTHER },
      { userId: OTHER },
      { status: "ACTIVE" },
      { role: "ADMIN" },
      { acceptingMembers: true },
    ])
      assert.equal(
        (
          await fetch(`${base}/api/v1/projects`, {
            method: "POST",
            headers: headers("owner", true),
            body: JSON.stringify({ ...input, ...extra }),
          })
        ).status,
        422,
      );
    assert.equal(calls.length, 0);
  }));
test("only the authenticated owner can edit or publish a project", () =>
  run(async (base, calls) => {
    assert.equal(
      (
        await fetch(`${base}/api/v1/projects/${PROJECT}`, {
          method: "PATCH",
          headers: headers("owner", true),
          body: JSON.stringify({ title: "Updated accessible campus project" }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/projects/${PROJECT}`, {
          method: "PATCH",
          headers: headers("other", true),
          body: JSON.stringify({ title: "Unauthorized project takeover" }),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/projects/${PROJECT}:publish`, {
          method: "POST",
          headers: headers("owner", true),
          body: "{}",
        })
      ).status,
      200,
    );
    assert.ok(calls.some((c) => c[0] === "publish" && c[1] === OWNER));
  }));
test("join requests ignore applicant identity from the body and require idempotency", () =>
  run(async (base, calls) => {
    const path = `${base}/api/v1/projects/${PROJECT}/openings/${OPENING}/join-requests`;
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("student", true, false),
          body: JSON.stringify({
            message: "I can contribute accessible React work.",
          }),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("student", true),
          body: JSON.stringify({
            message: "I can contribute accessible React work.",
            applicantId: OTHER,
          }),
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await fetch(path, {
          method: "POST",
          headers: headers("student", true),
          body: JSON.stringify({
            message: "I can contribute accessible React work.",
          }),
        })
      ).status,
      201,
    );
    assert.equal(calls.at(-1)[1], STUDENT);
  }));
test("join acceptance and invitations use owner and invitee identities from sessions", () =>
  run(async (base, calls) => {
    assert.equal(
      (
        await fetch(`${base}/api/v1/join-requests/${REQUEST}:accept`, {
          method: "POST",
          headers: headers("other", true),
          body: "{}",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/join-requests/${REQUEST}:accept`, {
          method: "POST",
          headers: headers("owner", true),
          body: "{}",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(
          `${base}/api/v1/projects/${PROJECT}/openings/${OPENING}/invitations`,
          {
            method: "POST",
            headers: headers("owner", true),
            body: JSON.stringify({
              inviteeId: STUDENT,
              message: "Join our project",
              expiresInDays: 14,
            }),
          },
        )
      ).status,
      201,
    );
    assert.ok(
      calls.some(
        (c) =>
          c[0] === "invite" && c[1] === OWNER && c[4].inviteeId === STUDENT,
      ),
    );
  }));
test("invalid project identifiers, lifecycle injection, and duplicate query parameters are rejected", () =>
  run(async (base) => {
    assert.equal(
      (await fetch(`${base}/api/v1/projects/not-an-id`)).status,
      422,
    );
    assert.equal((await fetch(`${base}/api/v1/projects?q=a&q=b`)).status, 400);
    assert.equal(
      (
        await fetch(`${base}/api/v1/projects/${PROJECT}:transition`, {
          method: "POST",
          headers: headers("owner", true),
          body: JSON.stringify({ toStatus: "COMPLETED" }),
        })
      ).status,
      422,
    );
  }));
