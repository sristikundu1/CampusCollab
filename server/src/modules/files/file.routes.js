import { Router } from "express";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createFileController } from "./file.controller.js";
import {
  attachmentRequest,
  uploadMessageAttachmentRequest,
} from "./file.validation.js";

export function createFileRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createFileController(dependencies);
  router.post(
    "/attachments/messages",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(uploadMessageAttachmentRequest),
    controller.uploadMessageAttachment,
  );
  router.get(
    "/attachments/:attachmentId/content",
    auth.authenticate,
    validateRequest(attachmentRequest),
    controller.content,
  );
  router.delete(
    "/attachments/:attachmentId",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(attachmentRequest),
    controller.remove,
  );
  return router;
}
