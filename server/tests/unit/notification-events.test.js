import assert from "node:assert/strict";
import test from "node:test";
import { createParticipationService } from "../../src/modules/participation/participation.service.js";
import { createProposalService } from "../../src/modules/proposals/proposal.service.js";

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const APPLICANT = "bbbbbbbbbbbbbbbbbbbbbbbb";
const REJECTED_APPLICANT = "cccccccccccccccccccccccc";
const INVITEE = "dddddddddddddddddddddddd";
const REJECTED_INVITEE = "eeeeeeeeeeeeeeeeeeeeeeee";
const PROJECT = "ffffffffffffffffffffffff";
const OPENING = "111111111111111111111111";
const UNIVERSITY = "222222222222222222222222";

function createFixture() {
  let sequence = 3;
  const nextId = () => String(sequence++).repeat(24).slice(0, 24);
  const joins = new Map();
  const invitations = new Map();
  const memberships = new Map();
  const opening = {
    _id: OPENING,
    roleName: "Contributor",
    requiredSkillIds: [],
    capacity: 8,
    filledCount: 0,
    status: "OPEN",
  };
  const openings = [opening];
  openings.id = (id) =>
    openings.find((item) => String(item._id) === String(id));
  const project = {
    _id: PROJECT,
    ownerId: OWNER,
    title: "Notification project",
    status: "RECRUITING",
    moderationStatus: "VISIBLE",
    visibility: "PLATFORM",
    acceptingMembers: true,
    materialRevision: 0,
    version: 0,
    openings,
  };
  const profile = (userId) => ({
    userId,
    displayName: `Student ${String(userId).slice(0, 2)}`,
    headline: "Contributor",
    skillEntries: [],
    isCompleteForApplications: true,
    moderationStatus: "VISIBLE",
  });
  const document = (value) => ({
    ...value,
    async save() {
      return this;
    },
  });
  const JoinModel = {
    exists: async (filter) =>
      [...joins.values()].some((item) =>
        Object.entries(filter).every(([key, value]) =>
          key === "status"
            ? Array.isArray(value?.$in)
              ? value.$in.includes(item[key])
              : item[key] === value
            : String(item[key]) === String(value),
        ),
      ),
    findOne: async (filter) =>
      [...joins.values()].find((item) =>
        Object.entries(filter).every(
          ([key, value]) => String(item[key]) === String(value),
        ),
      ) ?? null,
    findById: async (id) => joins.get(String(id)) ?? null,
    find: async () => [...joins.values()],
    create: async ([value]) => {
      const item = document({
        _id: nextId(),
        ...value,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      joins.set(String(item._id), item);
      return [item];
    },
    updateMany: async () => ({ modifiedCount: 0 }),
  };
  const InvitationModel = {
    exists: async (filter) =>
      [...invitations.values()].some((item) =>
        Object.entries(filter).every(
          ([key, value]) => String(item[key]) === String(value),
        ),
      ),
    findOne: async (filter) =>
      [...invitations.values()].find((item) =>
        Object.entries(filter).every(
          ([key, value]) => String(item[key]) === String(value),
        ),
      ) ?? null,
    findById: async (id) => invitations.get(String(id)) ?? null,
    find: async () => [...invitations.values()],
    create: async ([value]) => {
      const item = document({
        _id: nextId(),
        ...value,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      invitations.set(String(item._id), item);
      return [item];
    },
    updateMany: async () => ({ modifiedCount: 0 }),
  };
  const MembershipModel = {
    exists: async ({ projectId, userId, status }) =>
      [...memberships.values()].some(
        (item) =>
          String(item.projectId) === String(projectId) &&
          String(item.userId) === String(userId) &&
          item.status === status,
      ),
    countDocuments: async ({ openingId, status }) =>
      [...memberships.values()].filter(
        (item) =>
          String(item.openingId) === String(openingId) &&
          item.status === status,
      ).length,
    findOne: async ({ sourceType, sourceId }) =>
      [...memberships.values()].find(
        (item) =>
          item.sourceType === sourceType &&
          String(item.sourceId) === String(sourceId),
      ) ?? null,
    findById: async (id) => memberships.get(String(id)) ?? null,
    create: async ([value]) => {
      const item = document({ _id: nextId(), ...value, version: 0 });
      memberships.set(String(item._id), item);
      return [item];
    },
  };
  const ProjectModel = {
    findById: async () => project,
    findOne: async ({ ownerId }) =>
      String(ownerId) === OWNER ? project : null,
    exists: async ({ ownerId }) => String(ownerId) === OWNER,
    find: async () => [project],
    findOneAndUpdate: async () => {
      opening.filledCount += 1;
      project.version += 1;
      return project;
    },
    updateOne: async () => ({ modifiedCount: 1 }),
  };
  const notifications = [];
  const service = createParticipationService({
    config: {
      csrfSecret: "test-csrf-secret-with-more-than-thirty-two-characters",
      requireEmailVerification: false,
    },
    ProjectModel,
    JoinModel,
    InvitationModel,
    MembershipModel,
    UserModel: {
      findById: async () => ({ status: "ACTIVE", capabilities: ["STUDENT"] }),
    },
    ProfileModel: {
      findOne: async ({ userId }) => profile(userId),
      find: async ({ userId }) =>
        (userId?.$in ?? []).map((id) => profile(String(id))),
    },
    AffiliationModel: {
      findOne: async () => ({
        isActive: true,
        status: "VERIFIED",
        universityId: UNIVERSITY,
      }),
    },
    AuditModel: null,
    OutboxModel: null,
    notificationWriter: {
      async create(value) {
        notifications.push(value);
      },
    },
    transaction: async (work) => work({}),
  });
  return { service, joins, invitations, notifications };
}

test("join request lifecycle notifies only the authoritative owner or applicant", async () => {
  const { service, joins, notifications } = createFixture();
  const submitted = await service.submitJoin(
    APPLICANT,
    PROJECT,
    OPENING,
    { message: "I can help." },
    { idempotencyKey: "join-1", requestId: "join-submit" },
  );
  await service.acceptJoin(
    OWNER,
    submitted.id,
    {},
    { requestId: "join-accept" },
  );
  const rejected = await service.submitJoin(
    REJECTED_APPLICANT,
    PROJECT,
    OPENING,
    { message: "I can also help." },
    { idempotencyKey: "join-2", requestId: "join-submit-2" },
  );
  await service.rejectJoin(
    OWNER,
    rejected.id,
    { reason: "OTHER" },
    { requestId: "join-reject" },
  );

  assert.equal(joins.size, 2);
  assert.deepEqual(
    notifications.map((item) => [item.category, String(item.recipientId)]),
    [
      ["JOIN_REQUEST_RECEIVED", OWNER],
      ["JOIN_REQUEST_ACCEPTED", APPLICANT],
      ["JOIN_REQUEST_RECEIVED", OWNER],
      ["JOIN_REQUEST_REJECTED", REJECTED_APPLICANT],
    ],
  );
});

test("invitation lifecycle notifies only the invitee or project owner", async () => {
  const { service, invitations, notifications } = createFixture();
  const sent = await service.sendInvite(
    OWNER,
    PROJECT,
    OPENING,
    { inviteeId: INVITEE, message: "Join us.", expiresInDays: 7 },
    { idempotencyKey: "invite-1", requestId: "invite-send" },
  );
  await service.acceptInvitation(
    INVITEE,
    sent.id,
    {},
    { requestId: "invite-accept" },
  );
  const declined = await service.sendInvite(
    OWNER,
    PROJECT,
    OPENING,
    { inviteeId: REJECTED_INVITEE, message: "Join us.", expiresInDays: 7 },
    { idempotencyKey: "invite-2", requestId: "invite-send-2" },
  );
  await service.rejectInvitation(
    REJECTED_INVITEE,
    declined.id,
    {},
    { requestId: "invite-reject" },
  );

  assert.equal(invitations.size, 2);
  assert.deepEqual(
    notifications.map((item) => [item.category, String(item.recipientId)]),
    [
      ["PROJECT_INVITATION_RECEIVED", INVITEE],
      ["PROJECT_INVITATION_ACCEPTED", OWNER],
      ["PROJECT_INVITATION_RECEIVED", REJECTED_INVITEE],
      ["PROJECT_INVITATION_REJECTED", OWNER],
    ],
  );
});

test("proposal submit and reject create one notification per durable event", async () => {
  const gigId = "777777777777777777777777";
  const proposalId = "888888888888888888888888";
  const applicantId = APPLICANT;
  const gig = {
    _id: gigId,
    ownerId: OWNER,
    ownerSnapshot: { displayName: "Gig owner" },
    universityId: UNIVERSITY,
    title: "Notification gig",
    status: "PUBLISHED",
    moderationStatus: "VISIBLE",
    isActive: true,
    acceptingProposals: true,
    visibility: "PLATFORM",
    materialRevision: 0,
    capacity: 2,
    acceptedCount: 0,
    version: 0,
  };
  let proposal = null;
  const notifications = [];
  const ProposalModel = {
    findOne: async (filter) =>
      proposal &&
      String(filter.applicantId) === String(proposal.applicantId) &&
      String(filter.gigId) === String(proposal.gigId) &&
      filter.idempotencyKey === proposal.idempotencyKey
        ? proposal
        : null,
    exists: async () => false,
    findById: async () => proposal,
    findOneAndUpdate: async (_filter, update) => {
      Object.assign(proposal, update.$set);
      proposal.version += update.$inc.version;
      proposal.updatedAt = new Date();
      return proposal;
    },
    create: async ([value]) => {
      proposal = {
        _id: proposalId,
        ...value,
        status: "SUBMITTED",
        version: 0,
        updatedAt: new Date(),
      };
      return [proposal];
    },
  };
  const GigModel = {
    findById: async () => gig,
    findOne: async ({ ownerId }) => (String(ownerId) === OWNER ? gig : null),
    find: async () => [gig],
    updateOne: async () => ({ modifiedCount: 1 }),
  };
  const service = createProposalService({
    config: {
      csrfSecret: "test-csrf-secret-with-more-than-thirty-two-characters",
      requireEmailVerification: false,
    },
    ProposalModel,
    GigModel,
    UserModel: {
      findById: async () => ({ status: "ACTIVE", capabilities: ["STUDENT"] }),
    },
    ProfileModel: {
      findOne: async () => ({
        displayName: "Applicant",
        headline: "Contributor",
        skillEntries: [],
        isCompleteForApplications: true,
        moderationStatus: "VISIBLE",
      }),
      find: async () => [],
    },
    SkillModel: { find: async () => [] },
    PortfolioModel: { find: async () => [] },
    AffiliationModel: {
      findOne: async () => ({
        isActive: true,
        status: "VERIFIED",
        universityId: UNIVERSITY,
      }),
    },
    AuditModel: null,
    OutboxModel: null,
    notificationWriter: {
      async create(value) {
        notifications.push(value);
      },
    },
    transaction: async (work) => work({}),
  });
  const input = {
    coverMessage: "I can deliver this campus gig successfully.",
  };
  const context = {
    idempotencyKey: "proposal-1",
    requestId: "proposal-submit",
  };
  await service.submit(applicantId, gigId, input, context);
  await service.submit(applicantId, gigId, input, context);
  await service.decide(
    OWNER,
    proposalId,
    "reject",
    {},
    { requestId: "proposal-reject" },
  );
  await service.decide(
    OWNER,
    proposalId,
    "reject",
    {},
    { requestId: "proposal-retry" },
  );

  assert.deepEqual(
    notifications.map((item) => [item.category, String(item.recipientId)]),
    [
      ["PROPOSAL_RECEIVED", OWNER],
      ["PROPOSAL_REJECTED", applicantId],
    ],
  );
});
