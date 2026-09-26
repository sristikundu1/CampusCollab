import assert from "node:assert/strict";
import test from "node:test";
import { createEmailService } from "../../src/lib/email/email-service.js";

const logger = {
  errors: [],
  error(context, message) {
    this.errors.push({ context, message });
  },
};

test("Resend receives the verification message without exposing its API key", async () => {
  const messages = [];
  const keys = [];
  const service = createEmailService(
    {
      clientUrl: "http://localhost:5173",
      resend: { apiKey: "re_private", from: "verify@example.com" },
    },
    logger,
    (apiKey) => {
      keys.push(apiKey);
      return {
        emails: {
          send: async (message) => {
            messages.push(message);
            return { data: { id: "email-id" }, error: null };
          },
        },
      };
    },
  );

  await service.sendVerification("student@university.edu", "004200", 10);

  assert.equal(service.configured, true);
  assert.deepEqual(keys, ["re_private"]);
  assert.equal(messages[0].from, "verify@example.com");
  assert.equal(messages[0].to, "student@university.edu");
  assert.match(messages[0].text, /004200/);
  assert.equal(JSON.stringify(messages[0]).includes("re_private"), false);
});

test("Resend API errors become safe dependency errors", async () => {
  logger.errors.length = 0;
  const service = createEmailService(
    {
      resend: { apiKey: "re_private", from: "verify@example.com" },
    },
    logger,
    () => ({
      emails: {
        send: async () => ({
          data: null,
          error: { name: "validation_error", message: "Provider detail" },
        }),
      },
    }),
  );

  await assert.rejects(
    service.sendVerification("student@university.edu", "123456", 10),
    (error) => error.code === "EMAIL_DELIVERY_FAILED" && error.status === 503,
  );
  assert.equal(logger.errors.length, 1);
  assert.equal(logger.errors[0].context.errorType, "validation_error");
});

test("missing Resend configuration fails closed", async () => {
  const service = createEmailService({ resend: null }, logger);

  assert.equal(service.configured, false);
  await assert.rejects(
    service.sendVerification("student@university.edu", "123456", 10),
    (error) => error.code === "EMAIL_NOT_CONFIGURED" && error.status === 503,
  );
});
