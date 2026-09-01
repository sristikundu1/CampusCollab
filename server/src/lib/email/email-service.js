import nodemailer from "nodemailer";
import { DependencyUnavailableError } from "../../errors/application-error.js";

export function createEmailService(config, logger) {
  if (!config.smtp) {
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
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.password },
  });
  async function send({ to, subject, text }) {
    try {
      await transport.sendMail({ from: config.smtp.from, to, subject, text });
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
    sendVerification: (email, token) =>
      send({
        to: email,
        subject: "Verify your CampusCollab university email",
        text: `Verify your account: ${config.clientUrl}/verify-email?token=${encodeURIComponent(token)}`,
      }),
    sendPasswordReset: (email, token) =>
      send({
        to: email,
        subject: "Reset your CampusCollab password",
        text: `Reset your password: ${config.clientUrl}/reset-password?token=${encodeURIComponent(token)}`,
      }),
  };
}
