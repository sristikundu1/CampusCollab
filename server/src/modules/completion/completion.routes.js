import { Router } from "express";
import { requireIdempotencyKey } from "../../middleware/idempotency.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createCompletionController } from "./completion.controller.js";
import {
  completionRecordRequest,
  listCompletionRequest,
  requestCompletionRequest,
  respondCompletionRequest,
} from "./completion.validation.js";

export function createCompletionRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createCompletionController(dependencies);

  router.post(
    "/completion-records",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(requestCompletionRequest),
    controller.request,
  );
  router.get(
    "/completion-records",
    auth.authenticate,
    validateRequest(listCompletionRequest),
    controller.list,
  );
  router.get(
    "/completion-records/:recordId",
    auth.authenticate,
    validateRequest(completionRecordRequest),
    controller.get,
  );
  router.post(
    "/completion-records/:recordId\\:respond",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(respondCompletionRequest),
    controller.respond,
  );
  return router;
}
