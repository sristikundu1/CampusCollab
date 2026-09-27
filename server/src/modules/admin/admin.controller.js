export function createAdminController({ adminService }) {
  const send = (response, request, data, status = 200) =>
    response.status(status).json({ data, meta: { requestId: request.id } });
  return {
    users: async (req, res) =>
      send(res, req, {
        users: await adminService.users(req.auth.user._id, req.validated.query),
      }),
    userCommand: (action) => async (req, res) =>
      send(res, req, {
        user: await adminService[action](
          req.auth.user._id,
          req.validated.params.userId,
          req.validated.body,
          { requestId: req.id },
        ),
      }),
    skills: async (req, res) =>
      send(res, req, {
        skills: await adminService.skills(
          req.auth.user._id,
          req.validated.query,
        ),
      }),
    createSkill: async (req, res) =>
      send(
        res,
        req,
        {
          skill: await adminService.createSkill(
            req.auth.user._id,
            req.validated.body,
            { requestId: req.id },
          ),
        },
        201,
      ),
    updateSkill: async (req, res) =>
      send(res, req, {
        skill: await adminService.updateSkill(
          req.auth.user._id,
          req.validated.params.skillId,
          req.validated.body,
          { requestId: req.id },
        ),
      }),
    universities: async (req, res) =>
      send(res, req, {
        universities: await adminService.universities(
          req.auth.user._id,
          req.validated.query,
        ),
      }),
    createUniversity: async (req, res) =>
      send(
        res,
        req,
        {
          university: await adminService.createUniversity(
            req.auth.user._id,
            req.validated.body,
            { requestId: req.id },
          ),
        },
        201,
      ),
    updateUniversity: async (req, res) =>
      send(res, req, {
        university: await adminService.updateUniversity(
          req.auth.user._id,
          req.validated.params.universityId,
          req.validated.body,
          { requestId: req.id },
        ),
      }),
    createDomain: async (req, res) =>
      send(
        res,
        req,
        {
          domain: await adminService.createDomain(
            req.auth.user._id,
            req.validated.params.universityId,
            req.validated.body,
            { requestId: req.id },
          ),
        },
        201,
      ),
    updateDomain: async (req, res) =>
      send(res, req, {
        domain: await adminService.updateDomain(
          req.auth.user._id,
          req.validated.params.domainId,
          req.validated.body,
          { requestId: req.id },
        ),
      }),
  };
}
