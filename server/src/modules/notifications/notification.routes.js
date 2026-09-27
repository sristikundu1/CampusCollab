import { Router } from "express";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createNotificationController } from "./notification.controller.js";
import {
  listNotificationsRequest,
  notificationEmptyRequest,
  notificationReadRequest,
} from "./notification.validation.js";

export function createNotificationRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createNotificationController(dependencies);

  router.get(
    "/notifications",
    auth.authenticate,
    validateRequest(listNotificationsRequest),
    controller.list,
  );
  router.get(
    "/notifications/unread-count",
    auth.authenticate,
    validateRequest(notificationEmptyRequest),
    controller.unreadCount,
  );
  router.patch(
    "/notifications/read-all",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(notificationEmptyRequest),
    controller.markAllRead,
  );
  router.patch(
    "/notifications/:notificationId/read",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(notificationReadRequest),
    controller.markRead,
  );
  return router;
}
