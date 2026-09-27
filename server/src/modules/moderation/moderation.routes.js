import { Router } from "express";
import { requireIdempotencyKey } from "../../middleware/idempotency.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createModerationController } from "./moderation.controller.js";
import {
  adminListReportsRequest,
  createReportRequest,
  listOwnReportsRequest,
  reportRequest,
  resolveReportRequest,
} from "./moderation.validation.js";

export function createModerationRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createModerationController(dependencies);
  router.post(
    "/reports",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(createReportRequest),
    controller.createReport,
  );
  router.get(
    "/reports/mine",
    auth.authenticate,
    validateRequest(listOwnReportsRequest),
    controller.ownReports,
  );
  router.get(
    "/reports/:reportId",
    auth.authenticate,
    validateRequest(reportRequest),
    controller.ownReport,
  );
  router.get(
    "/admin/reports",
    auth.authenticate,
    validateRequest(adminListReportsRequest),
    controller.adminReports,
  );
  router.get(
    "/admin/reports/:reportId",
    auth.authenticate,
    validateRequest(reportRequest),
    controller.adminReport,
  );
  router.post(
    "/admin/reports/:reportId\\:resolve",
    auth.authenticate,
    auth.requireCsrf,
    requireIdempotencyKey,
    validateRequest(resolveReportRequest),
    controller.resolve,
  );
  return router;
}
