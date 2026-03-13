import { Resend } from "resend";
import { logger } from "./logger";
import { config } from "./index";

/**
 * Email Service Configuration
 * Uses centralized config from src/config/index.ts
 */

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

if (resend) {
  logger.info("[EMAIL] Initialized Resend via API");
} else {
  logger.warn("[EMAIL] No Resend API Key configured - emails will be disabled");
}

/**
 * Internal helper to send email utilizing Resend
 */
async function sendMailHandler(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    if (config.nodeEnv === "development") {
      return; // Handled in individual methods
    }
    throw new Error("Resend API key is missing. Cannot send email.");
  }

  const { error } = await resend.emails.send({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    throw new Error(`Resend Error: ${error.message}`);
  }
}

/**
 * Email service for sending transactional emails
 */
export class EmailService {
  /**
   * Send password reset email
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
      Recuperar Contraseña\n\nHas solicitado restablecer la contraseña de tu cuenta en Plaet.\n\nRestablece tu contraseña haciendo clic en este enlace:\n${resetUrl}\n\nSi no solicitaste este cambio, puedes ignorar este correo.\nEste enlace expirará en 1 hora.
    `;

    if (config.nodeEnv === "development" && !config.resendApiKey) {
      logger.info("[EMAIL] Password reset email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Reset URL: ${resetUrl}`);
      return;
    }

    try {
      const from = config.fromEmail || "no-reply@plaet.cloud";
      await sendMailHandler({ from, to, subject, html, text });
      logger.info(`[EMAIL] Password reset email sent to ${to}`);
    } catch (error) {
      logger.error("[EMAIL] Failed to send password reset email:", error);
      throw error;
    }
  }

  /**
   * Send email verification email
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
      Verifica tu Correo Electrónico\n\n¡Gracias por registrarte en Plaet! Por favor verifica tu correo electrónico haciendo clic en este enlace:\n${verificationUrl}\n\nEste enlace expirará en 24 horas.
    `;

    if (config.nodeEnv === "development" && !config.resendApiKey) {
      logger.info("[EMAIL] Verification email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Verification URL: ${verificationUrl}`);
      return;
    }

    try {
      const from = config.fromEmail || "no-reply@plaet.cloud";
      await sendMailHandler({ from, to, subject, html, text });
      logger.info(`[EMAIL] Verification email sent to ${to}`);
    } catch (error) {
      logger.error("[EMAIL] Failed to send verification email:", error);
      throw error;
    }
  }

  /**
   * Send welcome invitation email to a new restaurant admin
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
      Bienvenido a Plaet\n\nHola ${data.name}, se ha creado una cuenta administrativa para ${data.restaurantName}.\n\nTus credenciales de acceso son:\nEmail: ${to}\nContraseña Temporal: ${data.tempPassword}\n\nAccede aquí: ${loginUrl}\n\nPor seguridad, te recomendamos cambiar esta contraseña inmediatamente después de tu primer inicio de sesión.
    `;

    if (config.nodeEnv === "development" && !config.resendApiKey) {
      logger.info("[EMAIL] Restaurant Invitation email (development mode):");
      logger.info(`To: ${to}, Temp Pass: ${data.tempPassword}`);
      return;
    }

    try {
      const from = config.fromEmail || "no-reply@plaet.cloud";
      await sendMailHandler({ from, to, subject, html, text });
      logger.info(`[EMAIL] Invitation email sent successfully to ${to}`);
    } catch (error) {
      logger.error(`[EMAIL] Failed to send invitation email to ${to}:`, error);
      if (error instanceof Error) {
        logger.error(`[EMAIL] Resend Error Message: ${error.message}`);
      }
    }
  }
}
