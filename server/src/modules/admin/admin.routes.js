import { Router } from "express";
import { requireIdempotencyKey } from "../../middleware/idempotency.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createAdminController } from "./admin.controller.js";
import {
  adminCreateDomainRequest,
  adminCreateSkillRequest,
  adminCreateUniversityRequest,
  adminSkillsRequest,
  adminUpdateDomainRequest,
  adminUpdateSkillRequest,
  adminUpdateUniversityRequest,
  adminUserCommandRequest,
  adminUsersRequest,
  adminUniversitiesRequest,
} from "./admin.validation.js";

export function createAdminRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createAdminController(dependencies);
  const read = (path, validation, handler) =>
    router.get(path, auth.authenticate, validateRequest(validation), handler);
  const write = (method, path, validation, handler) =>
    router[method](
      path,
      auth.authenticate,
      auth.requireCsrf,
      requireIdempotencyKey,
      validateRequest(validation),
      handler,
    );
  read("/admin/users", adminUsersRequest, controller.users);
  write(
    "post",
    "/admin/users/:userId\\:suspend",
    adminUserCommandRequest,
    controller.userCommand("suspendUser"),
  );
  write(
    "post",
    "/admin/users/:userId\\:reinstate",
    adminUserCommandRequest,
    controller.userCommand("reinstateUser"),
  );
  read("/admin/skills", adminSkillsRequest, controller.skills);
  write(
    "post",
    "/admin/skills",
    adminCreateSkillRequest,
    controller.createSkill,
  );
  write(
    "patch",
    "/admin/skills/:skillId",
    adminUpdateSkillRequest,
    controller.updateSkill,
  );
  read(
    "/admin/universities",
    adminUniversitiesRequest,
    controller.universities,
  );
  write(
    "post",
    "/admin/universities",
    adminCreateUniversityRequest,
    controller.createUniversity,
  );
  write(
    "patch",
    "/admin/universities/:universityId",
    adminUpdateUniversityRequest,
    controller.updateUniversity,
  );
  write(
    "post",
    "/admin/universities/:universityId/domains",
    adminCreateDomainRequest,
    controller.createDomain,
  );
  write(
    "patch",
    "/admin/university-domains/:domainId",
    adminUpdateDomainRequest,
    controller.updateDomain,
  );
  return router;
}
