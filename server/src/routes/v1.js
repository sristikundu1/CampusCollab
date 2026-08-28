import { Router } from 'express';
import { createAuthRouter } from '../modules/auth/auth.routes.js';

export function createV1Router(dependencies) {
  const router = Router();
  router.get('/', (request, response) => {
    response.json({ data: { name: 'CampusCollab API', version: 'v1' }, meta: { requestId: request.id } });
  });
  router.use('/auth', createAuthRouter(dependencies));
  return router;
}
