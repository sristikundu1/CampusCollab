import "dotenv/config";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createParticipationService } from "../src/modules/participation/participation.service.js";
import { createProjectService } from "../src/modules/projects/project.service.js";
import { User } from "../src/modules/auth/user.model.js";
import { Profile } from "../src/modules/profiles/profile.model.js";
import { UniversityAffiliation } from "../src/modules/university/university-affiliation.model.js";
import { Project } from "../src/modules/projects/project.model.js";
import { JoinRequest } from "../src/modules/participation/join-request.model.js";
import { Invitation } from "../src/modules/participation/invitation.model.js";
import { ProjectMembership } from "../src/modules/participation/project-membership.model.js";

const databaseName = "CC_i2_concurrency_test";
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required for this integration test.");

const id = () => new mongoose.Types.ObjectId();
const context = (name) => ({
  requestId: `integration-${name}`,
  idempotencyKey: `integration-${name}-0001`,
});
let actorSequence = 0;

async function actor(label, universityId) {
  actorSequence += 1;
  const userId = id();
  await User.create({
    _id: userId,
    email: `${label}-${actorSequence}@integration.example.edu`,
    passwordHash: "integration-only",
    status: "ACTIVE",
    primaryExperience: "SEEKING_WORK",
    capabilities: ["STUDENT"],
  });
  await Profile.create({
    userId,
    displayName: `${label} ${actorSequence}`,
    headline: "Integration test collaborator",
    completionScore: 100,
    isCompleteForApplications: true,
    moderationStatus: "VISIBLE",
    visibility: "PLATFORM",
  });
  await UniversityAffiliation.create({
    userId,
    universityId,
    universityDomainId: id(),
    email: `${label}-${actorSequence}@integration.example.edu`,
    status: "VERIFIED",
    isActive: true,
  });
  return userId;
}

async function project(ownerId, universityId, capacity) {
  const openingId = id();
  const value = await Project.create({
    ownerId,
    ownerSnapshot: { displayName: "Integration Owner", universityId },
    title: "Concurrency integration project",
    description:
      "A database-backed project used only to verify atomic membership capacity.",
    projectType: "ACADEMIC",
    requiredSkillIds: [],
    visibility: "PLATFORM",
    openings: [
      {
        _id: openingId,
        roleName: "Project collaborator",
        description: "Contribute to the integration-test project.",
        requiredSkillIds: [],
        capacity,
        filledCount: 0,
        status: "OPEN",
      },
    ],
    acceptingMembers: true,
    status: "RECRUITING",
  });
  return { value, openingId };
}

async function join(projectId, openingId, applicantId, universityId, suffix) {
  return JoinRequest.create({
    projectId,
    openingId,
    applicantId,
    applicantSnapshot: {
      displayName: `Applicant ${suffix}`,
      headline: "Integration test collaborator",
      skillIds: [],
      universityId,
    },
    message: "I would like to contribute to this project.",
    status: "PENDING",
    submittedProjectRevision: 0,
    idempotencyKey: `join-${suffix}-0001`,
    submittedAt: new Date(),
  });
}

async function invitation(projectId, openingId, ownerId, inviteeId, suffix) {
  return Invitation.create({
    projectId,
    openingId,
    inviterId: ownerId,
    inviteeId,
    status: "PENDING",
    expiresAt: new Date(Date.now() + 86_400_000),
    idempotencyKey: `invite-${suffix}-0001`,
  });
}

function successful(results) {
  return results.filter((result) => result.status === "fulfilled").length;
}

