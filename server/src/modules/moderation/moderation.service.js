import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../../errors/application-error.js";
import { withTransaction } from "../../lib/mongo/transaction.js";
import { AuditEvent } from "../audit/audit-event.model.js";
import { User } from "../auth/user.model.js";
import { Session } from "../auth/session.model.js";
import { Gig } from "../gigs/gig.model.js";
import { Message } from "../messaging/message.model.js";
import { PortfolioItem } from "../profiles/portfolio-item.model.js";
import { Profile } from "../profiles/profile.model.js";
import { Project } from "../projects/project.model.js";
import { Proposal } from "../proposals/proposal.model.js";
import { ModerationAction } from "./moderation-action.model.js";
import { ModerationCase } from "./moderation-case.model.js";
import { Report } from "./report.model.js";

const q = async (query, { lean = false, select, session } = {}) => {
  let value = query;
  if (session && value?.session) value = value.session(session);
  if (select && value?.select) value = value.select(select);
  if (lean && value?.lean) value = value.lean();
  return value;
};

const safeReport = (report) => ({
  id: String(report._id),
  targetType: report.targetType,
  status: report.status,
  submittedAt: report.submittedAt,
  resolvedAt: report.resolvedAt ?? null,
});

const adminReport = (report) => ({
  ...safeReport(report),
  reporterId: String(report.reporterId),
  targetId: String(report.targetId),
  reasonCode: report.reasonCode,
  details: report.details ?? "",
  priority: report.priority,
  caseId: report.caseId ? String(report.caseId) : null,
});

