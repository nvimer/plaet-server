import nodemailer from "nodemailer";
import dns from "node:dns";
import type { Options } from "nodemailer/lib/smtp-transport";
import { logger } from "./logger";
import { config } from "./index";

/**
 * Email Service Configuration
 * Uses centralized config from src/config/index.ts
 */

logger.info("[EMAIL] SMTP config from env:", {
  host: config.smtp?.host,
  port: config.smtp?.port,
  user: config.smtp?.user ? "defined" : "undefined",
  secure: config.smtp?.secure,
});

if (!config.smtp?.host) {
  logger.warn("[EMAIL] SMTP host is not configured - emails will be disabled");
}

const smtpPort = Number(config.smtp?.port) || 587;

const smtpOptions: Options = {
  host: config.smtp?.host || "smtp.example.com",
  port: smtpPort,
  secure: smtpPort === 465,
  lookup: (
    hostname: string,
    _options: unknown,
    callback: (
      err: NodeJS.ErrnoException | null,
      address: string,
      family: number,
    ) => void,
  ) => {
    dns.lookup(hostname, { family: 4 }, (err, address, family) => {
      callback(err, address ?? "", family);
    });
  },
  auth: {
    user: config.smtp?.user || "",
    pass: config.smtp?.pass || "",
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
} as Options;

const transporter = nodemailer.createTransport(smtpOptions);

// Verify connection configuration on startup
if (config.smtp?.user && config.smtp?.host) {
  transporter.verify((error) => {
    if (error) {
      logger.error("[EMAIL] SMTP Connection Error:", error);
    } else {
      logger.info("[EMAIL] SMTP Server is ready to take our messages");
    }
  });
}

/**
 * Email service for sending transactional emails
 */
export class EmailService {
  /**
   * Send password reset email
   *
   * @param to - Recipient email address
   * @param resetUrl - Full reset URL
   */
  static async sendPasswordResetEmail(
    to: string,
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

    if (config.nodeEnv === "development" && !config.smtp?.user) {
      logger.info("[EMAIL] Password reset email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Reset URL: ${resetUrl}`);
      return;
    }

    try {
      const from = config.smtp?.from || config.smtp?.user || "no-reply@plaet.app";
      await transporter.sendMail({
        from,
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
   * @param verificationUrl - Full verification URL
   */
  static async sendVerificationEmail(
    to: string,
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

    if (config.nodeEnv === "development" && !config.smtp?.user) {
      logger.info("[EMAIL] Verification email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Verification URL: ${verificationUrl}`);
      return;
    }

    try {
      const from = config.smtp?.from || config.smtp?.user || "no-reply@plaet.app";
      await transporter.sendMail({
        from,
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

  /**
   * Send welcome invitation email to a new restaurant admin
   *
   * @param to - Recipient email
   * @param data - Invitation data (name, restaurantName, tempPassword)
   */
  static async sendRestaurantInvitationEmail(
    to: string,
    data: {
      name: string;
      restaurantName: string;
      tempPassword: string;
    },
  ): Promise<void> {
    const loginUrl = `${config.clientUrl}/login`;
    const subject = `Bienvenido a Plaet - Credenciales para ${data.restaurantName}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin-bottom: 16px;">¡Bienvenido a Plaet!</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          Hola <strong>${data.name}</strong>, se ha creado una cuenta administrativa para <strong>${data.restaurantName}</strong>.
        </p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
          <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">Tus credenciales de acceso son:</p>
          <p style="margin: 0 0 5px 0; font-family: monospace; font-size: 16px;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 0; font-family: monospace; font-size: 16px;"><strong>Contraseña Temporal:</strong> ${data.tempPassword}</p>
        </div>

        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #111827; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">Acceder al Panel</a>
        
        <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin-top: 24px;">Importante:</p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Por seguridad, te recomendamos cambiar esta contraseña inmediatamente después de tu primer inicio de sesión desde tu perfil.</p>
      </div>
    `;

    const text = `
      Bienvenido a Plaet

      Hola ${data.name}, se ha creado una cuenta administrativa para ${data.restaurantName}.

      Tus credenciales de acceso son:
      Email: ${to}
      Contraseña Temporal: ${data.tempPassword}

      Accede aquí: ${loginUrl}

      Por seguridad, te recomendamos cambiar esta contraseña inmediatamente después de tu primer inicio de sesión.
    `;

    if (config.nodeEnv === "development" && !config.smtp?.user) {
      logger.info("[EMAIL] Restaurant Invitation email (development mode):");
      logger.info(`To: ${to}, Temp Pass: ${data.tempPassword}`);
      return;
    }

    try {
      const from = config.smtp?.from || config.smtp?.user || "no-reply@plaet.app";
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
      });
      logger.info(`[EMAIL] Invitation email sent successfully to ${to}`);
    } catch (error) {
      logger.error(`[EMAIL] Failed to send invitation email to ${to}:`, error);
      // Detailed logging for debugging (safe because it only shows error message/stack)
      if (error instanceof Error) {
        logger.error(`[EMAIL] SMTP Error Message: ${error.message}`);
      }
    }
  }
}
