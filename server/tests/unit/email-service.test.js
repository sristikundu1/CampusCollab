import assert from "node:assert/strict";
import test from "node:test";
import { createEmailService } from "../../src/lib/email/email-service.js";

const logger = {
  errors: [],
  error(context, message) {
    this.errors.push({ context, message });
  },
};

test("Brevo receives the verification message without exposing its API key", async () => {
  const messages = [];
  const keys = [];
  const service = createEmailService(
    {
      clientUrl: "http://localhost:5173",
      brevo: {
        apiKey: "xkeysib-private",
        from: "verify@example.com",
        fromName: "CampusCollab",
      },
    },
    logger,
    (apiKey) => {
      keys.push(apiKey);
      return {
        transactionalEmails: {
          sendTransacEmail: async (message) => {
            messages.push(message);
            return { messageId: "email-id" };
          },
        },
      };
    },
  );

  await service.sendVerification("student@university.edu", "004200", 10);

  assert.equal(service.configured, true);
  assert.deepEqual(keys, ["xkeysib-private"]);
  assert.deepEqual(messages[0].sender, {
    email: "verify@example.com",
    name: "CampusCollab",
  });
  assert.deepEqual(messages[0].to, [{ email: "student@university.edu" }]);
  assert.match(messages[0].textContent, /004200/);
  assert.equal(JSON.stringify(messages[0]).includes("xkeysib-private"), false);
});

test("Brevo API errors become safe dependency errors", async () => {
  logger.errors.length = 0;
  const service = createEmailService(
    {
      brevo: {
        apiKey: "xkeysib-private",
        from: "verify@example.com",
        fromName: "CampusCollab",
      },
    },
    logger,
    () => ({
      transactionalEmails: {
        sendTransacEmail: async () => {
          const error = new Error("Provider detail");
          error.name = "BrevoError";
          throw error;
        },
      },
    }),
  );

  await assert.rejects(
    service.sendVerification("student@university.edu", "123456", 10),
    (error) => error.code === "EMAIL_DELIVERY_FAILED" && error.status === 503,
  );
  assert.equal(logger.errors.length, 1);
  assert.equal(logger.errors[0].context.errorType, "BrevoError");
});

test("missing Brevo configuration fails closed", async () => {
  const service = createEmailService({ brevo: null }, logger);

  assert.equal(service.configured, false);
  await assert.rejects(
    service.sendVerification("student@university.edu", "123456", 10),
    (error) => error.code === "EMAIL_NOT_CONFIGURED" && error.status === 503,
  );
});
