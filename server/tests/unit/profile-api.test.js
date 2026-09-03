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

const USER_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const USER_B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const ITEM = "cccccccccccccccccccccccc";
const SKILL = "dddddddddddddddddddddddd";
const csrfSecret = "test-csrf-secret-with-more-than-thirty-two-characters";
const config = {
  nodeEnv: "test",
  clientUrl: "http://localhost:5173",
  trustProxy: false,
  isProduction: false,
  sessionCookieName: "campuscollab_session",
  sessionTtlDays: 30,
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
      user: { _id: token === "user-b-token" ? USER_B : USER_A },
      session: { _id: ITEM },
    };
  },
};

function createFakeProfileService(calls) {
  const profile = {
    userId: USER_A,
    displayName: "Sristi Kundu",
    visibility: "PLATFORM",
    skills: [],
    availability: { status: "UNAVAILABLE" },
    completionScore: 10,
  };
  return {
    async own(id) {
      calls.push(["own", String(id)]);
      return profile;
    },
    async publicProfile(id) {
      calls.push(["public", String(id)]);
      return profile;
    },
    async create(id, body) {
      calls.push(["create", String(id), body]);
      return { ...profile, ...body };
    },
    async update(id, body) {
      calls.push(["update", String(id), body]);
      return { ...profile, ...body };
    },
    async replaceSkills(id, skills) {
      calls.push(["skills", String(id), skills]);
      return { ...profile, skills };
    },
    async updateAvailability(id, availability) {
      calls.push(["availability", String(id), availability]);
      return { ...profile, availability };
    },
    async listOwnPortfolio(id) {
      calls.push(["portfolio-list", String(id)]);
      return [];
    },
    async publicPortfolio() {
      return [];
    },
    async createPortfolio(id, body) {
      calls.push(["portfolio-create", String(id), body]);
      return { id: ITEM, ...body };
    },
    async getPortfolio() {
      return {
        id: ITEM,
        title: "Public work",
        description: "Safe projection",
        status: "PUBLISHED",
      };
    },
    async updatePortfolio(id, itemId, body) {
      calls.push(["portfolio-update", String(id), itemId, body]);
      return { id: itemId, ...body };
    },
    async deletePortfolio(id, itemId) {
      calls.push(["portfolio-delete", String(id), itemId]);
      if (String(id) === USER_B) throw new NotFoundError();
    },
  };
}

