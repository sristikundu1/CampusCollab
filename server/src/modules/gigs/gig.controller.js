export function createGigController({ gigService }) {
  const respond = (response, request, data, status = 200, meta = {}) =>
    response
      .status(status)
      .json({ data, meta: { requestId: request.id, ...meta } });
  return {
    create: async (request, response) =>
      respond(
        response,
        request,
        {
          gig: await gigService.create(
            request.auth.user._id,
            request.validated.body,
          ),
        },
        201,
      ),
    list: async (request, response) => {
      const result = await gigService.list(
        request.validated.query,
        request.auth?.user?._id,
      );
      respond(response, request, { gigs: result.gigs }, 200, {
        pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore },
      });
    },
    mine: async (request, response) => {
      const result = await gigService.mine(
        request.auth.user._id,
        request.validated.query,
      );
      respond(response, request, { gigs: result.gigs }, 200, {
        pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore },
      });
    },
    get: async (request, response) =>
      respond(response, request, {
        gig: await gigService.get(
          request.validated.params.gigId,
          request.auth?.user?._id,
        ),
      }),
    update: async (request, response) =>
      respond(response, request, {
        gig: await gigService.update(
          request.auth.user._id,
          request.validated.params.gigId,
          request.validated.body,
        ),
      }),
    transition: (action) => async (request, response) =>
      respond(response, request, {
        gig: await gigService.transition(
          request.auth.user._id,
          request.validated.params.gigId,
          action,
          request.validated.body,
        ),
      }),
    remove: async (request, response) => {
      await gigService.remove(
        request.auth.user._id,
        request.validated.params.gigId,
      );
      response.status(204).end();
    },
    bookmark: async (request, response) => {
      const result = await gigService.addBookmark(
        request.auth.user._id,
        request.validated.params.gigId,
      );
      respond(
        response,
        request,
        { bookmark: result.bookmark },
        result.created ? 201 : 200,
      );
    },
    removeBookmark: async (request, response) => {
      await gigService.removeBookmark(
        request.auth.user._id,
        request.validated.params.gigId,
      );
      response.status(204).end();
    },
    bookmarks: async (request, response) => {
      const result = await gigService.bookmarks(
        request.auth.user._id,
        request.validated.query,
      );
      respond(response, request, { gigs: result.gigs }, 200, {
        pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore },
      });
    },
  };
}
