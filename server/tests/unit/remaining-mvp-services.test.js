import assert from "node:assert/strict";
import test from "node:test";
import { createAccountService } from "../../src/modules/users/account.service.js";
import { createFileService } from "../../src/modules/files/file.service.js";
import { createModerationService } from "../../src/modules/moderation/moderation.service.js";
import { createAdminService } from "../../src/modules/admin/admin.service.js";

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const ADMIN = "cccccccccccccccccccccccc";
const CONVERSATION = "dddddddddddddddddddddddd";
const TARGET = "eeeeeeeeeeeeeeeeeeeeeeee";

function query(value) {
  return {
    select() {
      return this;
    },
    session() {
      return this;
    },
    lean() {
      return this;
    },
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

test("message attachments validate image signatures and conversation authorization", async () => {
  let stored;
  const conversation = {
    _id: CONVERSATION,
    status: "OPEN",
    participants: [
      { userId: USER, status: "ACTIVE", canSend: true },
      { userId: OTHER, status: "READ_ONLY", canSend: false },
    ],
  };
  const AttachmentModel = {
    create: async (value) => {
      stored = { _id: TARGET, ...value };
      return stored;
    },
  };
  const service = createFileService({
    AttachmentModel,
    ConversationModel: { findById: () => query(conversation) },
  });
  const png = Buffer.from("89504e470d0a1a0a00000000", "hex").toString("base64");
  const uploaded = await service.uploadMessageAttachment(USER, {
    conversationId: CONVERSATION,
    fileName: "diagram.png",
    mediaType: "image/png",
    dataBase64: png,
  });
  assert.equal(uploaded.mediaType, "image/png");
  assert.equal(stored.uploaderId, USER);
  assert.equal(stored.scanStatus, "CLEAN");
  assert.equal(stored.status, "AVAILABLE");
  assert.ok(stored.integrityHash);
  await assert.rejects(
    service.uploadMessageAttachment(USER, {
      conversationId: CONVERSATION,
      fileName: "fake.jpg",
      mediaType: "image/jpeg",
      dataBase64: png,
    }),
    (error) => error.code === "VALIDATION_FAILED",
  );
  await assert.rejects(
    service.uploadMessageAttachment(OTHER, {
      conversationId: CONVERSATION,
      fileName: "diagram.png",
      mediaType: "image/png",
      dataBase64: png,
    }),
    (error) => error.code === "CONVERSATION_READ_ONLY",
  );
});

function accountFixture(status = "ACTIVE") {
  const revoked = [];
  const jobs = [];
  const user = {
    _id: USER,
    email: "student@example.edu",
    status,
    passwordHash: "hashed",
    legalOrSafetyHold: false,
    version: 0,
  };
  if (status === "DELETION_PENDING") {
    user.deletionScheduledFor = new Date(Date.now() + 60_000);
  }
  const UserModel = {
    findById: () => query(user),
    findOne: () => query(user.status === "DELETION_PENDING" ? user : null),
    findOneAndUpdate: (filter, update) => {
      if (filter.status !== user.status) return query(null);
      Object.assign(user, update.$set);
      for (const key of Object.keys(update.$unset ?? {})) delete user[key];
      user.version += update.$inc.version;
      return query(user);
    },
  };
  const service = createAccountService({
    UserModel,
    SessionModel: {
      updateMany: async (_filter, update) => {
        revoked.push(update.$set);
      },
    },
    DeletionModel: {
      create: async ([value]) => {
        const job = { _id: TARGET, ...value };
        jobs.push(job);
        return [job];
      },
      updateOne: async (_filter, update) => {
        Object.assign(jobs[0] ?? {}, update.$set);
        return { modifiedCount: 1 };
      },
    },
    AuditModel: null,
    OutboxModel: null,
    transaction: async (work) => work({}),
    passwordMatches: async (password) => password === "correct-password",
  });
  return { service, user, revoked, jobs };
}

test("account deletion revokes sessions and creates a recoverable 30-day job", async () => {
  const { service, user, revoked, jobs } = accountFixture();
  const deletion = await service.requestDeletion(
    USER,
    { password: "correct-password", confirmation: "DELETE MY ACCOUNT" },
    { requestId: "delete-1" },
  );
  assert.equal(user.status, "DELETION_PENDING");
  assert.equal(deletion.status, "RECOVERY_WINDOW");
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].steps.length, 4);
  assert.equal(revoked[0].revokeReason, "ACCOUNT_DELETION_REQUESTED");
  const days =
    (deletion.recoveryDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  assert.ok(days > 29.9 && days <= 30);
});

test("account deletion recovery requires credentials and an open recovery window", async () => {
  const { service, user } = accountFixture("DELETION_PENDING");
  await assert.rejects(
    service.cancelDeletion(
      { email: user.email, password: "wrong-password" },
      { requestId: "recover-wrong" },
    ),
    (error) => error.code === "INVALID_RECOVERY_CREDENTIALS",
  );
  const recovery = await service.cancelDeletion(
    { email: user.email, password: "correct-password" },
    { requestId: "recover-1" },
  );
  assert.equal(recovery.status, "ACTIVE");
  assert.equal(user.status, "ACTIVE");
  assert.equal(user.deletionScheduledFor, undefined);
});

test("reports limit duplicates and never expose confidential reporter details", async () => {
  const reports = [];
  const ReportModel = {
    exists: async (filter) =>
      reports.some(
        (item) =>
          String(item.reporterId) === String(filter.reporterId) &&
          item.reasonCode === filter.reasonCode,
      ),
    create: async (value) => {
      const report = {
        _id: TARGET,
        status: "SUBMITTED",
        priority: "NORMAL",
        ...value,
      };
      reports.push(report);
      return report;
    },
  };
  const service = createModerationService({
    ReportModel,
    targetModels: { GIG: { exists: async () => true } },
    AuditModel: null,
  });
  const input = {
    targetType: "GIG",
    targetId: TARGET,
    reasonCode: "SPAM",
    details: "Repeated misleading content.",
  };
  const safe = await service.createReport(USER, input, {
    requestId: "report-1",
  });
  assert.equal(safe.status, "SUBMITTED");
  assert.equal("reporterId" in safe, false);
  assert.equal("details" in safe, false);
  await assert.rejects(
    service.createReport(USER, input, { requestId: "report-2" }),
    (error) => error.code === "DUPLICATE_REPORT",
  );
});

test("the moderation queue requires an active named admin grant", async () => {
  const admin = {
    _id: ADMIN,
    status: "ACTIVE",
    capabilities: ["ADMIN"],
    adminGrants: [],
  };
  const reports = [
    {
      _id: TARGET,
      reporterId: USER,
      targetType: "GIG",
      targetId: TARGET,
      reasonCode: "SPAM",
      details: "Evidence",
      status: "SUBMITTED",
      priority: "NORMAL",
      submittedAt: new Date(),
    },
  ];
  const service = createModerationService({
    UserModel: { findById: () => query(admin) },
    ReportModel: { find: () => query(reports) },
    AuditModel: null,
  });
  await assert.rejects(
    service.adminReports(ADMIN, { limit: 30 }),
    (error) => error.code === "ADMIN_SCOPE_REQUIRED",
  );
  admin.adminGrants.push({ capability: "reports:read", scope: "PLATFORM" });
  const queue = await service.adminReports(ADMIN, { limit: 30 });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].reporterId, USER);
});

test("platform administration requires both ADMIN capability and a named grant", async () => {
  const admin = {
    _id: ADMIN,
    status: "ACTIVE",
    capabilities: ["ADMIN"],
    adminGrants: [],
  };
  const listedUsers = [
    {
      _id: USER,
      email: "student@example.edu",
      status: "ACTIVE",
      capabilities: ["STUDENT"],
      createdAt: new Date(),
    },
  ];
  const service = createAdminService({
    UserModel: {
      findById: () => query(admin),
      find: () => query(listedUsers),
    },
    AuditModel: null,
  });
  await assert.rejects(
    service.users(ADMIN, { limit: 20 }),
    (error) => error.code === "ADMIN_SCOPE_REQUIRED",
  );
  admin.adminGrants.push({ capability: "users:read", scope: "PLATFORM" });
  const users = await service.users(ADMIN, { limit: 20 });
  assert.equal(users.length, 1);
  assert.equal(users[0].email, "student@example.edu");
  assert.equal("adminGrants" in users[0], false);
});
