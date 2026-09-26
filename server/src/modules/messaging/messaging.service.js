import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../../errors/application-error.js";
import { withTransaction } from "../../lib/mongo/transaction.js";
import { createCursorCodec } from "../../lib/pagination/cursor.js";
import { Gig } from "../gigs/gig.model.js";
import { ProjectMembership } from "../participation/project-membership.model.js";
import { Profile } from "../profiles/profile.model.js";
import { Project } from "../projects/project.model.js";
import { Proposal } from "../proposals/proposal.model.js";
import { Conversation } from "./conversation.model.js";
import { Message } from "./message.model.js";

const q = async (query, { session, lean = false, select } = {}) => {
  let value = query;
  if (session && value?.session) value = value.session(session);
  if (select && value?.select) value = value.select(select);
  if (lean && value?.lean) value = value.lean();
  return value;
};
const sameId = (left, right) => String(left) === String(right);

export function createMessagingService({
  config,
  ConversationModel = Conversation,
  MessageModel = Message,
  ProjectModel = Project,
  MembershipModel = ProjectMembership,
  ProposalModel = Proposal,
  GigModel = Gig,
  ProfileModel = Profile,
  transaction = withTransaction,
} = {}) {
  const cursorCodec = createCursorCodec(config.csrfSecret);

  async function relationship(contextType, contextId, session) {
    if (contextType === "PROJECT") {
      const project = await q(ProjectModel.findById(contextId), {
        session,
        lean: true,
      });
      if (
        !project ||
        ["DRAFT", "CANCELLED", "ARCHIVED"].includes(project.status)
      )
        throw new NotFoundError();
      const memberships = await q(
        MembershipModel.find({ projectId: contextId, status: "ACTIVE" }),
        { session, lean: true },
      );
      return {
        title: project.title,
        participants: [
          { userId: project.ownerId, role: "OWNER" },
          ...memberships.map((membership) => ({
            userId: membership.userId,
            role: "PROJECT_MEMBER",
          })),
        ],
      };
    }

    const proposal = await q(ProposalModel.findById(contextId), {
      session,
      lean: true,
    });
    if (!proposal || proposal.status !== "ACCEPTED") throw new NotFoundError();
    const gig = await q(GigModel.findById(proposal.gigId), {
      session,
      lean: true,
    });
    if (!gig || ["CANCELLED", "ARCHIVED"].includes(gig.status))
      throw new NotFoundError();
    return {
      title: gig.title,
      participants: [
        { userId: gig.ownerId, role: "OWNER" },
        { userId: proposal.applicantId, role: "GIG_PARTICIPANT" },
      ],
    };
  }

  async function currentAccess(conversation, userId, { send = false } = {}) {
    const stored = conversation.participants.find((participant) =>
      sameId(participant.userId, userId),
    );
    if (!stored) throw new NotFoundError();
    if (!send) return stored;
    const live = await relationship(
      conversation.contextType,
      conversation.contextId,
    );
    const active = live.participants.some((participant) =>
      sameId(participant.userId, userId),
    );
    if (
      !active ||
      stored.status !== "ACTIVE" ||
      !stored.canSend ||
      conversation.status !== "OPEN"
    )
      throw new AuthorizationError(
        "CONVERSATION_READ_ONLY",
        "You can view this conversation but cannot send new messages.",
      );
    return stored;
  }

  async function profilesFor(userIds) {
    if (!userIds.length) return new Map();
    const profiles = await q(
      ProfileModel.find({ userId: { $in: userIds } }).select(
        "userId displayName headline avatarUrl",
      ),
      { lean: true },
    );
    return new Map(
      profiles.map((profile) => [String(profile.userId), profile]),
    );
  }

  async function serializeConversation(
    conversation,
    viewerId,
    unreadCount = 0,
  ) {
    const profileMap = await profilesFor(
      conversation.participants.map((participant) => participant.userId),
    );
    const participants = conversation.participants.map((participant) => {
      const profile = profileMap.get(String(participant.userId));
      return {
        userId: String(participant.userId),
        displayName: profile?.displayName ?? "CampusCollab member",
        headline: profile?.headline ?? "",
        avatarUrl: profile?.avatarUrl ?? null,
        role: participant.role,
        status: participant.status,
        canSend: participant.canSend,
        isSelf: sameId(participant.userId, viewerId),
      };
    });
    return {
      id: String(conversation._id),
      contextType: conversation.contextType,
      contextId: String(conversation.contextId),
      status: conversation.status,
      participants,
      title:
        participants.find((participant) => !participant.isSelf)?.displayName ??
        "Project conversation",
      lastMessageAt: conversation.lastMessageAt ?? null,
      lastMessagePreview: conversation.lastMessagePreview ?? "",
      unreadCount,
      canSend: Boolean(
        participants.find((participant) => participant.isSelf)?.canSend &&
        conversation.status === "OPEN",
      ),
    };
  }

  async function resolve(userId, input) {
    const live = await relationship(input.contextType, input.contextId);
    if (
      !live.participants.some((participant) =>
        sameId(participant.userId, userId),
      )
    )
      throw new NotFoundError();
    const now = new Date();
    let conversation = await q(
      ConversationModel.findOne({
        contextType: input.contextType,
        contextId: input.contextId,
      }),
    );
    if (!conversation) {
      try {
        conversation = await ConversationModel.create({
          contextType: input.contextType,
          contextId: input.contextId,
          participants: live.participants.map((participant) => ({
            ...participant,
            status: "ACTIVE",
            canSend: true,
            joinedAt: now,
          })),
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        conversation = await q(
          ConversationModel.findOne({
            contextType: input.contextType,
            contextId: input.contextId,
          }),
        );
      }
    } else if (input.contextType === "PROJECT") {
      const active = new Map(
        live.participants.map((participant) => [
          String(participant.userId),
          participant,
        ]),
      );
      for (const participant of conversation.participants) {
        const current = active.get(String(participant.userId));
        participant.status = current ? "ACTIVE" : "READ_ONLY";
        participant.canSend = Boolean(current);
        participant.accessChangedAt = now;
        active.delete(String(participant.userId));
      }
      for (const participant of active.values())
        conversation.participants.push({
          ...participant,
          status: "ACTIVE",
          canSend: true,
          joinedAt: now,
        });
      await conversation.save();
    }
    return serializeConversation(conversation, userId, 0);
  }

  async function list(userId, { limit }) {
    const conversations = await q(
      ConversationModel.find({
        participants: {
          $elemMatch: { userId, status: { $in: ["ACTIVE", "READ_ONLY"] } },
        },
      })
        .select("+lastMessagePreview +messageCount")
        .sort({ lastMessageAt: -1, _id: -1 })
        .limit(limit),
      { lean: true },
    );
    return Promise.all(
      conversations.map(async (conversation) => {
        const participant = conversation.participants.find((item) =>
          sameId(item.userId, userId),
        );
        const unreadCount = await q(
          MessageModel.countDocuments({
            conversationId: conversation._id,
            senderId: { $ne: userId },
            moderationStatus: "VISIBLE",
            ...(participant?.lastReadAt
              ? { sentAt: { $gt: participant.lastReadAt } }
              : {}),
          }),
        );
        return serializeConversation(conversation, userId, unreadCount);
      }),
    );
  }

  async function get(userId, conversationId) {
    const conversation = await q(
      ConversationModel.findById(conversationId).select(
        "+lastMessagePreview +messageCount",
      ),
      { lean: true },
    );
    if (!conversation) throw new NotFoundError();
    const participant = await currentAccess(conversation, userId);
    const unreadCount = await q(
      MessageModel.countDocuments({
        conversationId,
        senderId: { $ne: userId },
        moderationStatus: "VISIBLE",
        ...(participant?.lastReadAt
          ? { sentAt: { $gt: participant.lastReadAt } }
          : {}),
      }),
    );
    return serializeConversation(conversation, userId, unreadCount);
  }

  const serializeMessage = (message, profileMap, viewerId) => {
    const profile = profileMap.get(String(message.senderId));
    return {
      id: String(message._id),
      conversationId: String(message.conversationId),
      sender: {
        id: String(message.senderId),
        displayName: profile?.displayName ?? "CampusCollab member",
        avatarUrl: profile?.avatarUrl ?? null,
      },
      body: message.body,
      sentAt: message.sentAt,
      isOwn: sameId(message.senderId, viewerId),
    };
  };

  async function messages(userId, conversationId, input) {
    const conversation = await q(ConversationModel.findById(conversationId));
    if (!conversation) throw new NotFoundError();
    await currentAccess(conversation, userId);
    const scope = `messages:${conversationId}`;
    const decoded = cursorCodec.decode(input.cursor, scope);
    const filter = {
      conversationId,
      moderationStatus: "VISIBLE",
      ...(decoded
        ? {
            $or: [
              { sentAt: { $lt: new Date(decoded.at) } },
              { sentAt: new Date(decoded.at), _id: { $lt: decoded.id } },
            ],
          }
        : {}),
    };
    const rows = await q(
      MessageModel.find(filter)
        .select("+body")
        .sort({ sentAt: -1, _id: -1 })
        .limit(input.limit + 1),
      { lean: true },
    );
    const hasMore = rows.length > input.limit;
    const selected = hasMore ? rows.slice(0, input.limit) : rows;
    const last = selected.at(-1);
    const profileMap = await profilesFor([
      ...new Set(selected.map((message) => String(message.senderId))),
    ]);
    return {
      messages: selected
        .map((message) => serializeMessage(message, profileMap, userId))
        .reverse(),
      hasMore,
      nextCursor:
        hasMore && last
          ? cursorCodec.encode({
              scope,
              at: new Date(last.sentAt).toISOString(),
              id: String(last._id),
            })
          : null,
    };
  }

  async function send(userId, conversationId, input) {
    let messageId;
    await transaction(async (session) => {
      const conversation = await q(ConversationModel.findById(conversationId), {
        session,
      });
      if (!conversation) throw new NotFoundError();
      await currentAccess(conversation, userId, { send: true });
      const duplicate = await q(
        MessageModel.findOne({
          conversationId,
          senderId: userId,
          clientMessageId: input.clientMessageId,
        }),
        { session, select: "+body" },
      );
      if (duplicate) {
        messageId = duplicate._id;
        return;
      }
      const now = new Date();
      const [message] = await MessageModel.create(
        [
          {
            conversationId,
            senderId: userId,
            clientMessageId: input.clientMessageId,
            messageType: "TEXT",
            body: input.body,
            sentAt: now,
          },
        ],
        { session },
      );
      const updated = await ConversationModel.updateOne(
        { _id: conversationId, status: "OPEN" },
        {
          $set: {
            lastMessageId: message._id,
            lastMessageAt: now,
            lastMessagePreview: input.body.slice(0, 160),
            "participants.$[sender].lastReadAt": now,
            "participants.$[sender].lastReadMessageId": message._id,
          },
          $inc: { messageCount: 1 },
        },
        { session, arrayFilters: [{ "sender.userId": userId }] },
      );
      if (updated.modifiedCount !== 1)
        throw new ConflictError(
          "CONVERSATION_CHANGED",
          "The conversation changed. Refresh and try again.",
        );
      messageId = message._id;
    });
    const message = await q(MessageModel.findById(messageId), {
      lean: true,
      select: "+body",
    });
    const profileMap = await profilesFor([message.senderId]);
    return serializeMessage(message, profileMap, userId);
  }

  async function markRead(userId, conversationId, messageId) {
    const conversation = await q(ConversationModel.findById(conversationId));
    if (!conversation) throw new NotFoundError();
    await currentAccess(conversation, userId);
    const message = await q(
      MessageModel.findOne({
        _id: messageId,
        conversationId,
        moderationStatus: "VISIBLE",
      }),
      { lean: true },
    );
    if (!message) throw new NotFoundError();
    await ConversationModel.updateOne(
      {
        _id: conversationId,
        participants: {
          $elemMatch: {
            userId,
            $or: [
              { lastReadAt: { $exists: false } },
              { lastReadAt: { $lte: message.sentAt } },
            ],
          },
        },
      },
      {
        $set: {
          "participants.$.lastReadAt": message.sentAt,
          "participants.$.lastReadMessageId": message._id,
        },
      },
    );
    return {
      conversationId: String(conversationId),
      lastReadMessageId: String(message._id),
      lastReadAt: message.sentAt,
    };
  }

  return { resolve, list, get, messages, send, markRead };
}
