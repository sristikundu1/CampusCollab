import { Router } from 'express';
import { validateRequest } from '../../middleware/validate.js';
import { createSkillController } from './skill.controller.js';
import { listSkillsRequest } from './skill.validation.js';

export function createSkillRouter(dependencies) {
  const router = Router();
  const controller = createSkillController(dependencies);
  router.get('/', validateRequest(listSkillsRequest), controller.list);
  return router;
}
