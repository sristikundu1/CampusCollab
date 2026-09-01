import { randomUUID } from "node:crypto";

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;

export function requestContext(request, response, next) {
  const supplied = request.get("x-request-id");
  request.id =
    supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
  response.setHeader("X-Request-Id", request.id);
  next();
}
