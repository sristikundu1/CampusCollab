export function createParticipationController({ participationService }) {
  const send = (res, req, data, status = 200, meta = {}) =>
    res.status(status).json({ data, meta: { requestId: req.id, ...meta } });
  const ctx = (req) => ({
    requestId: req.id,
    idempotencyKey: req.idempotencyKey,
  });
  const list = (name, key) => async (req, res) => {
    const r = await participationService[name](
      req.auth.user._id,
      ...(req.validated.params.projectId
        ? [req.validated.params.projectId]
        : []),
      req.validated.query,
    );
    send(res, req, { [key]: r.items }, 200, {
      pagination: { nextCursor: r.nextCursor, hasMore: r.hasMore },
    });
  };
  return {
    submitJoin: async (req, res) =>
      send(
        res,
        req,
        {
          joinRequest: await participationService.submitJoin(
            req.auth.user._id,
            req.validated.params.projectId,
            req.validated.params.openingId,
            req.validated.body,
            ctx(req),
          ),
        },
        201,
      ),
    myJoins: list("myJoins", "joinRequests"),
    projectJoins: list("projectJoins", "joinRequests"),
    getJoin: async (req, res) =>
      send(res, req, {
        joinRequest: await participationService.getJoin(
          req.auth.user._id,
          req.validated.params.requestId,
        ),
      }),
    joinCommand: (action) => async (req, res) =>
      send(res, req, {
        result: await participationService[action](
          req.auth.user._id,
          req.validated.params.requestId,
          req.validated.body,
          ctx(req),
        ),
      }),
    sendInvite: async (req, res) =>
      send(
        res,
        req,
        {
          invitation: await participationService.sendInvite(
            req.auth.user._id,
            req.validated.params.projectId,
            req.validated.params.openingId,
            req.validated.body,
            ctx(req),
          ),
        },
        201,
      ),
    myInvitations: list("myInvitations", "invitations"),
    projectInvitations: list("projectInvitations", "invitations"),
    getInvitation: async (req, res) =>
      send(res, req, {
        invitation: await participationService.getInvitation(
          req.auth.user._id,
          req.validated.params.invitationId,
        ),
      }),
    invitationCommand: (action) => async (req, res) =>
      send(res, req, {
        result: await participationService[action](
          req.auth.user._id,
          req.validated.params.invitationId,
          req.validated.body,
          ctx(req),
        ),
      }),
    members: async (req, res) =>
      send(res, req, {
        members: await participationService.members(
          req.auth.user._id,
          req.validated.params.projectId,
        ),
      }),
    membershipCommand: (action) => async (req, res) =>
      send(res, req, {
        membership: await participationService[action](
          req.auth.user._id,
          req.validated.params.projectId,
          req.validated.params.membershipId,
          req.validated.body,
          ctx(req),
        ),
      }),
    candidates: async (req, res) =>
      send(res, req, {
        candidates: await participationService.candidates(
          req.auth.user._id,
          req.validated.params.projectId,
          req.validated.query,
        ),
      }),
  };
}
