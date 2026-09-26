import { BrevoClient } from "@getbrevo/brevo";
import { DependencyUnavailableError } from "../../errors/application-error.js";

export function createEmailService(
  config,
  logger,
  createClient = (apiKey) => new BrevoClient({ apiKey }),
) {
  if (!config.brevo) {
    return {
      configured: false,
      async sendVerification() {
        throw new DependencyUnavailableError(
          "EMAIL_NOT_CONFIGURED",
          "Email delivery is not configured.",
        );
      },
      async sendPasswordReset() {
        throw new DependencyUnavailableError(
          "EMAIL_NOT_CONFIGURED",
          "Email delivery is not configured.",
        );
      },
    };
  }
  const client = createClient(config.brevo.apiKey);
  async function send({ to, subject, text }) {
    try {
      await client.transactionalEmails.sendTransacEmail({
        sender: {
          email: config.brevo.from,
          name: config.brevo.fromName,
        },
        to: [{ email: to }],
        subject,
        textContent: text,
      });
    } catch (error) {
      logger.error(
        { event: "email.delivery_failed", errorType: error?.name },
        "Email delivery failed",
      );
      throw new DependencyUnavailableError(
        "EMAIL_DELIVERY_FAILED",
        "Email could not be delivered. Try again later.",
      );
    }
  }
  return {
    configured: true,
    sendVerification: (email, code, expiresInMinutes) =>
      send({
        to: email,
        subject: "Verify your CampusCollab university email",
        text: [
          `Your CampusCollab verification code is: ${code}`,
          "",
          `This code expires in ${expiresInMinutes} minutes.`,
          "If you did not create a CampusCollab account, ignore this email.",
        ].join("\n"),
      }),
    sendPasswordReset: (email, token) =>
      send({
        to: email,
        subject: "Reset your CampusCollab password",
        text: `Reset your password: ${config.clientUrl}/reset-password?token=${encodeURIComponent(token)}`,
      }),
  };
}
