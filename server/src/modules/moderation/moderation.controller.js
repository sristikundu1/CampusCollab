export function createModerationController({ moderationService }) {
  const send = (response, request, data, status = 200) =>
    response.status(status).json({ data, meta: { requestId: request.id } });
  return {
    createReport: async (request, response) =>
      send(
        response,
        request,
        {
          report: await moderationService.createReport(
            request.auth.user._id,
            request.validated.body,
            { requestId: request.id },
          ),
        },
        201,
      ),
    ownReports: async (request, response) =>
      send(response, request, {
        reports: await moderationService.ownReports(
          request.auth.user._id,
          request.validated.query,
        ),
      }),
    ownReport: async (request, response) =>
      send(response, request, {
        report: await moderationService.ownReport(
          request.auth.user._id,
          request.validated.params.reportId,
        ),
      }),
    adminReports: async (request, response) =>
      send(response, request, {
        reports: await moderationService.adminReports(
          request.auth.user._id,
          request.validated.query,
        ),
      }),
    adminReport: async (request, response) =>
      send(response, request, {
        report: await moderationService.adminReport(
          request.auth.user._id,
          request.validated.params.reportId,
          { requestId: request.id },
        ),
      }),
    resolve: async (request, response) =>
      send(response, request, {
        resolution: await moderationService.resolveReport(
          request.auth.user._id,
          request.validated.params.reportId,
          request.validated.body,
          { requestId: request.id },
        ),
      }),
  };
}
