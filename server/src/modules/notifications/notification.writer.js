import { Notification } from "./notification.model.js";

const content = Object.freeze({
  PROPOSAL_RECEIVED: {
    title: "New proposal received",
    preview: "A student submitted a proposal for your gig.",
  },
  PROPOSAL_ACCEPTED: {
    title: "Proposal accepted",
    preview: "Your proposal was accepted.",
  },
  PROPOSAL_REJECTED: {
    title: "Proposal update",
    preview: "Your proposal was not selected.",
  },
  JOIN_REQUEST_RECEIVED: {
    title: "New join request",
    preview: "A student requested to join your project.",
  },
  JOIN_REQUEST_ACCEPTED: {
    title: "Join request accepted",
    preview: "Your project join request was accepted.",
  },
  JOIN_REQUEST_REJECTED: {
    title: "Join request update",
    preview: "Your project join request was not accepted.",
  },
  PROJECT_INVITATION_RECEIVED: {
    title: "Project invitation",
    preview: "You received an invitation to join a project.",
  },
  PROJECT_INVITATION_ACCEPTED: {
    title: "Invitation accepted",
    preview: "A student accepted your project invitation.",
  },
  PROJECT_INVITATION_REJECTED: {
    title: "Invitation declined",
    preview: "A student declined your project invitation.",
  },
  PROJECT_MEMBER_LEFT: {
    title: "Project member left",
    preview: "A member left your project.",
  },
  PROJECT_MEMBER_REMOVED: {
    title: "Project membership ended",
    preview: "Your project membership was ended by the project owner.",
  },
  MESSAGE_RECEIVED: {
    title: "New message",
    preview: "You have a new message.",
  },
  COMPLETION_REQUESTED: {
    title: "Completion confirmation requested",
    preview: "An owner asked you to confirm that your work is complete.",
  },
  COMPLETION_ACKNOWLEDGED: {
    title: "Completion confirmed",
    preview: "A participant confirmed that their work is complete.",
  },
  COMPLETION_DISPUTED: {
    title: "Completion disputed",
    preview: "A participant disputed a completion request.",
  },
  REPORT_RESOLVED: {
    title: "Report reviewed",
    preview: "The moderation team reviewed your report.",
  },
});

export function createNotificationWriter({
  NotificationModel = Notification,
} = {}) {
  async function create(
    { recipientId, actorId, sourceEventId, category, targetType, targetId },
    session,
  ) {
    if (!content[category])
      throw new TypeError("Unsupported notification category");
    if (String(recipientId) === String(actorId)) return null;
    const trusted = content[category];
    await NotificationModel.updateOne(
      { recipientId, sourceEventId, category },
      {
        $setOnInsert: {
          recipientId,
          sourceEventId,
          category,
          targetType,
          targetId,
          title: trusted.title,
          preview: trusted.preview,
          status: "UNREAD",
        },
      },
      { upsert: true, session, runValidators: true },
    );
    return true;
  }

  return { create };
}
