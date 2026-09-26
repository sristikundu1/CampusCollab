import { Resend } from "resend";
import { DependencyUnavailableError } from "../../errors/application-error.js";

export function createEmailService(
  config,
  logger,
  createClient = (apiKey) => new Resend(apiKey),
) {
  if (!config.resend) {
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
  const client = createClient(config.resend.apiKey);
  async function send({ to, subject, text }) {
    try {
      const { error } = await client.emails.send({
        from: config.resend.from,
        to,
        subject,
        text,
      });
      if (error) throw error;
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
