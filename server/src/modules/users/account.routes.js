import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { RateLimitError } from "../../errors/application-error.js";
import { requireIdempotencyKey } from "../../middleware/idempotency.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createAccountController } from "./account.controller.js";
import {
  cancelDeletionRequest,
  requestDeletionRequest,
} from "./account.validation.js";

export function createAccountRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createAccountController(dependencies);
  const sensitiveLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, _response, next) => next(new RateLimitError()),
  });
  router.post(
    "/users/me/account-deletion",
    auth.authenticate,
    auth.requireCsrf,
    sensitiveLimit,
    requireIdempotencyKey,
    validateRequest(requestDeletionRequest),
    controller.requestDeletion,
  );
  router.post(
    "/users/me/account-deletion\\:cancel",
    sensitiveLimit,
    requireIdempotencyKey,
    validateRequest(cancelDeletionRequest),
    controller.cancelDeletion,
  );
  return router;
}
