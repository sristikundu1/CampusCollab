export function createFileController({ fileService }) {
  return {
    uploadMessageAttachment: async (request, response) =>
      response.status(201).json({
        data: {
          attachment: await fileService.uploadMessageAttachment(
            request.auth.user._id,
            request.validated.body,
          ),
        },
        meta: { requestId: request.id },
      }),
    content: async (request, response) => {
      const file = await fileService.content(
        request.auth.user._id,
        request.validated.params.attachmentId,
      );
      response
        .set("Content-Type", file.mediaType)
        .set("Content-Disposition", `inline; filename="${file.fileName}"`)
        .set("X-Content-Type-Options", "nosniff")
        .set("Cache-Control", "private, no-store")
        .send(file.content);
    },
    remove: async (request, response) => {
      await fileService.remove(
        request.auth.user._id,
        request.validated.params.attachmentId,
      );
      response.status(204).end();
    },
  };
}
