import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../../errors/application-error.js";
import { createCursorCodec } from "../../lib/pagination/cursor.js";
import { withTransaction } from "../../lib/mongo/transaction.js";
import { AuditEvent } from "../audit/audit-event.model.js";
import { OutboxEvent } from "../audit/outbox-event.model.js";
import { User } from "../auth/user.model.js";
import { Gig } from "../gigs/gig.model.js";
import { PortfolioItem } from "../profiles/portfolio-item.model.js";
import { Profile } from "../profiles/profile.model.js";
import { Skill } from "../skills/skill.model.js";
import { UniversityAffiliation } from "../university/university-affiliation.model.js";
import { Proposal } from "./proposal.model.js";
import {
  editableProposalStates,
  targetProposalState,
} from "./proposal-lifecycle.js";

const activeStatuses = ["SUBMITTED", "SHORTLISTED"];
const queryValue = async (query, { session, select, lean = false } = {}) => {
  let current = query;
  if (session && current?.session) current = current.session(session);
  if (select && current?.select) current = current.select(select);
  if (lean && current?.lean) current = current.lean();
  return current;
};
const revisionSelect =
  "+revisions.coverMessage +decisionReasonCode +idempotencyKey";
const same = (left, right) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export function createProposalService({
  config,
  ProposalModel = Proposal,
  GigModel = Gig,
  UserModel = User,
  ProfileModel = Profile,
  SkillModel = Skill,
  PortfolioModel = PortfolioItem,
  AffiliationModel = UniversityAffiliation,
  AuditModel = AuditEvent,
  OutboxModel = OutboxEvent,
  transaction = withTransaction,
} = {}) {
  const cursorCodec = createCursorCodec(config.csrfSecret);
  const cursorFilter = (cursor, scope, direction = "desc") => {
    const decoded = cursorCodec.decode(cursor, scope);
    if (!decoded) return {};
    const op = direction === "asc" ? "$gt" : "$lt";
    return {
      $or: [
        { submittedAt: { [op]: new Date(decoded.at) } },
        { submittedAt: new Date(decoded.at), _id: { [op]: decoded.id } },
      ],
    };
  };
  const page = (items, limit, scope) => {
    const hasMore = items.length > limit;
    const values = hasMore ? items.slice(0, limit) : items;
    const last = values.at(-1);
    return {
      values,
      hasMore,
      nextCursor: hasMore
        ? cursorCodec.encode({
            scope,
            at: new Date(last.submittedAt).toISOString(),
            id: String(last._id),
          })
        : null,
    };
  };

  async function record(
    session,
    { eventName, actorId, targetId, action, requestId, version, payload = {} },
  ) {
    const now = new Date();
    if (AuditModel)
      await AuditModel.create(
        [
          {
            eventName,
            category: "LIFECYCLE",
            actorType: "USER",
            actorId,
            targetType: "PROPOSAL",
            targetId,
            action,
            result: "SUCCESS",
            correlationId: requestId,
            metadata: { ...payload },
            occurredAt: now,
          },
        ],
        { session },
      );
    if (OutboxModel)
      await OutboxModel.create(
        [
          {
            eventName,
            aggregateType: "PROPOSAL",
            aggregateId: targetId,
            aggregateVersion: version,
            payload: {
              proposalId: String(targetId),
              actorId: String(actorId),
              ...payload,
            },
            availableAt: now,
          },
        ],
        { session },
      );
  }

  async function hydrate(
    proposals,
    viewerId,
    { details = false, ownerReview = false } = {},
  ) {
    if (!proposals.length) return [];
    const gigIds = [
      ...new Set(proposals.map((proposal) => String(proposal.gigId))),
    ];
    const applicantIds = [
      ...new Set(proposals.map((proposal) => String(proposal.applicantId))),
    ];
    const [gigs, profiles] = await Promise.all([
      queryValue(GigModel.find({ _id: { $in: gigIds } }), { lean: true }),
      queryValue(
        ProfileModel.find({
          userId: { $in: applicantIds },
          moderationStatus: "VISIBLE",
        }),
        { lean: true },
      ),
    ]);
    const gigMap = new Map(gigs.map((gig) => [String(gig._id), gig]));
    const profileMap = new Map(
      profiles.map((profile) => [String(profile.userId), profile]),
    );
    const skillIds = [
      ...new Set(
        proposals
          .flatMap((proposal) => proposal.applicantSnapshot?.skillIds ?? [])
          .map(String),
      ),
    ];
    const skills = skillIds.length
      ? await queryValue(
          SkillModel.find({ _id: { $in: skillIds }, status: "ACTIVE" }),
          { lean: true },
        )
      : [];
    const skillMap = new Map(skills.map((skill) => [String(skill._id), skill]));
    const visibleApplicantIds = ownerReview
      ? applicantIds.filter((id) => {
          const profile = profileMap.get(id);
          const proposal = proposals.find(
            (item) => String(item.applicantId) === id,
          );
          const gig = gigMap.get(String(proposal?.gigId));
          return (
            profile &&
            (profile.visibility === "PLATFORM" ||
              (profile.visibility === "UNIVERSITY" &&
                String(proposal.applicantSnapshot?.universityId ?? "") ===
                  String(gig?.ownerSnapshot?.universityId ?? "")))
          );
        })
      : [];
    const portfolio = visibleApplicantIds.length
      ? await queryValue(
          PortfolioModel.find({
            userId: { $in: visibleApplicantIds },
            status: "PUBLISHED",
          })
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(100),
          { lean: true },
        )
      : [];
    const portfolioMap = new Map();
    for (const item of portfolio) {
      const key = String(item.userId);
      const values = portfolioMap.get(key) ?? [];
      if (values.length < 6)
        values.push({
          id: String(item._id),
          title: item.title,
          description: item.description,
          role: item.role ?? "",
          skillIds: item.skillIds.map(String),
          externalLinks: item.externalLinks ?? [],
        });
      portfolioMap.set(key, values);
    }
    return proposals.map((proposal) => {
      const gig = gigMap.get(String(proposal.gigId));
      const applicantId = String(proposal.applicantId);
      const profile = profileMap.get(applicantId);
      const revisions = (proposal.revisions ?? []).map((revision) => ({
        id: String(revision._id),
        revisionNumber: revision.revisionNumber,
        coverMessage: revision.coverMessage,
        proposedBudget: revision.proposedBudget ?? null,
        proposedDuration: revision.proposedDuration ?? "",
        availability: revision.availability ?? "",
        createdAt: revision.createdAt,
      }));
      const currentRevision =
        revisions.find(
          (revision) =>
            revision.revisionNumber === proposal.currentRevisionNumber,
        ) ?? revisions.at(-1);
      const applicant = {
        id: applicantId,
        displayName:
          proposal.applicantSnapshot?.displayName ?? "CampusCollab member",
        headline: proposal.applicantSnapshot?.headline ?? "",
        skills: (proposal.applicantSnapshot?.skillIds ?? []).map((id) => ({
          id: String(id),
          name: skillMap.get(String(id))?.name ?? "Unavailable skill",
        })),
      };
      if (ownerReview && profile && visibleApplicantIds.includes(applicantId))
        applicant.profile = {
          experienceLevel: profile.experienceLevel ?? null,
          availability: {
            status: profile.availability?.status ?? "UNAVAILABLE",
            hoursPerWeek: profile.availability?.hoursPerWeek ?? null,
            availableFrom: profile.availability?.availableFrom ?? null,
          },
          completionScore: profile.completionScore,
          portfolio: portfolioMap.get(applicantId) ?? [],
        };
      return {
        id: String(proposal._id),
        gig: gig
          ? {
              id: String(gig._id),
              title: gig.title,
              status: gig.status,
              acceptingProposals: gig.acceptingProposals,
              capacity: gig.capacity,
              acceptedCount: gig.acceptedCount,
              owner: {
                id: String(gig.ownerId),
                displayName:
                  gig.ownerSnapshot?.displayName ?? "CampusCollab member",
              },
            }
          : { id: String(proposal.gigId), title: "Unavailable gig" },
        applicant,
        status: proposal.status,
        currentRevisionNumber: proposal.currentRevisionNumber,
        currentRevision,
        submittedGigRevision: proposal.submittedGigRevision,
        decisionReasonCode: proposal.decisionReasonCode ?? null,
        submittedAt: proposal.submittedAt,
        shortlistedAt: proposal.shortlistedAt ?? null,
        acceptedAt: proposal.acceptedAt ?? null,
        rejectedAt: proposal.rejectedAt ?? null,
        withdrawnAt: proposal.withdrawnAt ?? null,
        closedAt: proposal.closedAt ?? null,
        updatedAt: proposal.updatedAt,
        version: proposal.version,
        ...(details ? { revisions } : {}),
      };
    });
  }

  async function requireApplicant(userId, session) {
    // MongoDB transactions do not support parallel operations on one session.
    const user = await queryValue(UserModel.findById(userId), { session });
    const profile = await queryValue(
      ProfileModel.findOne({ userId, moderationStatus: "VISIBLE" }),
      { session },
    );
    const affiliation = await queryValue(
      AffiliationModel.findOne({ userId, isActive: true }),
      { session },
    );
    if (
      !user ||
      user.status !== "ACTIVE" ||
      !user.capabilities?.includes("STUDENT")
    )
      throw new AuthorizationError(
        "APPLICANT_NOT_ELIGIBLE",
        "This account is not eligible to submit proposals.",
      );
    if (
      !affiliation ||
      (config.requireEmailVerification && affiliation.status !== "VERIFIED")
    )
      throw new AuthorizationError(
        "UNIVERSITY_ACCESS_REQUIRED",
        "A current university affiliation is required.",
      );
    if (!profile?.isCompleteForApplications)
      throw new ConflictError(
        "PROFILE_INCOMPLETE",
        "Complete at least 70% of your profile, including a bio and skill, before applying.",
      );
    return { user, profile, affiliation };
  }

  async function submit(userId, gigId, input, context) {
    let proposalId;
    await transaction(async (session) => {
      const applicant = await requireApplicant(userId, session);
      const gig = await queryValue(GigModel.findById(gigId), { session });
      if (!gig || gig.moderationStatus !== "VISIBLE") throw new NotFoundError();
      if (String(gig.ownerId) === String(userId))
        throw new AuthorizationError(
          "SELF_PROPOSAL_NOT_ALLOWED",
          "You cannot submit a proposal to your own gig.",
        );
      if (
        gig.visibility === "UNIVERSITY" &&
        String(gig.universityId) !== String(applicant.affiliation.universityId)
      )
        throw new NotFoundError();
      if (
        gig.status !== "PUBLISHED" ||
        gig.isActive === false ||
        !gig.acceptingProposals
      )
        throw new ConflictError(
          "GIG_NOT_ACCEPTING_PROPOSALS",
          "This gig is not accepting proposals.",
        );
      if (gig.deadlineAt && gig.deadlineAt <= new Date())
        throw new ConflictError(
          "PROPOSAL_DEADLINE_PASSED",
          "The proposal deadline has passed.",
        );
      if (gig.acceptedCount >= gig.capacity)
        throw new ConflictError(
          "CAPACITY_UNAVAILABLE",
          "This gig has no remaining capacity.",
        );
      const retry = await queryValue(
        ProposalModel.findOne({
          applicantId: userId,
          gigId,
          idempotencyKey: context.idempotencyKey,
        }),
        { session, select: revisionSelect },
      );
      if (retry) {
        proposalId = retry._id;
        return;
      }
      if (
        await queryValue(
          ProposalModel.exists({
            applicantId: userId,
            gigId,
            status: { $in: ["SUBMITTED", "SHORTLISTED", "ACCEPTED"] },
          }),
          { session },
        )
      )
        throw new ConflictError(
          "DUPLICATE_PROPOSAL",
          "You already submitted a proposal for this gig.",
        );
      const now = new Date();
      const [created] = await ProposalModel.create(
        [
          {
            gigId,
            applicantId: userId,
            applicantSnapshot: {
              displayName: applicant.profile.displayName,
              headline: applicant.profile.headline,
              skillIds: applicant.profile.skillEntries.map(
                (entry) => entry.skillId,
              ),
              universityId: applicant.affiliation.universityId,
            },
            revisions: [{ revisionNumber: 1, ...input, createdAt: now }],
            currentRevisionNumber: 1,
            submittedGigRevision: gig.materialRevision,
            submittedAt: now,
            idempotencyKey: context.idempotencyKey,
          },
        ],
        { session },
      );
      const increment = await GigModel.updateOne(
        {
          _id: gigId,
          status: "PUBLISHED",
          isActive: { $ne: false },
          acceptingProposals: true,
        },
        { $inc: { proposalCount: 1, version: 1 } },
        { session },
      );
      if (increment.modifiedCount !== 1)
        throw new ConflictError(
          "GIG_NOT_ACCEPTING_PROPOSALS",
          "This gig stopped accepting proposals.",
        );
      await record(session, {
        eventName: "PROPOSAL_SUBMITTED",
        actorId: userId,
        targetId: created._id,
        action: "SUBMIT",
        requestId: context.requestId,
        version: created.version,
        payload: { gigId: String(gigId) },
      });
      proposalId = created._id;
    });
    return get(userId, proposalId);
  }

  async function listQuery(
    filter,
    input,
    scope,
    viewerId,
    ownerReview = false,
  ) {
    const direction = input.sort === "OLDEST" ? "asc" : "desc";
    const found = await queryValue(
      ProposalModel.find({
        ...filter,
        ...cursorFilter(input.cursor, scope, direction),
      })
        .select(revisionSelect)
        .sort({
          submittedAt: direction === "asc" ? 1 : -1,
          _id: direction === "asc" ? 1 : -1,
        })
        .limit(input.limit + 1),
      { lean: true },
    );
    const result = page(found, input.limit, scope);
    return {
      proposals: await hydrate(result.values, viewerId, { ownerReview }),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }
  async function mine(userId, input) {
    const scope = `proposal-mine:${userId}:${input.status ?? ""}:${input.gigId ?? ""}:${input.sort}`;
    const filter = { applicantId: userId };
    if (input.status) filter.status = input.status;
    if (input.gigId) filter.gigId = input.gigId;
    return listQuery(filter, input, scope, userId);
  }
  async function forGig(userId, gigId, input) {
    const gig = await queryValue(
      GigModel.findOne({ _id: gigId, ownerId: userId }),
      { lean: true },
    );
    if (!gig) throw new NotFoundError();
    const scope = `proposal-gig:${gigId}:${input.status ?? ""}:${input.sort}`;
    const filter = { gigId };
    if (input.status) filter.status = input.status;
    const result = await listQuery(filter, input, scope, userId, true);
    return {
      ...result,
      gig: {
        id: String(gig._id),
        title: gig.title,
        status: gig.status,
        capacity: gig.capacity,
        acceptedCount: gig.acceptedCount,
      },
    };
  }
  async function get(userId, proposalId) {
    const proposal = await queryValue(ProposalModel.findById(proposalId), {
      select: revisionSelect,
      lean: true,
    });
    if (!proposal) throw new NotFoundError();
    const gig = await queryValue(GigModel.findById(proposal.gigId), {
      lean: true,
    });
    const applicant = String(proposal.applicantId) === String(userId);
    const owner = gig && String(gig.ownerId) === String(userId);
    if (!applicant && !owner) throw new NotFoundError();
    return (
      await hydrate([proposal], userId, { details: true, ownerReview: owner })
    )[0];
  }

  async function update(userId, proposalId, input, context) {
    let updatedId;
    await transaction(async (session) => {
      const proposal = await queryValue(
        ProposalModel.findOne({ _id: proposalId, applicantId: userId }),
        { session, select: revisionSelect },
      );
      if (!proposal) throw new NotFoundError();
      if (!editableProposalStates.includes(proposal.status))
        throw new ConflictError(
          "INVALID_STATE",
          "This proposal can no longer be edited.",
        );
      if (proposal.currentRevisionNumber >= 10)
        throw new ConflictError(
          "REVISION_LIMIT",
          "This proposal reached its revision limit.",
        );
      const last = proposal.revisions.at(-1);
      if (
        last &&
        same(
          {
            coverMessage: last.coverMessage,
            proposedBudget: last.proposedBudget,
            proposedDuration: last.proposedDuration || undefined,
            availability: last.availability || undefined,
          },
          input,
        )
      ) {
        updatedId = proposal._id;
        return;
      }
      const number = proposal.currentRevisionNumber + 1;
      const updated = await ProposalModel.findOneAndUpdate(
        {
          _id: proposalId,
          applicantId: userId,
          status: { $in: activeStatuses },
          version: proposal.version,
        },
        {
          $push: {
            revisions: {
              revisionNumber: number,
              ...input,
              createdAt: new Date(),
            },
          },
          $set: { currentRevisionNumber: number },
          $inc: { version: 1 },
        },
        { returnDocument: "after", runValidators: true, session },
      );
      if (!updated)
        throw new ConflictError(
          "CONCURRENT_MODIFICATION",
          "The proposal changed. Refresh and try again.",
        );
      await record(session, {
        eventName: "PROPOSAL_REVISED",
        actorId: userId,
        targetId: updated._id,
        action: "REVISE",
        requestId: context.requestId,
        version: updated.version,
        payload: { gigId: String(updated.gigId), revisionNumber: number },
      });
      updatedId = updated._id;
    });
    return get(userId, updatedId);
  }

  async function withdraw(userId, proposalId, input, context) {
    let id;
    await transaction(async (session) => {
      const proposal = await queryValue(
        ProposalModel.findOne({ _id: proposalId, applicantId: userId }),
        { session, select: revisionSelect },
      );
      if (!proposal) throw new NotFoundError();
      if (proposal.status === "WITHDRAWN") {
        id = proposal._id;
        return;
      }
      targetProposalState(proposal.status, "withdraw");
      const updated = await ProposalModel.findOneAndUpdate(
        {
          _id: proposalId,
          applicantId: userId,
          status: { $in: activeStatuses },
          version: proposal.version,
        },
        {
          $set: {
            status: "WITHDRAWN",
            withdrawnAt: new Date(),
            decisionReasonCode: input.reasonCode,
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after", session },
      );
      if (!updated)
        throw new ConflictError(
          "CONCURRENT_MODIFICATION",
          "The proposal changed. Refresh and try again.",
        );
      await record(session, {
        eventName: "PROPOSAL_WITHDRAWN",
        actorId: userId,
        targetId: updated._id,
        action: "WITHDRAW",
        requestId: context.requestId,
        version: updated.version,
        payload: { gigId: String(updated.gigId) },
      });
      id = updated._id;
    });
    return get(userId, id);
  }

  async function decide(userId, proposalId, action, input, context) {
    let proposalIdResult, gigIdResult;
    await transaction(async (session) => {
      const proposal = await queryValue(ProposalModel.findById(proposalId), {
        session,
        select: revisionSelect,
      });
      if (!proposal) throw new NotFoundError();
      const gig = await queryValue(
        GigModel.findOne({ _id: proposal.gigId, ownerId: userId }),
        { session },
      );
      if (!gig) throw new NotFoundError();
      if (proposal.status === targetProposalStateForRetry(action)) {
        proposalIdResult = proposal._id;
        gigIdResult = gig._id;
        return;
      }
      const target = targetProposalState(proposal.status, action);
      const now = new Date();
      if (action === "accept") {
        const applicant = await queryValue(
          UserModel.findOne({ _id: proposal.applicantId, status: "ACTIVE" }),
          { session },
        );
        if (!applicant)
          throw new ConflictError(
            "APPLICANT_NOT_ELIGIBLE",
            "The applicant is no longer eligible.",
          );
        if (
          gig.status !== "PUBLISHED" ||
          gig.isActive === false ||
          !gig.acceptingProposals ||
          gig.acceptedCount >= gig.capacity
        )
          throw new ConflictError(
            "CAPACITY_UNAVAILABLE",
            "This gig is no longer available for acceptance.",
          );
        const updatedProposal = await ProposalModel.findOneAndUpdate(
          {
            _id: proposal._id,
            status: { $in: activeStatuses },
            version: proposal.version,
          },
          {
            $set: {
              status: "ACCEPTED",
              acceptedAt: now,
              decidedByUserId: userId,
              decisionReasonCode: input.reasonCode,
            },
            $inc: { version: 1 },
          },
          { returnDocument: "after", session },
        );
        if (!updatedProposal)
          throw new ConflictError(
            "CONCURRENT_MODIFICATION",
            "The proposal changed. Refresh and try again.",
          );
        const updatedGig = await GigModel.findOneAndUpdate(
          {
            _id: gig._id,
            ownerId: userId,
            status: "PUBLISHED",
            isActive: { $ne: false },
            acceptingProposals: true,
            $expr: { $lt: ["$acceptedCount", "$capacity"] },
          },
          { $inc: { acceptedCount: 1, version: 1 } },
          { returnDocument: "after", session },
        );
        if (!updatedGig)
          throw new ConflictError(
            "CAPACITY_UNAVAILABLE",
            "Another acceptance filled the remaining capacity.",
          );
        if (updatedGig.acceptedCount >= updatedGig.capacity) {
          await GigModel.updateOne(
            {
              _id: updatedGig._id,
              status: "PUBLISHED",
              version: updatedGig.version,
            },
            {
              $set: {
                status: "ASSIGNED",
                acceptingProposals: false,
                assignedAt: now,
              },
              $inc: { version: 1 },
            },
            { session },
          );
          await ProposalModel.updateMany(
            {
              gigId: gig._id,
              _id: { $ne: proposal._id },
              status: { $in: activeStatuses },
            },
            {
              $set: {
                status: "CLOSED",
                closedAt: now,
                decisionReasonCode: "CAPACITY_FILLED",
              },
              $inc: { version: 1 },
            },
            { session },
          );
        }
        await record(session, {
          eventName: "PROPOSAL_ACCEPTED",
          actorId: userId,
          targetId: updatedProposal._id,
          action: "ACCEPT",
          requestId: context.requestId,
          version: updatedProposal.version,
          payload: {
            gigId: String(gig._id),
            applicantId: String(proposal.applicantId),
          },
        });
        proposalIdResult = updatedProposal._id;
        gigIdResult = gig._id;
      } else {
        const timestamp =
          action === "shortlist" ? { shortlistedAt: now } : { rejectedAt: now };
        const updated = await ProposalModel.findOneAndUpdate(
          {
            _id: proposal._id,
            status: {
              $in: action === "shortlist" ? ["SUBMITTED"] : activeStatuses,
            },
            version: proposal.version,
          },
          {
            $set: {
              status: target,
              ...timestamp,
              decidedByUserId: userId,
              decisionReasonCode: input.reasonCode,
              decisionNoteInternal: input.note,
            },
            $inc: { version: 1 },
          },
          { returnDocument: "after", session },
        );
        if (!updated)
          throw new ConflictError(
            "CONCURRENT_MODIFICATION",
            "The proposal changed. Refresh and try again.",
          );
        await record(session, {
          eventName: `PROPOSAL_${target}`,
          actorId: userId,
          targetId: updated._id,
          action: action.toUpperCase(),
          requestId: context.requestId,
          version: updated.version,
          payload: { gigId: String(gig._id) },
        });
        proposalIdResult = updated._id;
        gigIdResult = gig._id;
      }
    });
    return {
      proposal: await get(userId, proposalIdResult),
      gig: await gigSummary(gigIdResult),
    };
  }
  const targetProposalStateForRetry = (action) =>
    ({ accept: "ACCEPTED", reject: "REJECTED", shortlist: "SHORTLISTED" })[
      action
    ];
  async function gigSummary(gigId) {
    const gig = await queryValue(GigModel.findById(gigId), { lean: true });
    return {
      id: String(gig._id),
      title: gig.title,
      status: gig.status,
      capacity: gig.capacity,
      acceptedCount: gig.acceptedCount,
      acceptingProposals: gig.acceptingProposals,
    };
  }
  return { submit, mine, get, update, withdraw, forGig, decide };
}
