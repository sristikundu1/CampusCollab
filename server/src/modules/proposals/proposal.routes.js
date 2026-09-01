import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireIdempotencyKey } from "../../middleware/idempotency.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createProposalController } from "./proposal.controller.js";
import {
  ownerProposalListRequest,
  proposalCommandRequest,
  proposalListRequest,
  proposalRequest,
  submitProposalRequest,
  updateProposalRequest,
} from "./proposal.validation.js";

export function createProposalRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createProposalController(dependencies);
  const submitLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: dependencies.rateLimitStoreFor?.("proposal:submit"),
    keyGenerator: (request) => String(request.auth.user._id),
  });
  router.post(
    "/gigs/:gigId/proposals",
    auth.authenticate,
    submitLimit,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(submitProposalRequest),
    controller.submit,
  );
  router.get(
    "/proposals/mine",
    auth.authenticate,
    validateRequest(proposalListRequest),
    controller.mine,
  );
  router.get(
    "/gigs/:gigId/proposals",
    auth.authenticate,
    validateRequest(ownerProposalListRequest),
    controller.forGig,
  );
  router.get(
    "/proposals/:proposalId",
    auth.authenticate,
    validateRequest(proposalRequest),
    controller.get,
  );
  router.patch(
    "/proposals/:proposalId",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(updateProposalRequest),
    controller.update,
  );
  router.post(
    "/proposals/:proposalId\\:withdraw",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(proposalCommandRequest),
    controller.withdraw,
  );
  for (const action of ["shortlist", "accept", "reject"])
    router.post(
      `/proposals/:proposalId\\:${action}`,
      auth.authenticate,
      auth.requireCsrf,
      requireIdempotencyKey,
      validateRequest(proposalCommandRequest),
      controller.decision(action),
    );
  return router;
}
