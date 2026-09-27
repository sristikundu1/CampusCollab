import {
  ConflictError,
  NotFoundError,
} from "../../errors/application-error.js";
import { withTransaction } from "../../lib/mongo/transaction.js";
import { AuditEvent } from "../audit/audit-event.model.js";
import { OutboxEvent } from "../audit/outbox-event.model.js";
import { Gig } from "../gigs/gig.model.js";
import { ProjectMembership } from "../participation/project-membership.model.js";
import { Project } from "../projects/project.model.js";
import { Proposal } from "../proposals/proposal.model.js";
import { CompletionRecord } from "./completion-record.model.js";

const q = async (query, { lean = false, select, session } = {}) => {
  let value = query;
  if (session && value?.session) value = value.session(session);
  if (select && value?.select) value = value.select(select);
  if (lean && value?.lean) value = value.lean();
  return value;
};

const serialize = (record, resources = new Map()) => ({
  id: String(record._id),
  contextType: record.contextType,
  contextId: String(record.contextId),
  resourceId: String(record.resourceId),
  ownerId: String(record.ownerId),
  participantId: String(record.participantId),
  status: record.status,
  requestedAt: record.requestedAt,
  responseDueAt: record.responseDueAt,
  respondedAt: record.respondedAt ?? null,
  completedAt: record.completedAt ?? null,
  resource: resources.get(String(record.resourceId)) ?? null,
});

