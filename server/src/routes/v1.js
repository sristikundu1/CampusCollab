import { Router } from "express";
import { createAuthRouter } from "../modules/auth/auth.routes.js";
import { createProfileRouter } from "../modules/profiles/profile.routes.js";
import { createSkillRouter } from "../modules/skills/skill.routes.js";
import { createGigRouter } from "../modules/gigs/gig.routes.js";
import { createProposalRouter } from "../modules/proposals/proposal.routes.js";
import { createProjectRouter } from "../modules/projects/project.routes.js";
import { createParticipationRouter } from "../modules/participation/participation.routes.js";
import { createMessagingRouter } from "../modules/messaging/messaging.routes.js";
import { createNotificationRouter } from "../modules/notifications/notification.routes.js";
import { createCompletionRouter } from "../modules/completion/completion.routes.js";
import { createModerationRouter } from "../modules/moderation/moderation.routes.js";
import { createAccountRouter } from "../modules/users/account.routes.js";
import { createFileRouter } from "../modules/files/file.routes.js";
import { createAdminRouter } from "../modules/admin/admin.routes.js";

export function createV1Router(dependencies) {
  const router = Router();
  router.get("/", (request, response) => {
    response.json({
      data: { name: "CampusCollab API", version: "v1" },
      meta: { requestId: request.id },
    });
  });
  router.use("/auth", createAuthRouter(dependencies));
  router.use(createProfileRouter(dependencies));
  router.use("/skills", createSkillRouter(dependencies));
  router.use(createGigRouter(dependencies));
  router.use(createProposalRouter(dependencies));
  router.use(createProjectRouter(dependencies));
  router.use(createParticipationRouter(dependencies));
  router.use(createMessagingRouter(dependencies));
  router.use(createNotificationRouter(dependencies));
  router.use(createCompletionRouter(dependencies));
  router.use(createModerationRouter(dependencies));
  router.use(createAccountRouter(dependencies));
  router.use(createFileRouter(dependencies));
  router.use(createAdminRouter(dependencies));
  return router;
}
