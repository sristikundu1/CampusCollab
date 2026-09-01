import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireIdempotencyKey } from "../../middleware/idempotency.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createParticipationController } from "./participation.controller.js";
import {
  candidateRequest,
  invitationCommandRequest,
  invitationItemRequest,
  invitationListRequest,
  joinCommandRequest,
  joinItemRequest,
  joinListRequest,
  membersRequest,
  membershipCommandRequest,
  projectInvitationListRequest,
  projectJoinListRequest,
  sendInvitationRequest,
  submitJoinRequest,
} from "./participation.validation.js";
export function createParticipationRouter(dependencies) {
  const r = Router(),
    auth = createAuthenticationMiddleware(dependencies),
    c = createParticipationController(dependencies);
  const writeLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 50,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => String(req.auth.user._id),
  });
  r.post(
    "/projects/:projectId/openings/:openingId/join-requests",
    auth.authenticate,
    writeLimit,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(submitJoinRequest),
    c.submitJoin,
  );
  r.get(
    "/join-requests/mine",
    auth.authenticate,
    validateRequest(joinListRequest),
    c.myJoins,
  );
  r.get(
    "/projects/:projectId/join-requests",
    auth.authenticate,
    validateRequest(projectJoinListRequest),
    c.projectJoins,
  );
  r.get(
    "/join-requests/:requestId",
    auth.authenticate,
    validateRequest(joinItemRequest),
    c.getJoin,
  );
  for (const [route, action] of [
    ["withdraw", "withdrawJoin"],
    ["accept", "acceptJoin"],
    ["reject", "rejectJoin"],
  ])
    r.post(
      `/join-requests/:requestId\\:${route}`,
      auth.authenticate,
      auth.requireCsrf,
      requireIdempotencyKey,
      validateRequest(joinCommandRequest),
      c.joinCommand(action),
    );
  r.post(
    "/projects/:projectId/openings/:openingId/invitations",
    auth.authenticate,
    writeLimit,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(sendInvitationRequest),
    c.sendInvite,
  );
  r.get(
    "/invitations/mine",
    auth.authenticate,
    validateRequest(invitationListRequest),
    c.myInvitations,
  );
  r.get(
    "/projects/:projectId/invitations",
    auth.authenticate,
    validateRequest(projectInvitationListRequest),
    c.projectInvitations,
  );
  r.get(
    "/invitations/:invitationId",
    auth.authenticate,
    validateRequest(invitationItemRequest),
    c.getInvitation,
  );
  for (const [route, action] of [
    ["accept", "acceptInvitation"],
    ["reject", "rejectInvitation"],
    ["revoke", "revokeInvitation"],
  ])
    r.post(
      `/invitations/:invitationId\\:${route}`,
      auth.authenticate,
      auth.requireCsrf,
      requireIdempotencyKey,
      validateRequest(invitationCommandRequest),
      c.invitationCommand(action),
    );
  r.get(
    "/projects/:projectId/members",
    auth.authenticate,
    validateRequest(membersRequest),
    c.members,
  );
  r.post(
    "/projects/:projectId/members/:membershipId\\:leave",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(membershipCommandRequest),
    c.membershipCommand("leave"),
  );
  r.post(
    "/projects/:projectId/members/:membershipId\\:remove",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(membershipCommandRequest),
    c.membershipCommand("remove"),
  );
  r.get(
    "/projects/:projectId/invite-candidates",
    auth.authenticate,
    validateRequest(candidateRequest),
    c.candidates,
  );
  return r;
}
