import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { RateLimitError } from "../../errors/application-error.js";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthController } from "./auth.controller.js";
import { createAuthenticationMiddleware } from "./auth.middleware.js";
import {
  emailRequest,
  loginRequest,
  registerRequest,
  resetPasswordRequest,
  tokenRequest,
} from "./auth.validation.js";

export function createAuthRouter(dependencies) {
  const router = Router();
  const controller = createAuthController(dependencies);
  const auth = createAuthenticationMiddleware(dependencies);
  const limiter = (name, limit, windowMs) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      store: dependencies.rateLimitStoreFor?.(`auth:${name}`),
      handler: (_req, _res, next) => next(new RateLimitError()),
    });
  router.post(
    "/register",
    limiter("register", 5, 60 * 60 * 1000),
    validateRequest(registerRequest),
    controller.register,
  );
  router.post(
    "/login",
    limiter("login", 10, 15 * 60 * 1000),
    validateRequest(loginRequest),
    controller.login,
  );
  router.post(
    "/logout",
    auth.authenticate,
    auth.requireCsrf,
    controller.logout,
  );
  router.get("/me", auth.authenticate, controller.me);
  router.post(
    "/verify-email",
    limiter("verify-email", 10, 60 * 60 * 1000),
    validateRequest(tokenRequest),
    controller.verify,
  );
  router.post(
    "/verification/resend",
    limiter("verification-resend", 3, 60 * 60 * 1000),
    validateRequest(emailRequest),
    controller.resend,
  );
  router.post(
    "/password/forgot",
    limiter("password-forgot", 3, 60 * 60 * 1000),
    validateRequest(emailRequest),
    controller.forgot,
  );
  router.post(
    "/password/reset",
    limiter("password-reset", 5, 60 * 60 * 1000),
    validateRequest(resetPasswordRequest),
    controller.reset,
  );
  return router;
}
