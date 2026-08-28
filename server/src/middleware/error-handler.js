import { ApplicationError } from '../errors/application-error.js';

export function createErrorHandler({ logger, environment }) {
  return (error, request, response, next) => {
    if (response.headersSent) return next(error);
    let normalized = error;
    if (error?.type === 'entity.too.large') {
      normalized = new ApplicationError({ code: 'PAYLOAD_TOO_LARGE', message: 'The request payload is too large.', status: 413 });
    } else if (error?.type === 'entity.parse.failed') {
      normalized = new ApplicationError({ code: 'MALFORMED_JSON', message: 'The request body is not valid JSON.', status: 400 });
    }
    const known = normalized instanceof ApplicationError;
    const status = known ? normalized.status : 500;
    const code = known && normalized.expose ? normalized.code : 'INTERNAL_ERROR';
    const message = known && normalized.expose ? normalized.message : 'An unexpected error occurred.';
    const details = known && normalized.expose ? normalized.details : [];

    logger[status >= 500 ? 'error' : 'warn'](
      { requestId: request.id, errorCode: code, status, err: normalized },
      status >= 500 ? 'Request failed unexpectedly' : 'Request rejected',
    );

    response.status(status).json({
      error: {
        code,
        message,
        ...(details.length ? { details } : {}),
        requestId: request.id,
      },
      ...(environment === 'development' && known ? {} : {}),
    });
  };
}
