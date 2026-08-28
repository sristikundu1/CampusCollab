export function createSkillController({ skillService }) {
  return {
    list: async (request, response) => response.json({ data: { skills: await skillService.list(request.validated.query) }, meta: { requestId: request.id } }),
  };
}
