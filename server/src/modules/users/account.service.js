import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from "../../errors/application-error.js";
import { verifyPassword } from "../../lib/crypto/password.js";
import { withTransaction } from "../../lib/mongo/transaction.js";
import { AuditEvent } from "../audit/audit-event.model.js";
import { OutboxEvent } from "../audit/outbox-event.model.js";
import { Session } from "../auth/session.model.js";
import { User } from "../auth/user.model.js";
import { AccountDeletionJob } from "./account-deletion-job.model.js";

const q = async (query, { select, session } = {}) => {
  let value = query;
  if (session && value?.session) value = value.session(session);
  if (select && value?.select) value = value.select(select);
  return value;
};

export function createAccountService({
  UserModel = User,
  SessionModel = Session,
  DeletionModel = AccountDeletionJob,
  AuditModel = AuditEvent,
  OutboxModel = OutboxEvent,
  transaction = withTransaction,
  passwordMatches = verifyPassword,
} = {}) {
  async function lifecycleEvent(
    session,
    { userId, eventName, requestId, version },
  ) {
    const now = new Date();
    if (AuditModel)
      await AuditModel.create(
        [
          {
            eventName,
            category: "PRIVACY",
            actorType: "USER",
            actorId: userId,
            targetType: "USER",
            targetId: userId,
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
            aggregateType: "USER",
            aggregateId: userId,
            aggregateVersion: version,
            payload: { userId: String(userId) },
            availableAt: now,
          },
        ],
        { session },
      );
  }

  async function requestDeletion(userId, input, context) {
    const user = await q(UserModel.findById(userId), {
      select: "+passwordHash +legalOrSafetyHold",
    });
    if (!user) throw new NotFoundError();
    if (!(await passwordMatches(input.password, user.passwordHash)))
      throw new AuthenticationError(
        "INVALID_CREDENTIALS",
        "Your password is incorrect.",
      );
    if (user.status !== "ACTIVE")
      throw new ConflictError(
        "INVALID_ACCOUNT_STATE",
        "This account cannot enter the deletion workflow.",
      );
    const now = new Date();
    const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let job;
    await transaction(async (session) => {
      const updated = await UserModel.findOneAndUpdate(
        { _id: userId, status: "ACTIVE" },
        {
          $set: {
            status: "DELETION_PENDING",
            statusChangedAt: now,
            statusReasonCode: "USER_REQUESTED_DELETION",
            deletionRequestedAt: now,
            deletionScheduledFor: scheduledFor,
          },
          $inc: { securityVersion: 1, version: 1 },
        },
        { returnDocument: "after", runValidators: true, session },
      );
      if (!updated)
        throw new ConflictError(
          "DELETION_ALREADY_REQUESTED",
          "Account deletion has already been requested.",
        );
      [job] = await DeletionModel.create(
        [
          {
            userId,
            status: user.legalOrSafetyHold ? "BLOCKED_HOLD" : "RECOVERY_WINDOW",
            requestedAt: now,
            scheduledFor,
            steps: [
              { category: "PERSONAL_DATA", status: "PENDING" },
              { category: "PUBLIC_CONTENT", status: "PENDING" },
              { category: "SHARED_HISTORY", status: "PENDING" },
              { category: "IDENTITY", status: "PENDING" },
            ],
          },
        ],
        { session },
      );
      await SessionModel.updateMany(
        { userId, status: "ACTIVE" },
        {
          $set: {
            status: "REVOKED",
            revokedAt: now,
            revokeReason: "ACCOUNT_DELETION_REQUESTED",
          },
          $inc: { version: 1 },
        },
        { session },
      );
      await lifecycleEvent(session, {
        userId,
        eventName: "ACCOUNT_DELETION_REQUESTED",
        requestId: context.requestId,
        version: updated.version,
      });
    });
    return {
      status: job.status,
      scheduledFor,
      recoveryDeadline: scheduledFor,
    };
  }

  async function cancelDeletion(input, context) {
    const user = await q(
      UserModel.findOne({ email: input.email, status: "DELETION_PENDING" }),
      { select: "+passwordHash" },
    );
    if (!user || !(await passwordMatches(input.password, user.passwordHash)))
      throw new AuthenticationError(
        "INVALID_RECOVERY_CREDENTIALS",
        "The recovery details are invalid.",
      );
    const now = new Date();
    if (!user.deletionScheduledFor || user.deletionScheduledFor <= now)
      throw new ConflictError(
        "RECOVERY_WINDOW_EXPIRED",
        "The account recovery window has ended.",
      );
    await transaction(async (session) => {
      const restored = await UserModel.findOneAndUpdate(
        {
          _id: user._id,
          status: "DELETION_PENDING",
          deletionScheduledFor: { $gt: now },
        },
        {
          $set: {
            status: "ACTIVE",
            statusChangedAt: now,
            statusReasonCode: "DELETION_CANCELLED",
          },
          $unset: {
            deletionRequestedAt: 1,
            deletionScheduledFor: 1,
          },
          $inc: { securityVersion: 1, version: 1 },
        },
        { returnDocument: "after", runValidators: true, session },
      );
      if (!restored) throw new ConflictError("RECOVERY_WINDOW_EXPIRED");
      await DeletionModel.updateOne(
        {
          userId: user._id,
          status: { $in: ["RECOVERY_WINDOW", "BLOCKED_HOLD", "READY"] },
        },
        {
          $set: { status: "CANCELLED", cancelledAt: now },
          $inc: { version: 1 },
        },
        { session, runValidators: true },
      );
      await lifecycleEvent(session, {
        userId: user._id,
        eventName: "ACCOUNT_DELETION_CANCELLED",
        requestId: context.requestId,
        version: restored.version,
      });
    });
    return {
      status: "ACTIVE",
      message: "Account deletion was cancelled. You can sign in again.",
    };
  }

  return { requestDeletion, cancelDeletion };
}
