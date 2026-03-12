import nodemailer from "nodemailer";
import { logger } from "./logger";
import { config } from "./index";

/**
 * Email Service Configuration
 * Uses centralized config from src/config/index.ts
 */

const transporter = nodemailer.createTransport({
  host: config.smtp.host || "smtp.example.com",
  port: config.smtp.port || 587,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user || "",
    pass: config.smtp.pass || "",
  },
});

/**
 * Email service for sending transactional emails
 */
export class EmailService {
  /**
   * Send password reset email
   *
   * @param to - Recipient email address
   * @param resetToken - Password reset token
   * @param resetUrl - Full reset URL
   */
  static async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<void> {
    const subject = "Recuperación de Contraseña - Plaet";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin-bottom: 16px;">Recuperar Contraseña</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">Has solicitado restablecer la contraseña de tu cuenta en Plaet.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #111827; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">Restablecer Contraseña</a>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">Si no solicitaste este cambio, puedes ignorar este correo con seguridad.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Este enlace expirará en 1 hora.</p>
      </div>
    `;

    const text = `
      Recuperar Contraseña

      Has solicitado restablecer la contraseña de tu cuenta en Plaet.

      Restablece tu contraseña haciendo clic en este enlace:
      ${resetUrl}

      Si no solicitaste este cambio, puedes ignorar este correo.
      Este enlace expirará en 1 hora.
    `;

    if (config.nodeEnv === "development" && !config.smtp.user) {
      logger.info("[EMAIL] Password reset email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Reset URL: ${resetUrl}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: config.smtp.from || "Plaet <no-reply@plaet.app>",
        to,
        subject,
        html,
        text,
      });
      logger.info(`[EMAIL] Password reset email sent to ${to}`);
    } catch (error) {
      logger.error("[EMAIL] Failed to send password reset email:", error);
      throw error;
    }
  }

  /**
   * Send email verification email
   *
   * @param to - Recipient email address
   * @param verificationToken - Email verification token
   * @param verificationUrl - Full verification URL
   */
  static async sendVerificationEmail(
    to: string,
    verificationToken: string,
    verificationUrl: string,
  ): Promise<void> {
    const subject = "Verifica tu Correo Electrónico - Plaet";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin-bottom: 16px;">¡Bienvenido a Plaet!</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">Por favor, verifica tu dirección de correo electrónico para activar tu cuenta.</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #111827; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">Verificar Correo</a>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">Si no creaste una cuenta, puedes ignorar este correo.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Este enlace expirará en 24 horas.</p>
      </div>
    `;

    const text = `
      Verifica tu Correo Electrónico

      ¡Gracias por registrarte en Plaet! Por favor verifica tu correo electrónico haciendo clic en este enlace:
      ${verificationUrl}

      Este enlace expirará en 24 horas.
    `;

    if (config.nodeEnv === "development" && !config.smtp.user) {
      logger.info("[EMAIL] Verification email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Verification URL: ${verificationUrl}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: config.smtp.from || "Plaet <no-reply@plaet.app>",
        to,
        subject,
        html,
        text,
      });
      logger.info(`[EMAIL] Verification email sent to ${to}`);
    } catch (error) {
      logger.error("[EMAIL] Failed to send verification email:", error);
      throw error;
    }
  }
}
