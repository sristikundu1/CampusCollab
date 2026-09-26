import assert from "node:assert/strict";
import test from "node:test";
import { createProjectService } from "../../src/modules/projects/project.service.js";

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const PROJECT = "cccccccccccccccccccccccc";
const UNIVERSITY = "dddddddddddddddddddddddd";
const OPENING = "eeeeeeeeeeeeeeeeeeeeeeee";
const config = {
  csrfSecret: "test-csrf-secret-with-more-than-thirty-two-characters",
  requireEmailVerification: true,
};

function query(value) {
  return {
    lean() {
      return this;
    },
    select() {
      return this;
    },
    session() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

function dependencies(ProjectModel, overrides = {}) {
  return {
    config,
    ProjectModel,
    MembershipModel: {
      find: () => query([]),
      findOne: () => query(null),
    },
    JoinModel: {},
    InvitationModel: {},
    UserModel: {
      findById: () => query({ status: "ACTIVE", capabilities: ["STUDENT"] }),
    },
    ProfileModel: {
      findOne: () => query({ displayName: "Project Owner" }),
      find: () => query([]),
    },
    SkillModel: {
      countDocuments: async () => 0,
      find: () => query([]),
    },
    AffiliationModel: {
      findOne: () =>
        query({
          status: "VERIFIED",
          isActive: true,
          universityId: UNIVERSITY,
        }),
    },
    AuditModel: null,
    OutboxModel: null,
    ...overrides,
  };
}

test("project creation persists authenticated ownership and protected defaults", async () => {
  let stored;
  const ProjectModel = {
    create: async (input) => {
      stored = {
        _id: PROJECT,
        ...input,
        requiredSkillIds: [],
        openings: [],
        moderationStatus: "VISIBLE",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 0,
      };
      return { ...stored, toObject: () => stored };
    },
  };
  const service = createProjectService(dependencies(ProjectModel));

  await service.create(
    OWNER,
    {
      title: "Accessible campus research portal",
      description:
        "A carefully scoped project for sharing accessible student research.",
      projectType: "RESEARCH",
      requiredSkillIds: [],
      visibility: "PLATFORM",
      openings: [],
    },
    { requestId: "create-project" },
  );

  assert.equal(stored.ownerId, OWNER);
  assert.equal(stored.ownerSnapshot.displayName, "Project Owner");
  assert.equal(stored.status, "DRAFT");
  assert.equal(stored.acceptingMembers, false);
});

test("project editing enforces ownership and validates dates against stored values", async () => {
  let saves = 0;
  const project = {
    _id: PROJECT,
    ownerId: OWNER,
    ownerSnapshot: { displayName: "Project Owner", universityId: UNIVERSITY },
    title: "Accessible campus research portal",
    description:
      "A carefully scoped project for sharing accessible student research.",
    projectType: "RESEARCH",
    requiredSkillIds: [],
    visibility: "PLATFORM",
    expectedStartAt: new Date("2027-06-01T00:00:00.000Z"),
    expectedEndAt: new Date("2027-07-01T00:00:00.000Z"),
    openings: [],
    acceptingMembers: false,
    status: "DRAFT",
    materialRevision: 0,
    moderationStatus: "VISIBLE",
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
    save: async () => {
      saves += 1;
    },
  };
  const ProjectModel = {
    findOne: ({ ownerId }) => query(ownerId === OWNER ? project : null),
    findById: () => query(project),
  };
  const service = createProjectService(dependencies(ProjectModel));

  await assert.rejects(
    service.update(
      OWNER,
      PROJECT,
      { expectedEndAt: new Date("2027-05-01T00:00:00.000Z") },
      { requestId: "invalid-date" },
    ),
    (error) => error.code === "VALIDATION_FAILED" && error.status === 422,
  );
  await assert.rejects(
    service.update(
      OTHER,
      PROJECT,
      { title: "Unauthorized project takeover" },
      { requestId: "idor-attempt" },
    ),
    (error) => error.code === "RESOURCE_NOT_FOUND" && error.status === 404,
  );
  assert.equal(saves, 0);

  const updated = await service.update(
    OWNER,
    PROJECT,
    { title: "Updated accessible research portal", expectedStartAt: null },
    { requestId: "valid-update" },
  );
  assert.equal(saves, 1);
  assert.equal(project.expectedStartAt, null);
  assert.equal(updated.title, "Updated accessible research portal");
});

test("project details expose only the viewer collaboration state and dynamic capacity", async () => {
  const project = {
    _id: PROJECT,
    ownerId: OWNER,
    ownerSnapshot: { displayName: "Project Owner", universityId: UNIVERSITY },
    title: "Accessible campus research portal",
    description:
      "A carefully scoped project for sharing accessible student research.",
    projectType: "RESEARCH",
    requiredSkillIds: [],
    visibility: "PLATFORM",
    openings: [
      {
        _id: OPENING,
        roleName: "Frontend contributor",
        description: "Build accessible interfaces.",
        requiredSkillIds: [],
        capacity: 2,
        filledCount: 0,
        status: "OPEN",
      },
    ],
    acceptingMembers: true,
    status: "RECRUITING",
    moderationStatus: "VISIBLE",
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
  };
  const ProjectModel = { findById: () => query(project) };
  const service = createProjectService(
    dependencies(ProjectModel, {
      MembershipModel: {
        findOne: () => query(null),
        find: () => query([]),
      },
      JoinModel: {
        find: () =>
          query([
            {
              openingId: OPENING,
              status: "PENDING",
              submittedAt: new Date(),
            },
          ]),
      },
      InvitationModel: {
        find: () =>
          query([
            {
              openingId: OPENING,
              status: "PENDING",
              expiresAt: new Date(Date.now() + 60_000),
            },
          ]),
      },
    }),
  );

  const details = await service.get(PROJECT, OTHER);

  assert.deepEqual(details.capacity, { filled: 0, total: 2 });
  assert.deepEqual(details.collaboration.pendingJoinOpeningIds, [OPENING]);
  assert.equal(details.collaboration.pendingInvitations[0].openingId, OPENING);
  assert.equal(details.members.length, 1);
});
