import { Router } from 'express';
import { createAuthenticationMiddleware } from '../auth/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.js';
import { createProfileController } from './profile.controller.js';
import { availabilityRequest, createPortfolioRequest, createProfileRequest, ownProfileRequest, portfolioItemRequest, portfolioListRequest, publicPortfolioListRequest, publicProfileRequest, replaceSkillsRequest, updatePortfolioRequest, updateProfileRequest } from './profile.validation.js';

export function createProfileRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createProfileController(dependencies);
  router.get('/profiles/me', auth.authenticate, validateRequest(ownProfileRequest), controller.own);
  router.post('/profiles/me', auth.authenticate, auth.requireCsrf, validateRequest(createProfileRequest), controller.create);
  router.patch('/profiles/me', auth.authenticate, auth.requireCsrf, validateRequest(updateProfileRequest), controller.update);
  router.put('/profiles/me/skills', auth.authenticate, auth.requireCsrf, validateRequest(replaceSkillsRequest), controller.skills);
  router.patch('/profiles/me/availability', auth.authenticate, auth.requireCsrf, validateRequest(availabilityRequest), controller.availability);
  router.get('/profiles/me/portfolio-items', auth.authenticate, validateRequest(portfolioListRequest), controller.ownPortfolio);
  router.post('/profiles/me/portfolio-items', auth.authenticate, auth.requireCsrf, validateRequest(createPortfolioRequest), controller.createPortfolio);
  router.get('/profiles/:userId', auth.optionalAuthenticate, validateRequest(publicProfileRequest), controller.public);
  router.get('/profiles/:userId/portfolio-items', auth.optionalAuthenticate, validateRequest(publicPortfolioListRequest), controller.publicPortfolio);
  router.get('/portfolio-items/:itemId', auth.optionalAuthenticate, validateRequest(portfolioItemRequest), controller.getPortfolio);
  router.patch('/portfolio-items/:itemId', auth.authenticate, auth.requireCsrf, validateRequest(updatePortfolioRequest), controller.updatePortfolio);
  router.delete('/portfolio-items/:itemId', auth.authenticate, auth.requireCsrf, validateRequest(portfolioItemRequest), controller.deletePortfolio);
  return router;
}
