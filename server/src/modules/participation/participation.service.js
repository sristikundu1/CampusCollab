import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../../errors/application-error.js";
import { withTransaction } from "../../lib/mongo/transaction.js";
import { createCursorCodec } from "../../lib/pagination/cursor.js";
import { AuditEvent } from "../audit/audit-event.model.js";
import { OutboxEvent } from "../audit/outbox-event.model.js";
import { User } from "../auth/user.model.js";
import { Profile } from "../profiles/profile.model.js";
import { Project } from "../projects/project.model.js";
import { UniversityAffiliation } from "../university/university-affiliation.model.js";
import { Invitation } from "./invitation.model.js";
import { JoinRequest } from "./join-request.model.js";
import { ProjectMembership } from "./project-membership.model.js";

const selectPrivate =
  "+message +idempotencyKey +decisionReasonCode +responseReasonCode";
const q = async (query, { session, lean = false, select } = {}) => {
  let value = query;
  if (session && value?.session) value = value.session(session);
  if (select && value?.select) value = value.select(select);
  if (lean && value?.lean) value = value.lean();
  return value;
};
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function createParticipationService({
  config,
  ProjectModel = Project,
  JoinModel = JoinRequest,
  InvitationModel = Invitation,
  MembershipModel = ProjectMembership,
  UserModel = User,
  ProfileModel = Profile,
  AffiliationModel = UniversityAffiliation,
  AuditModel = AuditEvent,
  OutboxModel = OutboxEvent,
  transaction = withTransaction,
} = {}) {
  const cursorCodec = createCursorCodec(config.csrfSecret);
  async function activeStudent(userId, session, { complete = false } = {}) {
    const user = await q(UserModel.findById(userId), { session });
    const profile = await q(
      ProfileModel.findOne({ userId, moderationStatus: "VISIBLE" }),
      { session },
    );
    const affiliation = await q(
      AffiliationModel.findOne({ userId, isActive: true }),
      { session },
    );
    if (
      !user ||
      user.status !== "ACTIVE" ||
      !user.capabilities?.includes("STUDENT") ||
      !profile
    )
      throw new AuthorizationError(
        "PARTICIPANT_NOT_ELIGIBLE",
        "This account is not eligible for project participation.",
      );
    if (
      !affiliation ||
      (config.requireEmailVerification && affiliation.status !== "VERIFIED")
    )
      throw new AuthorizationError(
        "UNIVERSITY_ACCESS_REQUIRED",
        "A current university affiliation is required.",
      );
    if (complete && !profile.isCompleteForApplications)
      throw new ConflictError(
        "PROFILE_INCOMPLETE",
        "Complete at least 70% of your profile before requesting to join.",
      );
    return { profile, affiliation };
  }
  const snapshot = ({ profile, affiliation }) => ({
    displayName: profile.displayName,
    headline: profile.headline,
    skillIds: profile.skillEntries.map((s) => s.skillId),
    universityId: affiliation.universityId,
  });
  async function event(
    session,
    {
      eventName,
      actorId,
      targetType,
      targetId,
      version,
      projectId,
      userId,
      requestId,
    },
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
            targetType,
            targetId,
            action: eventName,
            result: "SUCCESS",
            correlationId: requestId,
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
            aggregateType: targetType,
            aggregateId: targetId,
            aggregateVersion: version,
            payload: { projectId: String(projectId), userId: String(userId) },
            availableAt: now,
          },
        ],
        { session },
      );
  }
  function requireOpening(project, openingId) {
    const opening = project.openings.id
      ? project.openings.id(openingId)
      : project.openings.find((o) => String(o._id) === String(openingId));
    if (!opening) throw new NotFoundError();
    return opening;
  }
  function intake(project, opening) {
    if (
      !["RECRUITING", "ACTIVE"].includes(project.status) ||
      !project.acceptingMembers ||
      opening.status !== "OPEN" ||
      opening.filledCount >= opening.capacity
    )
      throw new ConflictError(
        "OPENING_NOT_AVAILABLE",
        "This project opening is not accepting members.",
      );
  }
  async function submitJoin(userId, projectId, openingId, input, context) {
    let id;
    await transaction(async (session) => {
      const applicant = await activeStudent(userId, session, {
        complete: true,
      });
      const project = await q(ProjectModel.findById(projectId), { session });
      if (!project || project.moderationStatus !== "VISIBLE")
        throw new NotFoundError();
      if (String(project.ownerId) === String(userId))
        throw new AuthorizationError(
          "OWNER_CANNOT_JOIN",
          "Owners cannot request membership in their own project.",
        );
      if (
        project.visibility === "UNIVERSITY" &&
        String(project.universityId) !==
          String(applicant.affiliation.universityId)
      )
        throw new NotFoundError();
      if (project.visibility === "PRIVATE") throw new NotFoundError();
      const opening = requireOpening(project, openingId);
      intake(project, opening);
      if (
        await q(
          MembershipModel.exists({ projectId, userId, status: "ACTIVE" }),
          { session },
        )
      )
        throw new ConflictError(
          "ALREADY_A_MEMBER",
          "You are already a member of this project.",
        );
      const retry = await q(
        JoinModel.findOne({
          projectId,
          applicantId: userId,
          idempotencyKey: context.idempotencyKey,
        }),
        { session, select: selectPrivate },
      );
      if (retry) {
        id = retry._id;
        return;
      }
      if (
        await q(
          JoinModel.exists({
            projectId,
            openingId,
            applicantId: userId,
            status: "PENDING",
          }),
          { session },
        )
      )
        throw new ConflictError(
          "DUPLICATE_JOIN_REQUEST",
          "You already have a pending request for this role.",
        );
      const now = new Date();
      const [created] = await JoinModel.create(
        [
          {
            projectId,
            openingId,
            applicantId: userId,
            applicantSnapshot: snapshot(applicant),
            message: input.message,
            status: "PENDING",
            submittedProjectRevision: project.materialRevision,
            idempotencyKey: context.idempotencyKey,
            submittedAt: now,
          },
        ],
        { session },
      );
      await event(session, {
        eventName: "JOIN_REQUEST_SUBMITTED",
        actorId: userId,
        targetType: "JOIN_REQUEST",
        targetId: created._id,
        version: created.version,
        projectId,
        userId,
        requestId: context.requestId,
      });
      id = created._id;
    });
    return getJoin(userId, id);
  }
  async function sendInvite(userId, projectId, openingId, input, context) {
    let id;
    await transaction(async (session) => {
      const project = await q(
        ProjectModel.findOne({ _id: projectId, ownerId: userId }),
        { session },
      );
      if (!project) throw new NotFoundError();
      const opening = requireOpening(project, openingId);
      intake(project, opening);
      if (String(input.inviteeId) === String(userId))
        throw new ConflictError("OWNER_CANNOT_BE_INVITED");
      const invitee = await activeStudent(input.inviteeId, session);
      if (
        project.visibility === "UNIVERSITY" &&
        String(project.universityId) !==
          String(invitee.affiliation.universityId)
      )
        throw new ConflictError(
          "INVITEE_NOT_ELIGIBLE",
          "The student is outside this project university.",
        );
      if (
        await q(
          MembershipModel.exists({
            projectId,
            userId: input.inviteeId,
            status: "ACTIVE",
          }),
          { session },
        )
      )
        throw new ConflictError("ALREADY_A_MEMBER");
      const retry = await q(
        InvitationModel.findOne({
          projectId,
          inviterId: userId,
          idempotencyKey: context.idempotencyKey,
        }),
        { session, select: selectPrivate },
      );
      if (retry) {
        id = retry._id;
        return;
      }
      if (
        await q(
          InvitationModel.exists({
            projectId,
            openingId,
            inviteeId: input.inviteeId,
            status: "PENDING",
          }),
          { session },
        )
      )
        throw new ConflictError(
          "DUPLICATE_INVITATION",
          "This student already has a pending invitation for the role.",
        );
      const now = new Date();
      const [created] = await InvitationModel.create(
        [
          {
            projectId,
            openingId,
            inviterId: userId,
            inviteeId: input.inviteeId,
            message: input.message,
            status: "PENDING",
            expiresAt: new Date(now.getTime() + input.expiresInDays * 86400000),
            idempotencyKey: context.idempotencyKey,
          },
        ],
        { session },
      );
      await event(session, {
        eventName: "INVITATION_SENT",
        actorId: userId,
        targetType: "INVITATION",
        targetId: created._id,
        version: created.version,
        projectId,
        userId: input.inviteeId,
        requestId: context.requestId,
      });
      id = created._id;
    });
    return getInvitation(userId, id);
  }
  async function hydrate(items, type, viewerId) {
    if (!items.length) return [];
    const projectIds = [...new Set(items.map((i) => String(i.projectId)))];
    const userIds = [
      ...new Set(
        items.map((i) =>
          String(type === "JOIN_REQUEST" ? i.applicantId : i.inviteeId),
        ),
      ),
    ];
    const projects = await q(ProjectModel.find({ _id: { $in: projectIds } }), {
      lean: true,
    });
    const profiles = await q(ProfileModel.find({ userId: { $in: userIds } }), {
      lean: true,
    });
    const pm = new Map(projects.map((p) => [String(p._id), p]));
    const fm = new Map(profiles.map((p) => [String(p.userId), p]));
    return items.map((i) => {
      const p = pm.get(String(i.projectId));
      const opening = p?.openings?.find(
        (o) => String(o._id) === String(i.openingId),
      );
      const personId = String(
        type === "JOIN_REQUEST" ? i.applicantId : i.inviteeId,
      );
      return {
        id: String(i._id),
        project: p
          ? {
              id: String(p._id),
              title: p.title,
              status: p.status,
              ownerId: String(p.ownerId),
            }
          : { id: String(i.projectId), title: "Unavailable project" },
        opening: opening
          ? {
              id: String(opening._id),
              roleName: opening.roleName,
              status: opening.status,
            }
          : { id: String(i.openingId), roleName: "Unavailable role" },
        person: {
          id: personId,
          displayName:
            i.applicantSnapshot?.displayName ??
            fm.get(personId)?.displayName ??
            "CampusCollab member",
          headline:
            i.applicantSnapshot?.headline ?? fm.get(personId)?.headline ?? "",
        },
        message: i.message ?? "",
        status: i.status,
        expiresAt: i.expiresAt ?? null,
        createdAt: i.submittedAt ?? i.sentAt ?? i.createdAt,
        updatedAt: i.updatedAt,
        isApplicant: type === "JOIN_REQUEST" && personId === String(viewerId),
        isInvitee: type === "INVITATION" && personId === String(viewerId),
        isOwner: String(p?.ownerId) === String(viewerId),
      };
    });
  }
  async function getJoin(userId, id) {
    const item = await q(JoinModel.findById(id), {
      select: selectPrivate,
      lean: true,
    });
    if (!item) throw new NotFoundError();
    const project = await q(ProjectModel.findById(item.projectId), {
      lean: true,
    });
    if (
      String(item.applicantId) !== String(userId) &&
      String(project?.ownerId) !== String(userId)
    )
      throw new NotFoundError();
    return (await hydrate([item], "JOIN_REQUEST", userId))[0];
  }
  async function getInvitation(userId, id) {
    const item = await q(InvitationModel.findById(id), {
      select: selectPrivate,
      lean: true,
    });
    if (!item) throw new NotFoundError();
    const project = await q(ProjectModel.findById(item.projectId), {
      lean: true,
    });
    if (
      String(item.inviteeId) !== String(userId) &&
      String(project?.ownerId) !== String(userId)
    )
      throw new NotFoundError();
    return (await hydrate([item], "INVITATION", userId))[0];
  }
  function cursorFilter(cursor, scope, field) {
    const decoded = cursorCodec.decode(cursor, scope);
    if (!decoded) return {};
    const at = new Date(decoded.at);
    return {
      $or: [
        { [field]: { $lt: at } },
        { [field]: at, _id: { $lt: decoded.id } },
      ],
    };
  }
  async function listModel(Model, filter, input, type, userId, scope) {
    const field = type === "JOIN_REQUEST" ? "submittedAt" : "createdAt";
    const query = { ...filter, ...cursorFilter(input.cursor, scope, field) };
    if (input.status) query.status = input.status;
    const rows = await q(
      Model.find(query)
        .select(selectPrivate)
        .sort({ [field]: -1, _id: -1 })
        .limit(input.limit + 1),
      { lean: true },
    );
    const hasMore = rows.length > input.limit;
    const values = hasMore ? rows.slice(0, input.limit) : rows;
    const last = values.at(-1);
    return {
      items: await hydrate(values, type, userId),
      hasMore,
      nextCursor: hasMore
        ? cursorCodec.encode({
            scope,
            at: new Date(last[field]).toISOString(),
            id: String(last._id),
          })
        : null,
    };
  }
  const myJoins = (userId, input) =>
    listModel(
      JoinModel,
      { applicantId: userId },
      input,
      "JOIN_REQUEST",
      userId,
      `join-mine:${userId}:${input.status ?? ""}`,
    );
  async function projectJoins(userId, projectId, input) {
    if (!(await ProjectModel.exists({ _id: projectId, ownerId: userId })))
      throw new NotFoundError();
    return listModel(
      JoinModel,
      { projectId },
      input,
      "JOIN_REQUEST",
      userId,
      `join-project:${projectId}:${input.status ?? ""}`,
    );
  }
  const myInvitations = (userId, input) =>
    listModel(
      InvitationModel,
      { inviteeId: userId },
      input,
      "INVITATION",
      userId,
      `invitation-mine:${userId}:${input.status ?? ""}`,
    );
  async function projectInvitations(userId, projectId, input) {
    if (!(await ProjectModel.exists({ _id: projectId, ownerId: userId })))
      throw new NotFoundError();
    return listModel(
      InvitationModel,
      { projectId },
      input,
      "INVITATION",
      userId,
      `invitation-project:${projectId}:${input.status ?? ""}`,
    );
  }
  async function terminalCommand(
    Model,
    userField,
    userId,
    id,
    target,
    context,
    type,
  ) {
    let resultId;
    await transaction(async (session) => {
      const item = await q(Model.findOne({ _id: id, [userField]: userId }), {
        session,
        select: selectPrivate,
      });
      if (!item) throw new NotFoundError();
      if (item.status === target) {
        resultId = item._id;
        return;
      }
      if (item.status !== "PENDING")
        throw new ConflictError(
          "INVALID_STATE",
          "This response is no longer pending.",
        );
      item.status = target;
      const now = new Date();
      if (type === "JOIN_REQUEST")
        item[
          target === "WITHDRAWN"
            ? "withdrawnAt"
            : target === "REJECTED"
              ? "rejectedAt"
              : "decidedAt"
        ] = now;
      else item[target === "REJECTED" ? "respondedAt" : "revokedAt"] = now;
      item.version += 1;
      await item.save({ session });
      await event(session, {
        eventName: `${type}_${target}`,
        actorId: userId,
        targetType: type,
        targetId: item._id,
        version: item.version,
        projectId: item.projectId,
        userId: type === "JOIN_REQUEST" ? item.applicantId : item.inviteeId,
        requestId: context.requestId,
      });
      resultId = item._id;
    });
    return type === "JOIN_REQUEST"
      ? getJoin(userId, resultId)
      : getInvitation(userId, resultId);
  }
  async function acceptSource({
    Model,
    type,
    id,
    userId,
    ownerDecision,
    context,
  }) {
    let membershipId;
    await transaction(async (session) => {
      const selector = ownerDecision
        ? { _id: id }
        : { _id: id, inviteeId: userId };
      const source = await q(Model.findOne(selector), {
        session,
        select: selectPrivate,
      });
      if (!source) throw new NotFoundError();
      const memberId =
        type === "JOIN_REQUEST" ? source.applicantId : source.inviteeId;
      const project = await q(ProjectModel.findById(source.projectId), {
        session,
      });
      if (!project) throw new NotFoundError();
      if (ownerDecision && String(project.ownerId) !== String(userId))
        throw new NotFoundError();
      if (source.status === "ACCEPTED") {
        const existing = await q(
          MembershipModel.findOne({ sourceType: type, sourceId: source._id }),
          { session },
        );
        if (!existing) throw new ConflictError("MEMBERSHIP_INCONSISTENT");
        membershipId = existing._id;
        return;
      }
      if (source.status !== "PENDING")
        throw new ConflictError(
          "INVALID_STATE",
          "This response is no longer pending.",
        );
      if (type === "INVITATION" && source.expiresAt <= new Date())
        throw new ConflictError(
          "INVITATION_EXPIRED",
          "This invitation has expired.",
        );
      await activeStudent(memberId, session);
      if (
        await q(
          MembershipModel.exists({
            projectId: project._id,
            userId: memberId,
            status: "ACTIVE",
          }),
          { session },
        )
      )
        throw new ConflictError("ALREADY_A_MEMBER");
      const opening = requireOpening(project, source.openingId);
      intake(project, opening);
      const updated = await ProjectModel.findOneAndUpdate(
        {
          _id: project._id,
          status: { $in: ["RECRUITING", "ACTIVE"] },
          acceptingMembers: true,
          version: project.version,
          openings: {
            $elemMatch: {
              _id: opening._id,
              status: "OPEN",
              filledCount: opening.filledCount,
            },
          },
        },
        { $inc: { "openings.$.filledCount": 1, version: 1 } },
        { returnDocument: "after", session },
      );
      if (!updated)
        throw new ConflictError(
          "CAPACITY_UNAVAILABLE",
          "Another acceptance filled or changed this opening.",
        );
      const updatedOpening = updated.openings.id(opening._id);
      if (updatedOpening.filledCount >= updatedOpening.capacity)
        await ProjectModel.updateOne(
          { _id: updated._id, "openings._id": opening._id },
          { $set: { "openings.$.status": "FILLED" } },
          { session },
        );
      let membership;
      try {
        [membership] = await MembershipModel.create(
          [
            {
              projectId: project._id,
              openingId: opening._id,
              userId: memberId,
              roleSnapshot: {
                roleName: opening.roleName,
                skillIds: opening.requiredSkillIds,
              },
              sourceType: type,
              sourceId: source._id,
              status: "ACTIVE",
              joinedAt: new Date(),
            },
          ],
          { session },
        );
      } catch (error) {
        if (error?.code === 11000) throw new ConflictError("ALREADY_A_MEMBER");
        throw error;
      }
      source.status = "ACCEPTED";
      source.decidedByUserId = userId;
      if (type === "JOIN_REQUEST") source.acceptedAt = new Date();
      else source.respondedAt = new Date();
      source.version += 1;
      await source.save({ session });
      if (type === "JOIN_REQUEST")
        await InvitationModel.updateMany(
          { projectId: project._id, inviteeId: memberId, status: "PENDING" },
          {
            $set: {
              status: "REVOKED",
              revokedAt: new Date(),
              responseReason: "MEMBERSHIP_CREATED",
            },
            $inc: { version: 1 },
          },
          { session },
        );
      else
        await JoinModel.updateMany(
          { projectId: project._id, applicantId: memberId, status: "PENDING" },
          {
            $set: {
              status: "EXPIRED",
              expiredAt: new Date(),
              reason: "MEMBERSHIP_CREATED",
            },
            $inc: { version: 1 },
          },
          { session },
        );
      await event(session, {
        eventName: `${type}_ACCEPTED`,
        actorId: userId,
        targetType: type,
        targetId: source._id,
        version: source.version,
        projectId: project._id,
        userId: memberId,
        requestId: context.requestId,
      });
      membershipId = membership._id;
    });
    return getMembership(userId, membershipId);
  }
  async function members(userId, projectId) {
    const project = await q(ProjectModel.findById(projectId), { lean: true });
    if (!project) throw new NotFoundError();
    const active = await MembershipModel.exists({
      projectId,
      userId,
      status: "ACTIVE",
    });
    if (String(project.ownerId) !== String(userId) && !active)
      throw new NotFoundError();
    const rows = await q(
      MembershipModel.find({ projectId }).sort({ joinedAt: 1 }),
      { lean: true },
    );
    const ids = [String(project.ownerId), ...rows.map((m) => String(m.userId))];
    const profiles = await q(ProfileModel.find({ userId: { $in: ids } }), {
      lean: true,
    });
    const map = new Map(profiles.map((p) => [String(p.userId), p]));
    return [
      {
        id: `owner-${project._id}`,
        user: {
          id: String(project.ownerId),
          displayName: project.ownerSnapshot?.displayName ?? "Project owner",
          headline: map.get(String(project.ownerId))?.headline ?? "",
        },
        role: "Project owner",
        status: "OWNER",
        joinedAt: project.createdAt,
      },
      ...rows.map((m) => ({
        id: String(m._id),
        user: {
          id: String(m.userId),
          displayName:
            map.get(String(m.userId))?.displayName ?? "CampusCollab member",
          headline: map.get(String(m.userId))?.headline ?? "",
        },
        role: m.roleSnapshot.roleName,
        status: m.status,
        joinedAt: m.joinedAt,
        isSelf: String(m.userId) === String(userId),
      })),
    ];
  }
  async function getMembership(userId, id) {
    const row = await q(MembershipModel.findById(id), { lean: true });
    if (!row) throw new NotFoundError();
    const project = await q(ProjectModel.findById(row.projectId), {
      lean: true,
    });
    if (
      String(row.userId) !== String(userId) &&
      String(project?.ownerId) !== String(userId)
    )
      throw new NotFoundError();
    return {
      id: String(row._id),
      projectId: String(row.projectId),
      openingId: String(row.openingId),
      userId: String(row.userId),
      role: row.roleSnapshot.roleName,
      status: row.status,
      joinedAt: row.joinedAt,
    };
  }
  async function endMembership(
    actorId,
    projectId,
    membershipId,
    target,
    context,
  ) {
    let id;
    await transaction(async (session) => {
      const membership = await q(
        MembershipModel.findOne({
          _id: membershipId,
          projectId,
          status: "ACTIVE",
        }),
        { session },
      );
      if (!membership) throw new NotFoundError();
      const project = await q(ProjectModel.findById(projectId), { session });
      if (!project) throw new NotFoundError();
      if (target === "LEFT" && String(membership.userId) !== String(actorId))
        throw new NotFoundError();
      if (target === "REMOVED" && String(project.ownerId) !== String(actorId))
        throw new NotFoundError();
      if (!["RECRUITING", "ACTIVE"].includes(project.status))
        throw new ConflictError("INVALID_STATE");
      membership.status = target;
      membership[target === "LEFT" ? "leftAt" : "removedAt"] = new Date();
      membership.changedByUserId = actorId;
      membership.version += 1;
      await membership.save({ session });
      const opening = project.openings.id(membership.openingId);
      if (opening && opening.filledCount > 0) {
        opening.filledCount -= 1;
        if (opening.status === "FILLED")
          opening.status = project.acceptingMembers ? "OPEN" : "CLOSED";
        project.version += 1;
        await project.save({ session });
      }
      await event(session, {
        eventName: `PROJECT_MEMBER_${target}`,
        actorId,
        targetType: "PROJECT_MEMBERSHIP",
        targetId: membership._id,
        version: membership.version,
        projectId,
        userId: membership.userId,
        requestId: context.requestId,
      });
      id = membership._id;
    });
    return getMembership(actorId, id);
  }
  async function candidates(userId, projectId, input) {
    const project = await q(
      ProjectModel.findOne({ _id: projectId, ownerId: userId }),
      { lean: true },
    );
    if (!project) throw new NotFoundError();
    const profiles = await q(
      ProfileModel.find({
        moderationStatus: "VISIBLE",
        visibility: { $ne: "PRIVATE" },
        $or: [
          { displayName: { $regex: escape(input.q), $options: "i" } },
          { headline: { $regex: escape(input.q), $options: "i" } },
        ],
      }).limit(input.limit * 2),
      { lean: true },
    );
    const ids = profiles
      .map((p) => p.userId)
      .filter((id) => String(id) !== String(userId));
    const [users, affiliations, memberships] = await Promise.all([
      q(UserModel.find({ _id: { $in: ids }, status: "ACTIVE" }).select("_id"), {
        lean: true,
      }),
      q(AffiliationModel.find({ userId: { $in: ids }, isActive: true }), {
        lean: true,
      }),
      q(
        MembershipModel.find({
          projectId,
          userId: { $in: ids },
          status: "ACTIVE",
        }).select("userId"),
        { lean: true },
      ),
    ]);
    const validUsers = new Set(users.map((u) => String(u._id)));
    const affiliationsByUser = new Map(
      affiliations.map((a) => [String(a.userId), a]),
    );
    const membersSet = new Set(memberships.map((m) => String(m.userId)));
    return profiles
      .filter((p) => {
        const aff = affiliationsByUser.get(String(p.userId));
        return (
          validUsers.has(String(p.userId)) &&
          aff &&
          !membersSet.has(String(p.userId)) &&
          (!config.requireEmailVerification || aff.status === "VERIFIED") &&
          (project.visibility !== "UNIVERSITY" ||
            String(aff.universityId) === String(project.universityId))
        );
      })
      .slice(0, input.limit)
      .map((p) => ({
        id: String(p.userId),
        displayName: p.displayName,
        headline: p.headline ?? "",
        skillsCount: p.skillEntries.length,
        availability: p.availability?.status ?? "UNAVAILABLE",
      }));
  }
  async function rejectJoin(userId, id, body, context) {
    let result;
    await transaction(async (session) => {
      const item = await q(JoinModel.findById(id), {
        session,
        select: selectPrivate,
      });
      if (
        !item ||
        !(await q(
          ProjectModel.exists({ _id: item.projectId, ownerId: userId }),
          { session },
        ))
      )
        throw new NotFoundError();
      if (item.status === "REJECTED") {
        result = item._id;
        return;
      }
      if (item.status !== "PENDING") throw new ConflictError("INVALID_STATE");
      item.status = "REJECTED";
      item.rejectedAt = new Date();
      item.decidedByUserId = userId;
      item.decisionReasonCode = body.reason;
      item.version += 1;
      await item.save({ session });
      await event(session, {
        eventName: "JOIN_REQUEST_REJECTED",
        actorId: userId,
        targetType: "JOIN_REQUEST",
        targetId: item._id,
        version: item.version,
        projectId: item.projectId,
        userId: item.applicantId,
        requestId: context.requestId,
      });
      result = item._id;
    });
    return getJoin(userId, result);
  }
  return {
    submitJoin,
    myJoins,
    projectJoins,
    getJoin,
    withdrawJoin: (u, id, b, c) =>
      terminalCommand(
        JoinModel,
        "applicantId",
        u,
        id,
        "WITHDRAWN",
        c,
        "JOIN_REQUEST",
      ),
    rejectJoin,
    acceptJoin: (u, id, b, c) =>
      acceptSource({
        Model: JoinModel,
        type: "JOIN_REQUEST",
        id,
        userId: u,
        ownerDecision: true,
        context: c,
      }),
    sendInvite,
    myInvitations,
    projectInvitations,
    getInvitation,
    rejectInvitation: (u, id, b, c) =>
      terminalCommand(
        InvitationModel,
        "inviteeId",
        u,
        id,
        "REJECTED",
        c,
        "INVITATION",
      ),
    revokeInvitation: (u, id, b, c) =>
      terminalCommand(
        InvitationModel,
        "inviterId",
        u,
        id,
        "REVOKED",
        c,
        "INVITATION",
      ),
    acceptInvitation: (u, id, b, c) =>
      acceptSource({
        Model: InvitationModel,
        type: "INVITATION",
        id,
        userId: u,
        ownerDecision: false,
        context: c,
      }),
    members,
    leave: (u, p, m, b, c) => endMembership(u, p, m, "LEFT", c),
    remove: (u, p, m, b, c) => endMembership(u, p, m, "REMOVED", c),
    candidates,
  };
}
