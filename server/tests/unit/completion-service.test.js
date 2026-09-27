import assert from "node:assert/strict";
import test from "node:test";
import { createCompletionService } from "../../src/modules/completion/completion.service.js";

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const PARTICIPANT = "bbbbbbbbbbbbbbbbbbbbbbbb";
const OTHER = "cccccccccccccccccccccccc";
const GIG = "dddddddddddddddddddddddd";
const PROPOSAL = "eeeeeeeeeeeeeeeeeeeeeeee";
const RECORD = "ffffffffffffffffffffffff";

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

function fixture() {
  const notifications = [];
  const records = [];
  const gig = {
    _id: GIG,
    ownerId: OWNER,
    title: "Build the student collaboration dashboard",
    status: "ACTIVE",
    version: 2,
  };
  const ProposalModel = {
    find: () =>
      query([
        {
          _id: PROPOSAL,
          gigId: GIG,
          applicantId: PARTICIPANT,
          status: "ACCEPTED",
        },
      ]),
  };
  const GigModel = {
    findOne: ({ ownerId }) => query(String(ownerId) === OWNER ? gig : null),
    findOneAndUpdate: (filter) => {
      if (String(filter.ownerId) !== OWNER || gig.status !== "ACTIVE")
        return query(null);
      gig.status = "COMPLETION_PENDING";
      gig.version += 1;
      return query(gig);
    },
    find: () => query([gig]),
    updateOne: (_filter, update) => {
      Object.assign(gig, update.$set);
      gig.version += update.$inc.version;
      return query({ modifiedCount: 1 });
    },
  };
  const CompletionRecordModel = {
    create: async (values) => {
      const created = values.map((value, index) => {
        const item = {
          _id: index ? `${index}`.repeat(24) : RECORD,
          ...value,
          status: "PENDING_ACKNOWLEDGEMENT",
          version: 0,
          async save() {
            return this;
          },
        };
        records.push(item);
        return item;
      });
      return created;
    },
    find: (filter) =>
      query(
        records.filter((item) => {
          if (filter.status && item.status !== filter.status) return false;
          return true;
        }),
      ),
    findOne: (filter) =>
      query(
        records.find(
          (item) =>
            String(item._id) === String(filter._id) &&
            (!filter.participantId ||
              String(item.participantId) === String(filter.participantId)),
        ) ?? null,
      ),
    countDocuments: ({ resourceId, status }) =>
      query(
        records.filter(
          (item) =>
            String(item.resourceId) === String(resourceId) &&
            item.status !== status.$ne,
        ).length,
      ),
  };
  const service = createCompletionService({
    CompletionRecordModel,
    GigModel,
    ProposalModel,
    ProjectModel: { find: () => query([]) },
    MembershipModel: {},
    AuditModel: null,
    OutboxModel: null,
    notificationWriter: {
      async create(value) {
        notifications.push(value);
      },
    },
    transaction: async (work) => work({}),
  });
  return { service, gig, records, notifications };
}

test("gig owner requests completion once and the participant is notified", async () => {
  const { service, gig, records, notifications } = fixture();
  const result = await service.request(
    OWNER,
    { contextType: "GIG", contextId: GIG },
    { idempotencyKey: "completion-0001", requestId: "request-1" },
  );
  assert.equal(result.count, 1);
  assert.equal(gig.status, "COMPLETION_PENDING");
  assert.equal(records[0].participantId, PARTICIPANT);
  assert.deepEqual(
    notifications.map((item) => [item.category, item.recipientId]),
    [["COMPLETION_REQUESTED", PARTICIPANT]],
  );
  await assert.rejects(
    service.request(
      OWNER,
      { contextType: "GIG", contextId: GIG },
      { idempotencyKey: "completion-0002", requestId: "request-2" },
    ),
    (error) => error.code === "INVALID_STATE" && error.status === 409,
  );
});

test("non-owner completion request is concealed and invalid state is rejected", async () => {
  const { service, gig } = fixture();
  await assert.rejects(
    service.request(
      OTHER,
      { contextType: "GIG", contextId: GIG },
      { idempotencyKey: "completion-0001", requestId: "request-1" },
    ),
    (error) => error.code === "RESOURCE_NOT_FOUND" && error.status === 404,
  );
  gig.status = "ASSIGNED";
  await assert.rejects(
    service.request(
      OWNER,
      { contextType: "GIG", contextId: GIG },
      { idempotencyKey: "completion-0001", requestId: "request-1" },
    ),
    (error) => error.code === "INVALID_STATE" && error.status === 409,
  );
});

test("only the participant can acknowledge and final acknowledgement completes the gig", async () => {
  const { service, gig, records, notifications } = fixture();
  await service.request(
    OWNER,
    { contextType: "GIG", contextId: GIG },
    { idempotencyKey: "completion-0001", requestId: "request-1" },
  );
  await assert.rejects(
    service.respond(
      OTHER,
      records[0]._id,
      { decision: "ACKNOWLEDGED" },
      { requestId: "response-wrong-user" },
    ),
    (error) => error.code === "RESOURCE_NOT_FOUND" && error.status === 404,
  );
  const completed = await service.respond(
    PARTICIPANT,
    records[0]._id,
    { decision: "ACKNOWLEDGED" },
    { requestId: "response-1" },
  );
  assert.equal(completed.status, "COMPLETED");
  assert.equal(gig.status, "COMPLETED");
  assert.equal(notifications.at(-1).category, "COMPLETION_ACKNOWLEDGED");
  assert.equal(notifications.at(-1).recipientId, OWNER);
  const replay = await service.respond(
    PARTICIPANT,
    records[0]._id,
    { decision: "ACKNOWLEDGED" },
    { requestId: "response-replay" },
  );
  assert.equal(replay.status, "COMPLETED");
});

test("a dispute is recorded, keeps the resource pending, and notifies the owner", async () => {
  const { service, gig, records, notifications } = fixture();
  await service.request(
    OWNER,
    { contextType: "GIG", contextId: GIG },
    { idempotencyKey: "completion-0001", requestId: "request-1" },
  );
  const disputed = await service.respond(
    PARTICIPANT,
    records[0]._id,
    { decision: "DISPUTED" },
    { requestId: "dispute-1" },
  );
  assert.equal(disputed.status, "DISPUTED");
  assert.equal(gig.status, "COMPLETION_PENDING");
  assert.equal(notifications.at(-1).category, "COMPLETION_DISPUTED");
});
