const respond = (response, request, data, status = 200) => response.status(status).json({ data, meta: { requestId: request.id } });
const userId = (request) => request.auth.user._id;

export function createProfileController({ profileService }) {
  return {
    own: async (request, response) => respond(response, request, { profile: await profileService.own(userId(request)) }),
    public: async (request, response) => respond(response, request, { profile: await profileService.publicProfile(request.validated.params.userId, request.auth?.user?._id) }),
    create: async (request, response) => respond(response, request, { profile: await profileService.create(userId(request), request.validated.body) }, 201),
    update: async (request, response) => respond(response, request, { profile: await profileService.update(userId(request), request.validated.body) }),
    skills: async (request, response) => respond(response, request, { profile: await profileService.replaceSkills(userId(request), request.validated.body.skills) }),
    availability: async (request, response) => respond(response, request, { profile: await profileService.updateAvailability(userId(request), request.validated.body) }),
    ownPortfolio: async (request, response) => respond(response, request, { items: await profileService.listOwnPortfolio(userId(request), request.validated.query.status) }),
    publicPortfolio: async (request, response) => respond(response, request, { items: await profileService.publicPortfolio(request.validated.params.userId, request.auth?.user?._id) }),
    createPortfolio: async (request, response) => respond(response, request, { item: await profileService.createPortfolio(userId(request), request.validated.body) }, 201),
    getPortfolio: async (request, response) => respond(response, request, { item: await profileService.getPortfolio(request.validated.params.itemId, request.auth?.user?._id) }),
    updatePortfolio: async (request, response) => respond(response, request, { item: await profileService.updatePortfolio(userId(request), request.validated.params.itemId, request.validated.body) }),
    deletePortfolio: async (request, response) => { await profileService.deletePortfolio(userId(request), request.validated.params.itemId); response.status(204).end(); },
  };
}
