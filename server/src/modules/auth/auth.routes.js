import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RateLimitError } from '../../errors/application-error.js';
import { validateRequest } from '../../middleware/validate.js';
import { createAuthController } from './auth.controller.js';
import { createAuthenticationMiddleware } from './auth.middleware.js';
import { emailRequest, loginRequest, registerRequest, resetPasswordRequest, tokenRequest } from './auth.validation.js';

const limiter = (limit, windowMs) => rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, _res, next) => next(new RateLimitError()) });

export function createAuthRouter(dependencies) {
  const router = Router();
  const controller = createAuthController(dependencies);
  const auth = createAuthenticationMiddleware(dependencies);
  router.post('/register', limiter(5, 60 * 60 * 1000), validateRequest(registerRequest), controller.register);
  router.post('/login', limiter(10, 15 * 60 * 1000), validateRequest(loginRequest), controller.login);
  router.post('/logout', auth.authenticate, auth.requireCsrf, controller.logout);
  router.get('/me', auth.authenticate, controller.me);
  router.post('/verify-email', limiter(10, 60 * 60 * 1000), validateRequest(tokenRequest), controller.verify);
  router.post('/verification/resend', limiter(3, 60 * 60 * 1000), validateRequest(emailRequest), controller.resend);
  router.post('/password/forgot', limiter(3, 60 * 60 * 1000), validateRequest(emailRequest), controller.forgot);
  router.post('/password/reset', limiter(5, 60 * 60 * 1000), validateRequest(resetPasswordRequest), controller.reset);
  return router;
}