export function createModerationService({
  ReportModel = Report,
  CaseModel = ModerationCase,
  ActionModel = ModerationAction,
  UserModel = User,
  SessionModel = Session,
  targetModels = {
    USER: User,
    PROFILE: Profile,
    GIG: Gig,
    PROJECT: Project,
    PROPOSAL: Proposal,
    MESSAGE: Message,
    PORTFOLIO_ITEM: PortfolioItem,
  },
  AuditModel = AuditEvent,
  notificationWriter,
  transaction = withTransaction,
} = {}) {
  async function requireGrant(userId, capability) {
    const user = await q(UserModel.findById(userId), {
      select: "+adminGrants",
    });
    const now = new Date();
    const allowed =
      user?.status === "ACTIVE" &&
      user.capabilities?.includes("ADMIN") &&
      user.adminGrants?.some(
        (grant) =>
          [capability, "moderation:*", "*"].includes(grant.capability) &&
          (!grant.expiresAt || grant.expiresAt > now),
      );
    if (!allowed)
      throw new AuthorizationError(
        "ADMIN_SCOPE_REQUIRED",
        "This administrative permission is required.",
      );
    return user;
  }

  async function targetExists(type, id) {
    const Model = targetModels[type];
    return Model && (await Model.exists({ _id: id }));
  }

  async function createReport(reporterId, input, context) {
    if (
      input.targetType === "USER" &&
      String(input.targetId) === String(reporterId)
    )
      throw new ConflictError(
        "SELF_REPORT",
        "You cannot report your own account.",
      );
    if (!(await targetExists(input.targetType, input.targetId)))
      throw new NotFoundError();
    const duplicateSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (
      await ReportModel.exists({
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reasonCode: input.reasonCode,
        submittedAt: { $gte: duplicateSince },
        status: { $in: ["SUBMITTED", "TRIAGED", "LINKED_TO_CASE"] },
      })
    )
      throw new ConflictError(
        "DUPLICATE_REPORT",
        "You already submitted this report recently.",
      );
    const report = await ReportModel.create({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reasonCode: input.reasonCode,
      details: input.details,
      submittedAt: new Date(),
    });
    if (AuditModel)
      await AuditModel.create({
        eventName: "REPORT_CREATED",
        category: "MODERATION",
        actorType: "USER",
        actorId: reporterId,
        targetType: "REPORT",
        targetId: report._id,
        action: "CREATE_REPORT",
        result: "SUCCESS",
        correlationId: context.requestId,
        occurredAt: new Date(),
      });
    return safeReport(report);
  }

  async function ownReports(userId, input) {
    const rows = await q(
      ReportModel.find({
        reporterId: userId,
        ...(input.status ? { status: input.status } : {}),
      })
        .sort({ submittedAt: -1, _id: -1 })
        .limit(input.limit),
      { lean: true },
    );
    return rows.map(safeReport);
  }

  async function ownReport(userId, reportId) {
    const report = await q(
      ReportModel.findOne({ _id: reportId, reporterId: userId }),
      { lean: true },
    );
    if (!report) throw new NotFoundError();
    return safeReport(report);
  }

  async function adminReports(userId, input) {
    await requireGrant(userId, "reports:read");
    const rows = await q(
      ReportModel.find({
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.targetType ? { targetType: input.targetType } : {}),
      })
        .select("+reporterId +targetId +reasonCode +details +priority +caseId")
        .sort({ priority: -1, submittedAt: 1, _id: 1 })
        .limit(input.limit),
      { lean: true },
    );
    return rows.map(adminReport);
  }

  async function adminReportDetails(userId, reportId, context) {
    await requireGrant(userId, "reports:read");
    const report = await q(ReportModel.findById(reportId), {
      select: "+reporterId +targetId +reasonCode +details +priority +caseId",
      lean: true,
    });
    if (!report) throw new NotFoundError();
    if (AuditModel)
      await AuditModel.create({
        eventName: "ADMIN_REPORT_ACCESSED",
        category: "PRIVACY",
        actorType: "ADMIN",
        actorId: userId,
        targetType: "REPORT",
        targetId: reportId,
        action: "READ_REPORT_EVIDENCE",
        result: "SUCCESS",
        correlationId: context.requestId,
        occurredAt: new Date(),
      });
    return adminReport(report);
  }

  async function applyOutcome(report, input, session) {
    const Model = targetModels[report.targetType];
    if (["CONTENT_RESTRICT", "CONTENT_HIDE"].includes(input.outcome)) {
      const contentChange = {
        PROFILE: {
          moderationStatus:
            input.outcome === "CONTENT_HIDE" ? "HIDDEN" : "RESTRICTED",
        },
        GIG: {
          moderationStatus:
            input.outcome === "CONTENT_HIDE" ? "HIDDEN" : "RESTRICTED",
        },
        PROJECT: {
          moderationStatus:
            input.outcome === "CONTENT_HIDE" ? "HIDDEN" : "RESTRICTED",
        },
        MESSAGE: {
          moderationStatus:
            input.outcome === "CONTENT_HIDE" ? "REMOVED" : "RESTRICTED",
        },
        PORTFOLIO_ITEM: { status: "RESTRICTED" },
      }[report.targetType];
      if (!contentChange)
        throw new ConflictError(
          "INVALID_MODERATION_TARGET",
          "This target does not support content restriction.",
        );
      const result = await Model.updateOne(
        { _id: report.targetId },
        { $set: contentChange, $inc: { version: 1 } },
        { session, runValidators: true },
      );
      if (!result.modifiedCount && !result.matchedCount)
        throw new NotFoundError();
    }
    if (["TEMP_SUSPEND", "INDEFINITE_SUSPEND"].includes(input.outcome)) {
      if (report.targetType !== "USER")
        throw new ConflictError(
          "INVALID_MODERATION_TARGET",
          "Account suspension requires a user report.",
        );
      await UserModel.updateOne(
        { _id: report.targetId, status: "ACTIVE" },
        {
          $set: {
            status:
              input.outcome === "TEMP_SUSPEND"
                ? "TEMPORARILY_SUSPENDED"
                : "INDEFINITELY_SUSPENDED",
            suspendedUntil: input.suspendUntil,
            statusChangedAt: new Date(),
            statusReasonCode: input.reasonCode,
          },
          $inc: { securityVersion: 1, version: 1 },
        },
        { session, runValidators: true },
      );
      await SessionModel.updateMany(
        { userId: report.targetId, status: "ACTIVE" },
        {
          $set: {
            status: "REVOKED",
            revokedAt: new Date(),
            revokeReason: "ACCOUNT_SUSPENDED",
          },
          $inc: { version: 1 },
        },
        { session },
      );
    }
  }

  async function resolveReport(userId, reportId, input, context) {
    await requireGrant(userId, "reports:resolve");
    let result;
    await transaction(async (session) => {
      const report = await q(ReportModel.findById(reportId), {
        select: "+reporterId +targetId +reasonCode +details +priority +caseId",
        session,
      });
      if (!report) throw new NotFoundError();
      if (["RESOLVED", "DISMISSED"].includes(report.status))
        throw new ConflictError(
          "REPORT_ALREADY_RESOLVED",
          "This report is closed.",
        );
      await applyOutcome(report, input, session);
      const now = new Date();
      const [moderationCase] = await CaseModel.create(
        [
          {
            primaryTargetType: report.targetType,
            primaryTargetId: report.targetId,
            reportIds: [report._id],
            status:
              input.outcome === "NO_VIOLATION" ? "NO_VIOLATION" : "ACTIONED",
            priority: report.priority,
            assignedToUserId: userId,
            summary: input.note,
            openedAt: now,
            closedAt: now,
          },
        ],
        { session },
      );
      const actionType =
        input.outcome === "NO_VIOLATION" ? "NO_ACTION" : input.outcome;
      const [action] = await ActionModel.create(
        [
          {
            caseId: moderationCase._id,
            actorUserId: userId,
            targetType: report.targetType,
            targetId: report.targetId,
            actionType,
            reasonCode: input.reasonCode,
            reasonDetails: input.note,
            effectiveAt: now,
            expiresAt: input.suspendUntil,
          },
        ],
        { session },
      );
      report.status =
        input.outcome === "NO_VIOLATION" ? "DISMISSED" : "RESOLVED";
      report.caseId = moderationCase._id;
      report.resolvedAt = now;
      report.version += 1;
      await report.save({ session });
      if (AuditModel)
        await AuditModel.create(
          [
            {
              eventName: "MODERATION_DECISION_APPLIED",
              category: "MODERATION",
              actorType: "ADMIN",
              actorId: userId,
              targetType: report.targetType,
              targetId: report.targetId,
              action: input.outcome,
              result: "SUCCESS",
              reasonCode: input.reasonCode,
              correlationId: context.requestId,
              metadata: {
                reportId: String(report._id),
                caseId: String(moderationCase._id),
              },
              occurredAt: now,
            },
          ],
          { session },
        );
      if (notificationWriter)
        await notificationWriter.create(
          {
            recipientId: report.reporterId,
            actorId: userId,
            sourceEventId: `report-resolved:${report._id}`,
            category: "REPORT_RESOLVED",
            targetType: "REPORT",
            targetId: report._id,
          },
          session,
        );
      result = {
        report: safeReport(report),
        caseId: String(moderationCase._id),
        actionId: String(action._id),
        outcome: input.outcome,
      };
    });
    return result;
  }

  return {
    createReport,
    ownReports,
    ownReport,
    adminReports,
    adminReport: adminReportDetails,
    resolveReport,
  };
}
