import { Router } from "express";
import { validateRequest } from "../../middleware/validate.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createGigController } from "./gig.controller.js";
import {
  bookmarkListRequest,
  createGigRequest,
  gigRequest,
  listGigsRequest,
  listMineRequest,
  transitionGigRequest,
  updateGigRequest,
} from "./gig.validation.js";

export function createGigRouter(dependencies) {
  const router = Router();
  const auth = createAuthenticationMiddleware(dependencies);
  const controller = createGigController(dependencies);
  router.post(
    "/gigs",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(createGigRequest),
    controller.create,
  );
  router.get(
    "/gigs",
    auth.optionalAuthenticate,
    validateRequest(listGigsRequest),
    controller.list,
  );
  router.get(
    "/gigs/mine",
    auth.authenticate,
    validateRequest(listMineRequest),
    controller.mine,
  );
  router.get(
    "/users/me/bookmarked-gigs",
    auth.authenticate,
    validateRequest(bookmarkListRequest),
    controller.bookmarks,
  );
  router.get(
    "/gigs/:gigId",
    auth.authenticate,
    validateRequest(gigRequest),
    controller.get,
  );
  router.patch(
    "/gigs/:gigId",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(updateGigRequest),
    controller.update,
  );
  router.delete(
    "/gigs/:gigId",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(gigRequest),
    controller.remove,
  );
  for (const action of [
    "publish",
    "close",
    "archive",
    "restore",
    "start",
    "cancel",
  ])
    router.post(
      `/gigs/:gigId\\:${action}`,
      auth.authenticate,
      auth.requireCsrf,
      validateRequest(transitionGigRequest),
      controller.transition(action),
    );
  router.post(
    "/gigs/:gigId/bookmark",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(gigRequest),
    controller.bookmark,
  );
  router.delete(
    "/gigs/:gigId/bookmark",
    auth.authenticate,
    auth.requireCsrf,
    validateRequest(gigRequest),
    controller.removeBookmark,
  );
  return router;
}
