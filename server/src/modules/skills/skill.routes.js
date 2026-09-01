import { Router } from "express";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createSkillController } from "./skill.controller.js";
import { createSkillRequest, listSkillsRequest } from "./skill.validation.js";

export function createSkillRouter(dependencies) {
  const router = Router();
  const controller = createSkillController(dependencies);
  const auth = createAuthenticationMiddleware(dependencies);
  router.get("/", validateRequest(listSkillsRequest), controller.list);
  router.post(
    "/",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(createSkillRequest),
    controller.create,
  );
  return router;
}
