import { Router } from "express";
import { requireIdempotencyKey } from "../../middleware/idempotency.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createProjectController } from "./project.controller.js";
import {
  createOpeningRequest,
  createProjectRequest,
  listProjectsRequest,
  mineProjectsRequest,
  openingCommandRequest,
  projectCommandRequest,
  projectRequest,
  recruitmentRequest,
  updateOpeningRequest,
  updateProjectRequest,
} from "./project.validation.js";

export function createProjectRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const c = createProjectController(dependencies);
  router.post(
    "/projects",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(createProjectRequest),
    c.create,
  );
  router.get(
    "/projects",
    auth.optionalAuthenticate,
    validateRequest(listProjectsRequest),
    c.list,
  );
  router.get(
    "/projects/mine",
    auth.authenticate,
    validateRequest(mineProjectsRequest),
    c.mine,
  );
  router.get(
    "/projects/:projectId",
    auth.optionalAuthenticate,
    validateRequest(projectRequest),
    c.get,
  );
  router.patch(
    "/projects/:projectId",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(updateProjectRequest),
    c.update,
  );
  router.post(
    "/projects/:projectId\\:publish",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(projectCommandRequest),
    c.publish,
  );
  router.post(
    "/projects/:projectId\\:transition",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(projectCommandRequest),
    c.transition,
  );
  router.patch(
    "/projects/:projectId/recruitment",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(recruitmentRequest),
    c.recruitment,
  );
  router.post(
    "/projects/:projectId/openings",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(createOpeningRequest),
    c.addOpening,
  );
  router.patch(
    "/projects/:projectId/openings/:openingId",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(updateOpeningRequest),
    c.updateOpening,
  );
  router.post(
    "/projects/:projectId/openings/:openingId\\:close",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(openingCommandRequest),
    c.openingState("closeOpening"),
  );
  router.post(
    "/projects/:projectId/openings/:openingId\\:reopen",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(openingCommandRequest),
    c.openingState("reopenOpening"),
  );
  return router;
}
