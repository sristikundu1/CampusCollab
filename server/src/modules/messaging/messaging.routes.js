import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { RateLimitError } from "../../errors/application-error.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createMessagingController } from "./messaging.controller.js";
import {
  conversationRequest,
  listConversationsRequest,
  listMessagesRequest,
  markReadRequest,
  resolveConversationRequest,
  sendMessageRequest,
} from "./messaging.validation.js";

export function createMessagingRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createMessagingController(dependencies);
  const sendLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Authentication runs before this limiter, so the stable account id is
    // available and one user cannot rotate IP addresses to evade the limit.
    keyGenerator: (request) => String(request.auth.user._id),
    handler: (_request, _response, next) => next(new RateLimitError()),
  });

  router.post(
    "/conversations",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(resolveConversationRequest),
    controller.resolve,
  );
  router.get(
    "/conversations",
    auth.authenticate,
    validateRequest(listConversationsRequest),
    controller.list,
  );
  router.get(
    "/conversations/:conversationId",
    auth.authenticate,
    validateRequest(conversationRequest),
    controller.get,
  );
  router.get(
    "/conversations/:conversationId/messages",
    auth.authenticate,
    validateRequest(listMessagesRequest),
    controller.messages,
  );
  router.post(
    "/conversations/:conversationId/messages",
    auth.authenticate,
    auth.requireCsrf,
    sendLimiter,
    validateRequest(sendMessageRequest),
    controller.sendMessage,
  );
  router.post(
    "/conversations/:conversationId/read",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(markReadRequest),
    controller.markRead,
  );
  return router;
}
