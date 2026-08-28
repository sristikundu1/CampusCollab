import { hashOpaqueToken } from '../../lib/crypto/opaque-token.js';

export function createAuthController({ config, authService }) {
  const cookieOptions = { httpOnly: true, secure: config.isProduction, sameSite: 'lax', path: '/' };
  const respond = (response, request, data, status = 200) => response.status(status).json({ data, meta: { requestId: request.id } });
  return {
    register: async (request, response) => respond(response, request, await authService.register(request.validated.body), 201),
    resend: async (request, response) => respond(response, request, await authService.resendVerification(request.validated.body.email), 202),
    verify: async (request, response) => respond(response, request, await authService.verifyEmail(request.validated.body.token)),
    login: async (request, response) => {
      const result = await authService.login(request.validated.body);
      response.cookie(config.sessionCookieName, result.rawToken, { ...cookieOptions, expires: result.expiresAt });
      respond(response, request, { user: result.user, csrfToken: hashOpaqueToken(result.rawToken, config.csrfSecret) });
    },
    me: async (request, response) => respond(response, request, { user: await authService.currentUser(request.auth.user._id), csrfToken: hashOpaqueToken(request.rawSessionToken, config.csrfSecret) }),
    logout: async (request, response) => {
      await authService.logout(request.auth.session._id);
      response.clearCookie(config.sessionCookieName, cookieOptions).status(204).end();
    },
    forgot: async (request, response) => respond(response, request, await authService.forgotPassword(request.validated.body.email), 202),
    reset: async (request, response) => respond(response, request, await authService.resetPassword(request.validated.body)),
  };
}

