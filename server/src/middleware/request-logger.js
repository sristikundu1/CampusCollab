export function createRequestLogger(logger, environment) {
  return function requestLogger(request, response, next) {
    const startedAt = process.hrtime.bigint();
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info(
        {
          requestId: request.id,
          method: request.method,
          path: request.route?.path ?? request.path,
          status: response.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
          environment,
        },
        'HTTP request completed',
      );
    });
    next();
  };
}