export function createCompletionService({
  CompletionRecordModel = CompletionRecord,
  GigModel = Gig,
  ProposalModel = Proposal,
  ProjectModel = Project,
  MembershipModel = ProjectMembership,
  AuditModel = AuditEvent,
  OutboxModel = OutboxEvent,
  notificationWriter,
  transaction = withTransaction,
} = {}) {
  async function recordEvent(
    session,
    { eventName, actorId, resourceType, resourceId, version, requestId },
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
            targetType: resourceType,
            targetId: resourceId,
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
            aggregateType: resourceType,
            aggregateId: resourceId,
            aggregateVersion: version,
            payload: {
              resourceId: String(resourceId),
              actorId: String(actorId),
            },
            availableAt: now,
          },
        ],
        { session },
      );
  }

  async function resourceMap(records) {
    const gigIds = records
      .filter((item) => item.contextType === "GIG_PROPOSAL")
      .map((item) => item.resourceId);
    const projectIds = records
      .filter((item) => item.contextType === "PROJECT_MEMBERSHIP")
      .map((item) => item.resourceId);
    const [gigs, projects] = await Promise.all([
      gigIds.length
        ? q(GigModel.find({ _id: { $in: gigIds } }), { lean: true })
        : [],
      projectIds.length
        ? q(ProjectModel.find({ _id: { $in: projectIds } }), { lean: true })
        : [],
    ]);
    return new Map([
      ...gigs.map((item) => [
        String(item._id),
        { type: "GIG", title: item.title, status: item.status },
      ]),
      ...projects.map((item) => [
        String(item._id),
        { type: "PROJECT", title: item.title, status: item.status },
      ]),
    ]);
  }

  async function hydrate(records) {
    const values = records.map((item) => item.toObject?.() ?? item);
    const resources = await resourceMap(values);
    return values.map((item) => serialize(item, resources));
  }

  async function request(userId, input, context) {
    let created = [];
    await transaction(async (session) => {
      const now = new Date();
      const responseDueAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      let resource;
      let participants;
      let resourceType;
      if (input.contextType === "GIG") {
        const existing = await q(
          GigModel.findOne({ _id: input.contextId, ownerId: userId }),
          { session },
        );
        if (!existing) throw new NotFoundError();
        if (existing.status !== "ACTIVE")
          throw new ConflictError(
            "INVALID_STATE",
            "Only an active gig can enter completion.",
          );
        resource = await q(
          GigModel.findOneAndUpdate(
            { _id: input.contextId, ownerId: userId, status: "ACTIVE" },
            {
              $set: {
                status: "COMPLETION_PENDING",
                acceptingProposals: false,
                completionRequestedAt: now,
              },
              $inc: { version: 1 },
            },
            { returnDocument: "after", runValidators: true, session },
          ),
        );
        if (!resource)
          throw new ConflictError(
            "COMPLETION_ALREADY_REQUESTED",
            "Completion has already been requested.",
          );
        participants = await q(
          ProposalModel.find({ gigId: resource._id, status: "ACCEPTED" }),
          { lean: true, session },
        );
        resourceType = "GIG";
      } else {
        const existing = await q(
          ProjectModel.findOne({ _id: input.contextId, ownerId: userId }),
          { session },
        );
        if (!existing) throw new NotFoundError();
        if (existing.status !== "ACTIVE")
          throw new ConflictError(
            "INVALID_STATE",
            "Only an active project can enter completion.",
          );
        resource = await q(
          ProjectModel.findOneAndUpdate(
            { _id: input.contextId, ownerId: userId, status: "ACTIVE" },
            {
              $set: {
                status: "COMPLETION_PENDING",
                acceptingMembers: false,
                completionRequestedAt: now,
              },
              $inc: { version: 1 },
            },
            { returnDocument: "after", runValidators: true, session },
          ),
        );
        if (!resource)
          throw new ConflictError(
            "COMPLETION_ALREADY_REQUESTED",
            "Completion has already been requested.",
          );
        participants = await q(
          MembershipModel.find({
            projectId: resource._id,
            status: "ACTIVE",
          }),
          { lean: true, session },
        );
        resourceType = "PROJECT";
      }
      if (!participants.length)
        throw new ConflictError(
          "PARTICIPANT_REQUIRED",
          "Active participants are required before requesting completion.",
        );
      const documents = participants.map((participant) => ({
        contextType:
          input.contextType === "GIG" ? "GIG_PROPOSAL" : "PROJECT_MEMBERSHIP",
        contextId: participant._id,
        resourceId: resource._id,
        ownerId: userId,
        participantId:
          input.contextType === "GIG"
            ? participant.applicantId
            : participant.userId,
        requestedAt: now,
        responseDueAt,
        idempotencyKey: context.idempotencyKey,
      }));
      created = await CompletionRecordModel.create(documents, { session });
      await recordEvent(session, {
        eventName: `${resourceType}_COMPLETION_REQUESTED`,
        actorId: userId,
        resourceType,
        resourceId: resource._id,
        version: resource.version,
        requestId: context.requestId,
      });
      if (notificationWriter)
        for (const item of created)
          await notificationWriter.create(
            {
              recipientId: item.participantId,
              actorId: userId,
              sourceEventId: `completion-requested:${item._id}`,
              category: "COMPLETION_REQUESTED",
              targetType: "COMPLETION",
              targetId: item._id,
            },
            session,
          );
    });
    const records = await hydrate(created);
    return { records, count: records.length };
  }

  async function list(userId, input) {
    const roleFilter =
      input.role === "OWNER"
        ? { ownerId: userId }
        : input.role === "PARTICIPANT"
          ? { participantId: userId }
          : { $or: [{ ownerId: userId }, { participantId: userId }] };
    const rows = await q(
      CompletionRecordModel.find({
        ...roleFilter,
        ...(input.status ? { status: input.status } : {}),
      })
        .sort({ requestedAt: -1, _id: -1 })
        .limit(input.limit),
      { lean: true },
    );
    return hydrate(rows);
  }

  async function get(userId, recordId) {
    const item = await q(
      CompletionRecordModel.findOne({
        _id: recordId,
        $or: [{ ownerId: userId }, { participantId: userId }],
      }),
      { lean: true },
    );
    if (!item) throw new NotFoundError();
    return (await hydrate([item]))[0];
  }

  async function respond(userId, recordId, input, context) {
    await transaction(async (session) => {
      const item = await q(
        CompletionRecordModel.findOne({
          _id: recordId,
          participantId: userId,
        }),
        { select: "+participantResponse", session },
      );
      if (!item) throw new NotFoundError();
      if (item.status !== "PENDING_ACKNOWLEDGEMENT") {
        if (item.participantResponse === input.decision) return;
        throw new ConflictError(
          "COMPLETION_ALREADY_RESPONDED",
          "This completion request has already been answered.",
        );
      }
      const now = new Date();
      item.participantResponse = input.decision;
      item.respondedAt = now;
      item.status =
        input.decision === "ACKNOWLEDGED" ? "COMPLETED" : "DISPUTED";
      if (input.decision === "ACKNOWLEDGED") item.completedAt = now;
      item.version += 1;
      await item.save({ session });

      const resourceType =
        item.contextType === "GIG_PROPOSAL" ? "GIG" : "PROJECT";
      if (
        item.contextType === "PROJECT_MEMBERSHIP" &&
        input.decision === "ACKNOWLEDGED"
      )
        await MembershipModel.updateOne(
          { _id: item.contextId, userId, status: "ACTIVE" },
          {
            $set: {
              status: "COMPLETED",
              completedAt: now,
              changedByUserId: userId,
            },
            $inc: { version: 1 },
          },
          { session, runValidators: true },
        );
      const unresolved = await q(
        CompletionRecordModel.countDocuments({
          resourceId: item.resourceId,
          status: { $ne: "COMPLETED" },
        }),
        { session },
      );
      if (unresolved === 0) {
        const ResourceModel = resourceType === "GIG" ? GigModel : ProjectModel;
        await ResourceModel.updateOne(
          { _id: item.resourceId, status: "COMPLETION_PENDING" },
          {
            $set: { status: "COMPLETED", completedAt: now },
            $inc: { version: 1 },
          },
          { session, runValidators: true },
        );
      }
      await recordEvent(session, {
        eventName:
          input.decision === "ACKNOWLEDGED"
            ? "COMPLETION_ACKNOWLEDGED"
            : "COMPLETION_DISPUTED",
        actorId: userId,
        resourceType,
        resourceId: item.resourceId,
        version: item.version,
        requestId: context.requestId,
      });
      if (notificationWriter)
        await notificationWriter.create(
          {
            recipientId: item.ownerId,
            actorId: userId,
            sourceEventId: `completion-${input.decision.toLowerCase()}:${item._id}`,
            category:
              input.decision === "ACKNOWLEDGED"
                ? "COMPLETION_ACKNOWLEDGED"
                : "COMPLETION_DISPUTED",
            targetType: "COMPLETION",
            targetId: item._id,
          },
          session,
        );
    });
    return get(userId, recordId);
  }

  return { request, list, get, respond };
}
