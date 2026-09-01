export function createSkillController({ skillService }) {
  return {
    list: async (request, response) =>
      response.json({
        data: { skills: await skillService.list(request.validated.query) },
        meta: { requestId: request.id },
      }),
    create: async (request, response) => {
      const result = await skillService.create(
        request.auth.user._id,
        request.validated.body,
      );
      response.status(result.created ? 201 : 200).json({
        data: { skill: result.skill },
        meta: { requestId: request.id, created: result.created },
      });
    },
  };
}
