import assert from "node:assert/strict";
import test from "node:test";
import { createParticipationService } from "../../src/modules/participation/participation.service.js";

const applicantId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const projectId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const openingId = "cccccccccccccccccccccccc";

function queryRows(rows, capture) {
  let limit = rows.length;
  return {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    limit(value) {
      limit = value;
      return this;
    },
    lean() {
      capture.limit = limit;
      return Promise.resolve(rows.slice(0, limit));
    },
  };
}

test("participation lists return a signed cursor and apply it to the next query", async () => {
  const now = Date.now();
  const rows = [0, 1, 2].map((offset) => ({
    _id: `${offset + 1}`.repeat(24),
    projectId,
    openingId,
    applicantId,
    applicantSnapshot: { displayName: `Student ${offset}` },
    status: "PENDING",
    submittedAt: new Date(now - offset * 1_000),
    createdAt: new Date(now - offset * 1_000),
  }));
  const captures = [];
  const JoinModel = {
    find(filter) {
      const capture = { filter };
      captures.push(capture);
      return queryRows(rows, capture);
    },
  };
  const emptyModel = { find: () => queryRows([], {}) };
  const service = createParticipationService({
    config: {
      csrfSecret: "test-csrf-secret-with-more-than-thirty-two-characters",
    },
    JoinModel,
    InvitationModel: {},
    MembershipModel: {},
    UserModel: {},
    ProfileModel: emptyModel,
    ProjectModel: emptyModel,
    AffiliationModel: {},
    AuditModel: null,
    OutboxModel: null,
  });

  const first = await service.myJoins(applicantId, { limit: 2 });
  assert.equal(first.items.length, 2);
  assert.equal(first.hasMore, true);
  assert.ok(first.nextCursor);
  assert.equal(captures[0].limit, 3);

  await service.myJoins(applicantId, { limit: 2, cursor: first.nextCursor });
  assert.ok(captures[1].filter.$or);
});
