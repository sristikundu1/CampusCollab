import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { validateRequest } from "../../src/middleware/validate.js";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  opaqueTokenMatches,
} from "../../src/lib/crypto/opaque-token.js";
import { hashPassword, verifyPassword } from "../../src/lib/crypto/password.js";
import { availabilityRequest } from "../../src/modules/profiles/profile.validation.js";
import {
  invitationListRequest,
  joinListRequest,
} from "../../src/modules/participation/participation.validation.js";
import { createProfileService } from "../../src/modules/profiles/profile.service.js";
import { listMineRequest } from "../../src/modules/gigs/gig.validation.js";

test("validation middleware parses params, query, and body into request.validated", () => {
  const middleware = validateRequest(
    z.object({
      params: z.object({ id: z.string().length(24) }),
      query: z.object({ limit: z.coerce.number().int() }),
      body: z.object({ name: z.string() }).strict(),
    }),
  );
  const request = {
    params: { id: "a".repeat(24) },
    query: { limit: "10" },
    body: { name: "Campus" },
  };
  middleware(request, {}, (error) => assert.equal(error, undefined));
  assert.equal(request.validated.query.limit, 10);
});

test("opaque session material is random, hashed, and compared without storing the raw value", () => {
  const token = generateOpaqueToken();
  const secret = "test-only-secret-that-is-never-a-production-value";
  const hash = hashOpaqueToken(token, secret);
  assert.notEqual(hash, token);
  assert.equal(opaqueTokenMatches(token, hash, secret), true);
  assert.equal(opaqueTokenMatches(`${token}x`, hash, secret), false);
});

test("passwords use salted scrypt hashes and constant-time verification", async () => {
  const first = await hashPassword("StrongPassword1");
  const second = await hashPassword("StrongPassword1");
  assert.notEqual(first, second);
  assert.equal(first.includes("StrongPassword1"), false);
  assert.equal(await verifyPassword("StrongPassword1", first), true);
  assert.equal(await verifyPassword("WrongPassword1", first), false);
});

test("availability rejects contradictory state and weekly-hour combinations", () => {
  const request = (body) => ({ params: {}, query: {}, body });
  assert.equal(
    availabilityRequest.safeParse(
      request({ status: "UNAVAILABLE", hoursPerWeek: 20 }),
    ).success,
    false,
  );
  assert.equal(
    availabilityRequest.safeParse(
      request({ status: "AVAILABLE", hoursPerWeek: 0 }),
    ).success,
    false,
  );
  assert.equal(
    availabilityRequest.safeParse(
      request({ status: "LIMITED", hoursPerWeek: 8 }),
    ).success,
    true,
  );
});

test("participation list filters reject undocumented lifecycle states", () => {
  const request = (schema, status) =>
    schema.safeParse({ params: {}, query: { status }, body: undefined })
      .success;
  assert.equal(request(joinListRequest, "NOT_A_REAL_STATE"), false);
  assert.equal(request(invitationListRequest, "WITHDRAWN"), false);
  assert.equal(request(joinListRequest, "WITHDRAWN"), true);
  assert.equal(request(invitationListRequest, "REVOKED"), true);
});

test("owned gig views accept simplified filters without changing lifecycle states", () => {
  const parse = (view) =>
    listMineRequest.safeParse({ params: {}, query: { view }, body: undefined });
  for (const view of ["DRAFT", "PUBLISHED", "ASSIGNED", "CLOSED", "ARCHIVED"])
    assert.equal(parse(view).success, true);
  assert.equal(parse("PENDING").success, false);
  assert.equal(parse("COMPLETED").success, false);
});

test("portfolio updates validate dates after merging with stored values", async () => {
  let saved = false;
  const item = {
    _id: "cccccccccccccccccccccccc",
    userId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    startedAt: new Date("2026-06-01T00:00:00.000Z"),
    endedAt: undefined,
    version: 0,
    save: async () => {
      saved = true;
    },
  };
  const service = createProfileService({
    PortfolioModel: { findOne: async () => item },
    ProfileModel: {},
    SkillModel: {},
    AffiliationModel: {},
    UniversityModel: {},
  });
  await assert.rejects(
    service.updatePortfolio(item.userId, item._id, {
      endedAt: "2026-05-01T00:00:00.000Z",
    }),
    (error) => error.code === "VALIDATION_FAILED",
  );
  assert.equal(saved, false);
});
