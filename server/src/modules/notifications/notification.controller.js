export function createNotificationController({ notificationService }) {
  const send = (response, request, data, meta = {}) =>
    response.json({ data, meta: { requestId: request.id, ...meta } });

  return {
    list: async (request, response) => {
      const result = await notificationService.list(
        request.auth.user._id,
        request.validated.query,
      );
      send(
        response,
        request,
        { notifications: result.notifications },
        {
          pagination: {
            nextCursor: result.nextCursor,
            hasMore: result.hasMore,
          },
        },
      );
    },
    unreadCount: async (request, response) =>
      send(response, request, {
        unreadCount: await notificationService.unreadCount(
          request.auth.user._id,
        ),
      }),
    markRead: async (request, response) =>
      send(response, request, {
        notification: await notificationService.markRead(
          request.auth.user._id,
          request.validated.params.notificationId,
        ),
      }),
    markAllRead: async (request, response) =>
      send(response, request, {
        readState: await notificationService.markAllRead(request.auth.user._id),
      }),
  };
}
