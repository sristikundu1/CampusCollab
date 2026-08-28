import { AuthenticationError, AuthorizationError } from '../../errors/application-error.js';
import { opaqueTokenMatches } from '../../lib/crypto/opaque-token.js';

function readCookie(header, name) {
  for (const part of String(header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function createAuthenticationMiddleware({ config, authService }) {
  async function authenticate(request, _response, next) {
    try {
      request.rawSessionToken = readCookie(request.headers.cookie, config.sessionCookieName);
      const principal = await authService.authenticate(request.rawSessionToken);
      request.auth = principal;
      next();
    } catch (error) { next(error); }
  }
  function requireCsrf(request, _response, next) {
    if (!config.csrfSecret) return next(new AuthenticationError('CSRF_NOT_CONFIGURED', 'Request security is not configured.'));
    const supplied = request.get('x-csrf-token');
    if (!supplied || !opaqueTokenMatches(request.rawSessionToken, supplied, config.csrfSecret)) return next(new AuthorizationError('CSRF_VALIDATION_FAILED', 'Request security validation failed.'));
    return next();
  }
  return { authenticate, requireCsrf };
}

