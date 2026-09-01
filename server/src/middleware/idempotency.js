import { RequestValidationError } from "../errors/application-error.js";

export function requireIdempotencyKey(request, _response, next) {
  const value = request.get("idempotency-key")?.trim();
  if (!value || value.length < 8 || value.length > 128) {
    return next(
      new RequestValidationError([
        {
          location: "header",
          path: "Idempotency-Key",
          code: "invalid_idempotency_key",
          message: "Idempotency-Key must contain 8 to 128 characters.",
        },
      ]),
    );
  }
  request.idempotencyKey = value;
  return next();
}
