import assert from "node:assert/strict";
import test from "node:test";
import { hashOpaqueToken } from "../../src/lib/crypto/opaque-token.js";
import {
  createAuthService,
  generateVerificationCode,
} from "../../src/modules/auth/auth.service.js";

const sessionSecret =
  "test-session-secret-with-more-than-thirty-two-characters";

function serviceWith(overrides = {}) {
  return createAuthService({
    config: { sessionSecret },
    emailService: { sendVerification: async () => {} },
    UserModel: {},
    AffiliationModel: {},
    ChallengeModel: {},
    transaction: async (work) => work("test-session"),
    createCode: () => "123456",
    ...overrides,
  });
}

test("verification codes are always zero-padded six-digit values", () => {
  for (let index = 0; index < 200; index += 1)
    assert.match(generateVerificationCode(), /^\d{6}$/);
});

test("a valid code is consumed and activates the verified account", async () => {
  const updates = { challenge: [], affiliation: [], user: [] };
  const challenge = {
    _id: "challenge-id",
    userId: "user-id",
    affiliationId: "affiliation-id",
    tokenHash: hashOpaqueToken("123456", sessionSecret),
    attemptCount: 1,
  };
  const authService = serviceWith({
    UserModel: {
      findOne: async () => ({ _id: "user-id" }),
      updateOne: async (...args) => {
        updates.user.push(args);
        return { modifiedCount: 1 };
      },
    },
    AffiliationModel: {
      updateOne: async (...args) => {
        updates.affiliation.push(args);
        return { modifiedCount: 1 };
      },
    },
    ChallengeModel: {
      findOneAndUpdate: () => ({ select: async () => challenge }),
      updateOne: async (...args) => {
        updates.challenge.push(args);
        return { modifiedCount: 1 };
      },
    },
  });

  const result = await authService.verifyEmail({
    email: "student@example.edu",
    code: "123456",
  });

  assert.equal(result.message, "Your university email has been verified.");
  assert.equal(updates.challenge[0][1].status, "CONSUMED");
  assert.equal(updates.affiliation[0][1].status, "VERIFIED");
  assert.equal(updates.affiliation[0][1].verificationMethod, "EMAIL_CODE");
  assert.equal(updates.user[0][1].status, "ACTIVE");
  assert.equal(updates.user[0][2].session, "test-session");
});

test("five incorrect attempts revoke the verification challenge", async () => {
  const updates = [];
  const authService = serviceWith({
    UserModel: { findOne: async () => ({ _id: "user-id" }) },
    ChallengeModel: {
      findOneAndUpdate: () => ({
        select: async () => ({
          _id: "challenge-id",
          tokenHash: hashOpaqueToken("123456", sessionSecret),
          attemptCount: 5,
        }),
      }),
      updateOne: async (...args) => {
        updates.push(args);
        return { modifiedCount: 1 };
      },
    },
  });

  await assert.rejects(
    authService.verifyEmail({
      email: "student@example.edu",
      code: "999999",
    }),
    (error) => error.code === "INVALID_OR_EXPIRED_CODE" && error.status === 409,
  );
  assert.equal(updates.length, 1);
  assert.equal(updates[0][1].status, "REVOKED");
});

test("resending supersedes prior codes and never persists plaintext", async () => {
  const created = [];
  const sent = [];
  const authService = serviceWith({
    UserModel: { findOne: async () => ({ _id: "user-id" }) },
    AffiliationModel: {
      findOne: async () => ({ _id: "affiliation-id" }),
    },
    ChallengeModel: {
      updateMany: async () => ({ modifiedCount: 1 }),
      create: async (value) => created.push(value),
    },
    emailService: {
      sendVerification: async (...args) => sent.push(args),
    },
    createCode: () => "004200",
  });

  const result = await authService.resendVerification("student@example.edu");

  assert.equal(result.expiresInSeconds, 600);
  assert.deepEqual(sent[0], ["student@example.edu", "004200", 10]);
  assert.equal(created[0].tokenHash, hashOpaqueToken("004200", sessionSecret));
  assert.equal("code" in created[0], false);
  assert.ok(created[0].expiresAt.getTime() - Date.now() <= 600_000);
});
