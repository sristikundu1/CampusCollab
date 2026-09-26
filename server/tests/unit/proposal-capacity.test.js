import assert from "node:assert/strict";
import test from "node:test";
import { createProposalService } from "../../src/modules/proposals/proposal.service.js";

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const GIG = "bbbbbbbbbbbbbbbbbbbbbbbb";
const FIRST = "cccccccccccccccccccccccc";
const SECOND = "dddddddddddddddddddddddd";
const FIRST_APPLICANT = "eeeeeeeeeeeeeeeeeeeeeeee";
const SECOND_APPLICANT = "ffffffffffffffffffffffff";

const clone = (value) => structuredClone(value);

test("concurrent proposal acceptance cannot exceed the gig worker limit", async () => {
  const now = new Date("2026-09-27T00:00:00.000Z");
  const proposals = new Map(
    [
      [FIRST, FIRST_APPLICANT],
      [SECOND, SECOND_APPLICANT],
    ].map(([id, applicantId]) => [
      id,
      {
        _id: id,
        gigId: GIG,
        applicantId,
        applicantSnapshot: {
          displayName: "CampusCollab student",
          skillIds: [],
        },
        status: "SUBMITTED",
        version: 0,
        currentRevisionNumber: 1,
        revisions: [],
        submittedAt: now,
        updatedAt: now,
      },
    ]),
  );
  const gig = {
    _id: GIG,
    ownerId: OWNER,
    ownerSnapshot: { displayName: "Gig owner" },
    title: "One-worker campus gig",
    status: "PUBLISHED",
    isActive: true,
    acceptingProposals: true,
    capacity: 1,
    acceptedCount: 0,
    version: 0,
  };
  let gigReads = 0;
  let releaseGigReads;
  const bothReadGig = new Promise((resolve) => {
    releaseGigReads = resolve;
  });
  const capacitySelectors = [];

  const ProposalModel = {
    findById: async (id) => clone(proposals.get(String(id))),
    findOneAndUpdate: async (filter, update) => {
      const proposal = proposals.get(String(filter._id));
      if (
        !proposal ||
        proposal.version !== filter.version ||
        !filter.status.$in.includes(proposal.status)
      )
        return null;
      Object.assign(proposal, update.$set);
      proposal.version += update.$inc.version;
      return clone(proposal);
    },
    updateMany: async () => ({ acknowledged: true }),
  };
  const GigModel = {
    findOne: async () => {
      gigReads += 1;
      if (gigReads === 2) releaseGigReads();
      await bothReadGig;
      return clone(gig);
    },
    findOneAndUpdate: async (filter) => {
      capacitySelectors.push(filter);
      if (
        gig.status !== "PUBLISHED" ||
        !gig.acceptingProposals ||
        gig.acceptedCount >= gig.capacity
      )
        return null;
      gig.acceptedCount += 1;
      gig.version += 1;
      return clone(gig);
    },
    updateOne: async () => {
      gig.status = "ASSIGNED";
      gig.acceptingProposals = false;
      gig.version += 1;
      return { acknowledged: true };
    },
    findById: async () => clone(gig),
    find: async () => [clone(gig)],
  };
  const service = createProposalService({
    config: { csrfSecret: "test-csrf-secret-with-at-least-32-chars" },
    ProposalModel,
    GigModel,
    UserModel: { findOne: async () => ({ status: "ACTIVE" }) },
    ProfileModel: { find: async () => [] },
    SkillModel: { find: async () => [] },
    PortfolioModel: { find: async () => [] },
    AuditModel: null,
    OutboxModel: null,
    transaction: async (work) => work({}),
  });

  const results = await Promise.allSettled([
    service.decide(OWNER, FIRST, "accept", {}, { requestId: "first" }),
    service.decide(OWNER, SECOND, "accept", {}, { requestId: "second" }),
  ]);

  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const rejected = results.find((result) => result.status === "rejected");
  assert.equal(rejected.reason.code, "CAPACITY_UNAVAILABLE");
  assert.equal(gig.acceptedCount, 1);
  assert.equal(gig.status, "ASSIGNED");
  assert.equal(gig.acceptingProposals, false);
  assert.equal(capacitySelectors.length, 2);
  for (const selector of capacitySelectors)
    assert.deepEqual(selector.$expr, { $lt: ["$acceptedCount", "$capacity"] });
});
