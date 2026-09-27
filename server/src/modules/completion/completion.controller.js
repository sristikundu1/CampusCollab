export function createCompletionController({ completionService }) {
  const send = (response, request, data, status = 200) =>
    response.status(status).json({ data, meta: { requestId: request.id } });

  return {
    request: async (request, response) =>
      send(
        response,
        request,
        {
          completion: await completionService.request(
            request.auth.user._id,
            request.validated.body,
            {
              idempotencyKey: request.idempotencyKey,
              requestId: request.id,
            },
          ),
        },
        201,
      ),
    list: async (request, response) =>
      send(response, request, {
        completionRecords: await completionService.list(
          request.auth.user._id,
          request.validated.query,
        ),
      }),
    get: async (request, response) =>
      send(response, request, {
        completionRecord: await completionService.get(
          request.auth.user._id,
          request.validated.params.recordId,
        ),
      }),
    respond: async (request, response) =>
      send(response, request, {
        completionRecord: await completionService.respond(
          request.auth.user._id,
          request.validated.params.recordId,
          request.validated.body,
          { requestId: request.id },
        ),
      }),
  };
}
