import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { RateLimitError } from "./errors/application-error.js";
import { createErrorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requestContext } from "./middleware/request-context.js";
import { createRequestLogger } from "./middleware/request-logger.js";
import {
  rejectDuplicateQueryParameters,
  rejectUnsafeDocumentKeys,
} from "./middleware/request-safety.js";
import { createV1Router } from "./routes/v1.js";
import { createEmailService } from "./lib/email/email-service.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createProfileService } from "./modules/profiles/profile.service.js";
import { createSkillService } from "./modules/skills/skill.service.js";
import { createGigService } from "./modules/gigs/gig.service.js";
import { createProposalService } from "./modules/proposals/proposal.service.js";
import { createProjectService } from "./modules/projects/project.service.js";
import { createParticipationService } from "./modules/participation/participation.service.js";
import { createMessagingService } from "./modules/messaging/messaging.service.js";
import { createNotificationService } from "./modules/notifications/notification.service.js";
import { createNotificationWriter } from "./modules/notifications/notification.writer.js";
import { createCompletionService } from "./modules/completion/completion.service.js";
import { createModerationService } from "./modules/moderation/moderation.service.js";
import { createAccountService } from "./modules/users/account.service.js";
import { createFileService } from "./modules/files/file.service.js";
import { createAdminService } from "./modules/admin/admin.service.js";

export function createApp({
  config,
  logger,
  databaseReadiness,
  authService: authServiceOverride,
  emailService: emailServiceOverride,
  profileService: profileServiceOverride,
  skillService: skillServiceOverride,
  gigService: gigServiceOverride,
  proposalService: proposalServiceOverride,
  projectService: projectServiceOverride,
  participationService: participationServiceOverride,
  messagingService: messagingServiceOverride,
  notificationService: notificationServiceOverride,
  completionService: completionServiceOverride,
  moderationService: moderationServiceOverride,
  accountService: accountServiceOverride,
  fileService: fileServiceOverride,
  adminService: adminServiceOverride,
}) {
  const app = express();
  const emailService =
    emailServiceOverride ?? createEmailService(config, logger);
  const authService =
    authServiceOverride ?? createAuthService({ config, emailService });
  const profileService = profileServiceOverride ?? createProfileService();
  const skillService = skillServiceOverride ?? createSkillService();
  const gigService = gigServiceOverride ?? createGigService({ config });
  const notificationWriter = createNotificationWriter();
  const proposalService =
    proposalServiceOverride ??
    createProposalService({ config, notificationWriter });
  const projectService =
    projectServiceOverride ?? createProjectService({ config });
  const participationService =
    participationServiceOverride ??
    createParticipationService({ config, notificationWriter });
  const fileService = fileServiceOverride ?? createFileService();
  const messagingService =
    messagingServiceOverride ??
    createMessagingService({ config, notificationWriter, fileService });
  const notificationService =
    notificationServiceOverride ?? createNotificationService({ config });
  const completionService =
    completionServiceOverride ??
    createCompletionService({ notificationWriter });
  const moderationService =
    moderationServiceOverride ??
    createModerationService({ notificationWriter });
  const accountService = accountServiceOverride ?? createAccountService();
  const adminService = adminServiceOverride ?? createAdminService();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
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
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "X-Request-Id",
        "Idempotency-Key",
        "If-Match",
        "X-CSRF-Token",
      ],
      exposedHeaders: ["X-Request-Id", "ETag", "Retry-After"],
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1_000,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (request) =>
        request.path.startsWith("/health") || request.path === "/ready",
      handler: (_request, _response, next) => next(new RateLimitError()),
    }),
  );
  // Profile photos are client-compressed before upload and remain tightly
  // validated. Keep the global limit small enough to reject general abuse.
  app.use(express.json({ limit: "128kb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));
  app.use(rejectDuplicateQueryParameters);
  app.use(rejectUnsafeDocumentKeys);

  const health = (request, response) =>
    response.json({
      data: { status: "alive" },
      meta: { requestId: request.id },
    });
  app.get("/", (request, response) =>
    response.json({
      data: {
        name: "CampusCollab API",
        status: "alive",
        api: "/api/v1",
        health: "/health",
        readiness: "/ready",
      },
      meta: { requestId: request.id },
    }),
  );
  const ready = (request, response) => {
    const state = databaseReadiness();
    response.status(state.ready ? 200 : 503).json({
      data: {
        status: state.ready ? "ready" : "not_ready",
        dependencies: { mongodb: state.ready ? "available" : "unavailable" },
      },
      meta: { requestId: request.id },
    });
  };

  app.get("/health", health);
  app.get("/ready", ready);
  app.get("/health/live", health);
  app.get("/health/ready", ready);
  app.use(
    "/api/v1",
    createV1Router({
      config,
      authService,
      profileService,
      skillService,
      gigService,
      proposalService,
      projectService,
      participationService,
      messagingService,
      notificationService,
      completionService,
      moderationService,
      accountService,
      fileService,
      adminService,
    }),
  );
  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger, environment: config.nodeEnv }));
  return app;
}