async function withServer(work) {
  const calls = [];
  const app = createApp({
    config,
    logger,
    databaseReadiness: () => ({ ready: true, status: "CONNECTED" }),
    authService,
    profileService: createFakeProfileService(calls),
    skillService: {
      async list() {
        return [{ id: SKILL, name: "React", category: "Frontend" }];
      },
    },
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await work(`http://127.0.0.1:${server.address().port}`, calls);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function authHeaders(token = "user-a-token", mutate = false) {
  return {
    cookie: `campuscollab_session=${token}`,
    ...(mutate
      ? {
          "x-csrf-token": hashOpaqueToken(token, csrfSecret),
          "content-type": "application/json",
        }
      : {}),
  };
}

test("own profile read requires authentication and uses session identity", async () =>
  withServer(async (base, calls) => {
    assert.equal((await fetch(`${base}/api/v1/profiles/me`)).status, 401);
    const response = await fetch(`${base}/api/v1/profiles/me`, {
      headers: authHeaders(),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls.at(-1), ["own", USER_A]);
  }));

test("profile create and update use authenticated owner and reject unknown fields", async () =>
  withServer(async (base, calls) => {
    const create = await fetch(`${base}/api/v1/profiles/me`, {
      method: "POST",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({ displayName: "Sristi Kundu", bio: "Builder" }),
    });
    assert.equal(create.status, 201);
    assert.deepEqual(calls.at(-1).slice(0, 2), ["create", USER_A]);
    const update = await fetch(`${base}/api/v1/profiles/me`, {
      method: "PATCH",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({ headline: "MERN developer" }),
    });
    assert.equal(update.status, 200);
    assert.deepEqual(calls.at(-1).slice(0, 2), ["update", USER_A]);
    const avatar = await fetch(`${base}/api/v1/profiles/me`, {
      method: "PATCH",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({
        avatarUrl: "data:image/png;base64,aGVsbG8=",
      }),
    });
    assert.equal(avatar.status, 200);
    assert.equal(calls.at(-1)[2].avatarUrl.startsWith("data:image/png"), true);
    const invalidAvatar = await fetch(`${base}/api/v1/profiles/me`, {
      method: "PATCH",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({ avatarUrl: "https://unsafe.example/avatar.png" }),
    });
    assert.equal(invalidAvatar.status, 422);
    const massAssignment = await fetch(`${base}/api/v1/profiles/me`, {
      method: "PATCH",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({ userId: USER_B, completionScore: 100 }),
    });
    assert.equal(massAssignment.status, 422);
  }));

test("skill replacement prevents duplicates and foreign identity input", async () =>
  withServer(async (base, calls) => {
    const duplicate = await fetch(`${base}/api/v1/profiles/me/skills`, {
      method: "PUT",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({
        skills: [
          { skillId: SKILL, level: "BEGINNER" },
          { skillId: SKILL, level: "ADVANCED" },
        ],
      }),
    });
    assert.equal(duplicate.status, 422);
    const success = await fetch(`${base}/api/v1/profiles/me/skills`, {
      method: "PUT",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({
        skills: [{ skillId: SKILL, level: "INTERMEDIATE" }],
      }),
    });
    assert.equal(success.status, 200);
    assert.deepEqual(calls.at(-1).slice(0, 2), ["skills", USER_A]);
  }));

test("availability accepts approved states and rejects invented values", async () =>
  withServer(async (base, calls) => {
    const invalid = await fetch(`${base}/api/v1/profiles/me/availability`, {
      method: "PATCH",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({ status: "OPEN_TO_WORK" }),
    });
    assert.equal(invalid.status, 422);
    const valid = await fetch(`${base}/api/v1/profiles/me/availability`, {
      method: "PATCH",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({ status: "AVAILABLE", hoursPerWeek: 15 }),
    });
    assert.equal(valid.status, 200);
    assert.deepEqual(calls.at(-1).slice(0, 2), ["availability", USER_A]);
  }));

test("portfolio create, read, update and delete enforce authenticated owner", async () =>
  withServer(async (base, calls) => {
    const body = {
      title: "CampusCollab",
      description: "Student collaboration platform",
      skillIds: [SKILL],
      externalLinks: [
        { type: "REPOSITORY", url: "https://github.com/example/repo" },
      ],
      status: "PUBLISHED",
    };
    assert.equal(
      (
        await fetch(`${base}/api/v1/profiles/me/portfolio-items`, {
          method: "POST",
          headers: authHeaders("user-a-token", true),
          body: JSON.stringify(body),
        })
      ).status,
      201,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/portfolio-items/${ITEM}`)).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/portfolio-items/${ITEM}`, {
          method: "PATCH",
          headers: authHeaders("user-a-token", true),
          body: JSON.stringify({ title: "Updated title" }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/portfolio-items/${ITEM}`, {
          method: "DELETE",
          headers: authHeaders("user-a-token", true),
        })
      ).status,
      204,
    );
    assert.ok(
      calls.some(([name, id]) => name === "portfolio-delete" && id === USER_A),
    );
  }));

test("cross-user portfolio deletion is concealed as not found", async () =>
  withServer(async (base) => {
    const response = await fetch(`${base}/api/v1/portfolio-items/${ITEM}`, {
      method: "DELETE",
      headers: authHeaders("user-b-token", true),
    });
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "RESOURCE_NOT_FOUND");
  }));

test("invalid identifiers and MongoDB operators are safely rejected", async () =>
  withServer(async (base) => {
    assert.equal(
      (await fetch(`${base}/api/v1/profiles/not-an-id`)).status,
      422,
    );
    const unsafe = await fetch(`${base}/api/v1/profiles/me`, {
      method: "PATCH",
      headers: authHeaders("user-a-token", true),
      body: JSON.stringify({ bio: { $gt: "" } }),
    });
    assert.equal(unsafe.status, 400);
    assert.equal((await unsafe.json()).error.code, "UNSAFE_INPUT");
  }));

test("public profile and skill catalogue expose only their safe projections", async () =>
  withServer(async (base) => {
    const profile = await (
      await fetch(`${base}/api/v1/profiles/${USER_A}`)
    ).json();
    assert.equal(profile.data.profile.displayName, "Sristi Kundu");
    assert.equal("passwordHash" in profile.data.profile, false);
    assert.equal("securityVersion" in profile.data.profile, false);
    const skills = await (await fetch(`${base}/api/v1/skills?q=Rea`)).json();
    assert.equal(skills.data.skills[0].name, "React");
  }));
