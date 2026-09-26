export function createMessagingController({ messagingService }) {
  const send = (response, request, data, status = 200, meta = {}) =>
    response
      .status(status)
      .json({ data, meta: { requestId: request.id, ...meta } });

  return {
    resolve: async (request, response) =>
      send(
        response,
        request,
        {
          conversation: await messagingService.resolve(
            request.auth.user._id,
            request.validated.body,
          ),
        },
        201,
      ),
    list: async (request, response) =>
      send(response, request, {
        conversations: await messagingService.list(
          request.auth.user._id,
          request.validated.query,
        ),
      }),
    get: async (request, response) =>
      send(response, request, {
        conversation: await messagingService.get(
          request.auth.user._id,
          request.validated.params.conversationId,
        ),
      }),
    messages: async (request, response) => {
      const result = await messagingService.messages(
        request.auth.user._id,
        request.validated.params.conversationId,
        request.validated.query,
      );
      send(response, request, { messages: result.messages }, 200, {
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
      });
    },
    sendMessage: async (request, response) =>
      send(
        response,
        request,
        {
          message: await messagingService.send(
            request.auth.user._id,
            request.validated.params.conversationId,
            request.validated.body,
            { requestId: request.id },
          ),
        },
        201,
      ),
    markRead: async (request, response) =>
      send(response, request, {
        readState: await messagingService.markRead(
          request.auth.user._id,
          request.validated.params.conversationId,
          request.validated.body.messageId,
        ),
      }),
  };
}