await mongoose.connect(uri, { dbName: databaseName });
try {
  await mongoose.connection.db.dropDatabase();
  await Promise.all([
    User.init(),
    Profile.init(),
    UniversityAffiliation.init(),
    Project.init(),
    JoinRequest.init(),
    Invitation.init(),
    ProjectMembership.init(),
  ]);

  const service = createParticipationService({
    config: {
      csrfSecret:
        "integration-csrf-secret-with-more-than-thirty-two-characters",
      requireEmailVerification: true,
    },
    AuditModel: null,
    OutboxModel: null,
  });
  const projectService = createProjectService({
    config: {
      csrfSecret:
        "integration-csrf-secret-with-more-than-thirty-two-characters",
      requireEmailVerification: true,
    },
    AuditModel: null,
    OutboxModel: null,
  });
  const universityId = id();
  const ownerId = await actor("owner", universityId);

  const workflow = await project(ownerId, universityId, 2);
  const workflowApplicant = await actor("workflow-applicant", universityId);
  const submitted = await service.submitJoin(
    workflowApplicant,
    workflow.value._id,
    workflow.openingId,
    { message: "I can contribute to the workflow test." },
    context("workflow-submit"),
  );
  await assert.rejects(
    service.submitJoin(
      workflowApplicant,
      workflow.value._id,
      workflow.openingId,
      { message: "This duplicate must be rejected." },
      context("workflow-submit-duplicate"),
    ),
    (error) => error.code === "DUPLICATE_JOIN_REQUEST",
  );
  await assert.rejects(
    service.submitJoin(
      ownerId,
      workflow.value._id,
      workflow.openingId,
      { message: "The owner must not join their own project." },
      context("workflow-owner-self-request"),
    ),
    (error) => error.code === "OWNER_CANNOT_JOIN",
  );
  assert.equal(
    (await service.projectJoins(ownerId, workflow.value._id, { limit: 20 }))
      .items.length,
    1,
  );
  await assert.rejects(
    service.projectJoins(workflowApplicant, workflow.value._id, { limit: 20 }),
    (error) => error.code === "RESOURCE_NOT_FOUND",
  );
  const rejected = await service.rejectJoin(
    ownerId,
    submitted.id,
    { reason: "ROLE_MISMATCH" },
    context("workflow-reject"),
  );
  assert.equal(rejected.status, "REJECTED");

  const workflowInvitee = await actor("workflow-invitee", universityId);
  const sent = await service.sendInvite(
    ownerId,
    workflow.value._id,
    workflow.openingId,
    { inviteeId: String(workflowInvitee), expiresInDays: 14 },
    context("workflow-invite"),
  );
  await assert.rejects(
    service.sendInvite(
      ownerId,
      workflow.value._id,
      workflow.openingId,
      { inviteeId: String(workflowInvitee), expiresInDays: 14 },
      context("workflow-invite-duplicate"),
    ),
    (error) => error.code === "DUPLICATE_INVITATION",
  );
  await assert.rejects(
    service.getInvitation(workflowApplicant, sent.id),
    (error) => error.code === "RESOURCE_NOT_FOUND",
  );
  const declined = await service.rejectInvitation(
    workflowInvitee,
    sent.id,
    {},
    context("workflow-decline"),
  );
  assert.equal(declined.status, "REJECTED");
  await assert.rejects(
    projectService.closeOpening(
      workflowApplicant,
      workflow.value._id,
      workflow.openingId,
      context("workflow-unauthorized-close"),
    ),
    (error) => error.code === "RESOURCE_NOT_FOUND",
  );
  assert.equal(
    (
      await projectService.closeOpening(
        ownerId,
        workflow.value._id,
        String(workflow.openingId),
        context("workflow-close"),
      )
    ).status,
    "CLOSED",
  );
  assert.equal(
    (
      await projectService.reopenOpening(
        ownerId,
        workflow.value._id,
        String(workflow.openingId),
        context("workflow-reopen"),
      )
    ).status,
    "OPEN",
  );

  const capacityOne = await project(ownerId, universityId, 1);
  const joinUsers = await Promise.all([
    actor("join-a", universityId),
    actor("join-b", universityId),
  ]);
  const joins = await Promise.all(
    joinUsers.map((userId, index) =>
      join(
        capacityOne.value._id,
        capacityOne.openingId,
        userId,
        universityId,
        `capacity-one-${index}`,
      ),
    ),
  );
  const joinResults = await Promise.allSettled(
    joins.map((item, index) =>
      service.acceptJoin(
        ownerId,
        item._id,
        {},
        context(`join-capacity-one-${index}`),
      ),
    ),
  );
  const joinMemberships = await ProjectMembership.countDocuments({
    projectId: capacityOne.value._id,
    status: "ACTIVE",
  });
  const refreshedOne = await Project.findById(capacityOne.value._id).lean();
  assert.equal(successful(joinResults), 1);
  assert.equal(joinMemberships, 1);
  assert.equal(refreshedOne.openings[0].filledCount, 1);

  const capacityTwo = await project(ownerId, universityId, 2);
  const inviteUsers = await Promise.all([
    actor("invite-a", universityId),
    actor("invite-b", universityId),
    actor("invite-c", universityId),
  ]);
  const invitations = await Promise.all(
    inviteUsers.map((userId, index) =>
      invitation(
        capacityTwo.value._id,
        capacityTwo.openingId,
        ownerId,
        userId,
        `capacity-two-${index}`,
      ),
    ),
  );
  const invitationResults = await Promise.allSettled(
    invitations.map((item, index) =>
      service.acceptInvitation(
        inviteUsers[index],
        item._id,
        {},
        context(`invite-capacity-two-${index}`),
      ),
    ),
  );
  const invitationMemberships = await ProjectMembership.countDocuments({
    projectId: capacityTwo.value._id,
    status: "ACTIVE",
  });
  const refreshedTwo = await Project.findById(capacityTwo.value._id).lean();
  assert.equal(successful(invitationResults), 2);
  assert.equal(invitationMemberships, 2);
  assert.equal(refreshedTwo.openings[0].filledCount, 2);

  const mixed = await project(ownerId, universityId, 1);
  const mixedUser = await actor("mixed", universityId);
  const mixedJoin = await join(
    mixed.value._id,
    mixed.openingId,
    mixedUser,
    universityId,
    "mixed",
  );
  const mixedInvitation = await invitation(
    mixed.value._id,
    mixed.openingId,
    ownerId,
    mixedUser,
    "mixed",
  );
  const mixedResults = await Promise.allSettled([
    service.acceptJoin(ownerId, mixedJoin._id, {}, context("mixed-join")),
    service.acceptInvitation(
      mixedUser,
      mixedInvitation._id,
      {},
      context("mixed-invitation"),
    ),
  ]);
  assert.equal(successful(mixedResults), 1);
  assert.equal(
    await ProjectMembership.countDocuments({
      projectId: mixed.value._id,
      userId: mixedUser,
      status: "ACTIVE",
    }),
    1,
  );

  const inconsistent = await project(ownerId, universityId, 1);
  const existingUser = await actor("existing", universityId);
  const waitingUser = await actor("waiting", universityId);
  await ProjectMembership.create({
    projectId: inconsistent.value._id,
    openingId: inconsistent.openingId,
    userId: existingUser,
    roleSnapshot: { roleName: "Project collaborator", skillIds: [] },
    sourceType: "INVITATION",
    sourceId: id(),
    status: "ACTIVE",
    joinedAt: new Date(),
  });
  const waitingInvitation = await invitation(
    inconsistent.value._id,
    inconsistent.openingId,
    ownerId,
    waitingUser,
    "inconsistent",
  );
  await assert.rejects(
    service.acceptInvitation(
      waitingUser,
      waitingInvitation._id,
      {},
      context("inconsistent"),
    ),
    (error) => error.code === "MEMBERSHIP_COUNT_INCONSISTENT",
  );
  assert.equal(
    await ProjectMembership.countDocuments({
      projectId: inconsistent.value._id,
      status: "ACTIVE",
    }),
    1,
  );

  console.log("CAPACITY_1_ATTEMPTS=2");
  console.log(`CAPACITY_1_SUCCEEDED=${successful(joinResults)}`);
  console.log(`CAPACITY_1_REJECTED=${2 - successful(joinResults)}`);
  console.log(`CAPACITY_1_FINAL_MEMBERS=${joinMemberships}`);
  console.log("CAPACITY_2_ATTEMPTS=3");
  console.log(`CAPACITY_2_SUCCEEDED=${successful(invitationResults)}`);
  console.log(`CAPACITY_2_REJECTED=${3 - successful(invitationResults)}`);
  console.log(`CAPACITY_2_FINAL_MEMBERS=${invitationMemberships}`);
  console.log(`MIXED_PATH_SUCCEEDED=${successful(mixedResults)}`);
  console.log("INCONSISTENT_COUNTER_ACCEPTANCE=BLOCKED");
  console.log("OPENING_JOIN_INVITATION_AUTHORIZATION=PASS");
  console.log("PROJECT_PARTICIPATION_CONCURRENCY=PASS");
} finally {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  console.log("TEMPORARY_TEST_DATABASE_REMOVED=True");
}
