import { Router } from 'express';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { createProfileRouter } from '../modules/profiles/profile.routes.js';
import { createSkillRouter } from '../modules/skills/skill.routes.js';
import { createGigRouter } from '../modules/gigs/gig.routes.js';
import { createProposalRouter } from '../modules/proposals/proposal.routes.js';
import { createProjectRouter } from '../modules/projects/project.routes.js';
import { createParticipationRouter } from '../modules/participation/participation.routes.js';

export function createV1Router(dependencies) {
  const router = Router();
  router.get('/', (request, response) => {
    response.json({ data: { name: 'CampusCollab API', version: 'v1' }, meta: { requestId: request.id } });
  });
  router.use('/auth', createAuthRouter(dependencies));
  router.use(createProfileRouter(dependencies));
  router.use('/skills', createSkillRouter(dependencies));
  router.use(createGigRouter(dependencies));
  router.use(createProposalRouter(dependencies));
  router.use(createProjectRouter(dependencies));
  router.use(createParticipationRouter(dependencies));
  return router;
}
