import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { RateLimitError } from './errors/application-error.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestContext } from './middleware/request-context.js';
import { createRequestLogger } from './middleware/request-logger.js';
import { rejectDuplicateQueryParameters, rejectUnsafeDocumentKeys } from './middleware/request-safety.js';
import { createV1Router } from './routes/v1.js';
import { createEmailService } from './lib/email/email-service.js';
import { createAuthService } from './modules/auth/auth.service.js';

export function createApp({ config, logger, databaseReadiness, authService: authServiceOverride, emailService: emailServiceOverride }) {
  const app = express();
  const emailService = emailServiceOverride ?? createEmailService(config, logger);
  const authService = authServiceOverride ?? createAuthService({ config, emailService });
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(requestContext);
  app.use(createRequestLogger(logger, config.nodeEnv));
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === config.clientUrl) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Request-Id', 'Idempotency-Key', 'If-Match', 'X-CSRF-Token'],
      exposedHeaders: ['X-Request-Id', 'ETag', 'Retry-After'],
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1_000,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (request) => request.path.startsWith('/health') || request.path === '/ready',
      handler: (_request, _response, next) => next(new RateLimitError()),
    }),
  );
  app.use(express.json({ limit: '100kb', strict: true }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(rejectDuplicateQueryParameters);
  app.use(rejectUnsafeDocumentKeys);

  const health = (request, response) =>
    response.json({ data: { status: 'alive' }, meta: { requestId: request.id } });
  const ready = (request, response) => {
    const state = databaseReadiness();
    response.status(state.ready ? 200 : 503).json({
      data: { status: state.ready ? 'ready' : 'not_ready', dependencies: { mongodb: state.ready ? 'available' : 'unavailable' } },
      meta: { requestId: request.id },
    });
  };

  app.get('/health', health);
  app.get('/ready', ready);
  app.get('/health/live', health);
  app.get('/health/ready', ready);
  app.use('/api/v1', createV1Router({ config, authService }));
  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger, environment: config.nodeEnv }));
  return app;
}
