export function createProjectController({ projectService }) {
  const send = (res, req, data, status = 200, meta = {}) =>
    res.status(status).json({ data, meta: { requestId: req.id, ...meta } });
  const ctx = (req) => ({
    requestId: req.id,
    idempotencyKey: req.idempotencyKey,
  });
  return {
    create: async (req, res) =>
      send(
        res,
        req,
        {
          project: await projectService.create(
            req.auth.user._id,
            req.validated.body,
            ctx(req),
          ),
        },
        201,
      ),
    list: async (req, res) => {
      const r = await projectService.list(
        req.validated.query,
        req.auth?.user?._id,
      );
      send(res, req, { projects: r.projects }, 200, {
        pagination: { nextCursor: r.nextCursor, hasMore: r.hasMore },
      });
    },
    mine: async (req, res) => {
      const r = await projectService.mine(
        req.auth.user._id,
        req.validated.query,
      );
      send(res, req, { projects: r.projects }, 200, {
        pagination: { nextCursor: r.nextCursor, hasMore: r.hasMore },
      });
    },
    get: async (req, res) =>
      send(res, req, {
        project: await projectService.get(
          req.validated.params.projectId,
          req.auth?.user?._id,
        ),
      }),
    update: async (req, res) =>
      send(res, req, {
        project: await projectService.update(
          req.auth.user._id,
          req.validated.params.projectId,
          req.validated.body,
          ctx(req),
        ),
      }),
    publish: async (req, res) =>
      send(res, req, {
        project: await projectService.publish(
          req.auth.user._id,
          req.validated.params.projectId,
          ctx(req),
        ),
      }),
    transition: async (req, res) =>
      send(res, req, {
        project: await projectService.transition(
          req.auth.user._id,
          req.validated.params.projectId,
          req.validated.body,
          ctx(req),
        ),
      }),
    recruitment: async (req, res) =>
      send(res, req, {
        project: await projectService.recruitment(
          req.auth.user._id,
          req.validated.params.projectId,
          req.validated.body,
          ctx(req),
        ),
      }),
    addOpening: async (req, res) =>
      send(
        res,
        req,
        {
          opening: await projectService.addOpening(
            req.auth.user._id,
            req.validated.params.projectId,
            req.validated.body,
            ctx(req),
          ),
        },
        201,
      ),
    updateOpening: async (req, res) =>
      send(res, req, {
        opening: await projectService.updateOpening(
          req.auth.user._id,
          req.validated.params.projectId,
          req.validated.params.openingId,
          req.validated.body,
          ctx(req),
        ),
      }),
    openingState: (action) => async (req, res) =>
      send(res, req, {
        opening: await projectService[action](
          req.auth.user._id,
          req.validated.params.projectId,
          req.validated.params.openingId,
          ctx(req),
        ),
      }),
  };
}
