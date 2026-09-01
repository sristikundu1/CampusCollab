import pino from "pino";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.tokenHash",
  "*.sessionSecret",
  "*.csrfSecret",
  "*.mongodbUri",
  "*.body",
  "*.messageBody",
];

export function createLogger({
  level = "info",
  environment = "development",
} = {}) {
  return pino({
    level,
    base: { service: "campuscollab-api", environment },
    redact: { paths: redactPaths, censor: "[REDACTED]" },
    serializers: {
      err(error) {
        return {
          type: error?.name,
          message: error?.message,
          stack: environment === "development" ? error?.stack : undefined,
        };
      },
    },
  });
}
