export function createAccountController({ config, accountService }) {
  const cookieOptions = {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
  };
  return {
    requestDeletion: async (request, response) => {
      const deletion = await accountService.requestDeletion(
        request.auth.user._id,
        request.validated.body,
        { requestId: request.id },
      );
      response
        .clearCookie(config.sessionCookieName, cookieOptions)
        .status(202)
        .json({ data: { deletion }, meta: { requestId: request.id } });
    },
    cancelDeletion: async (request, response) =>
      response.json({
        data: {
          recovery: await accountService.cancelDeletion(
            request.validated.body,
            { requestId: request.id },
          ),
        },
        meta: { requestId: request.id },
      }),
  };
}
