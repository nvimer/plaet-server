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
 * Common layout for all emails to maintain a consistent, human and modern brand
 */
function getEmailLayout(title: string, content: string): string {
  const currentYear = new Date().getFullYear();
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
      <!-- Header / Logo -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111827; font-size: 32px; font-weight: 900; letter-spacing: -1px; margin: 0;">Plaet<span style="color: #10b981;">.</span></h1>
      </div>
      
      <!-- Main Content Card -->
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 20px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
        <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 24px;">${title}</h2>
        
        <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          ${content}
        </div>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">¿Necesitas ayuda? Responde a este correo y te ayudaremos enseguida.</p>
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">© ${currentYear} Plaet. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
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
    const subject = "Recuperación de tu cuenta en Plaet";

    const content = `
      <p style="margin-bottom: 20px;">Hola,</p>
      <p style="margin-bottom: 24px;">Hemos recibido una solicitud para cambiar la contraseña de tu cuenta en <strong>Plaet</strong>. Si fuiste tú, no hay problema, puedes crear una nueva contraseña usando el botón de abajo.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Crear nueva contraseña</a>
      </div>
      
      <p style="margin-bottom: 12px; font-size: 14px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="margin-bottom: 24px; font-size: 13px; color: #6b7280; word-break: break-all;"><a href="${resetUrl}" style="color: #10b981; text-decoration: none;">${resetUrl}</a></p>
      
      <div style="padding: 16px; background-color: #eff6ff; border-radius: 12px; margin-top: 32px;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>¿No solicitaste este cambio?</strong> Puedes ignorar este correo tranquilamente. Tu contraseña actual seguirá funcionando y tu cuenta está segura.</p>
      </div>
    `;

    const html = getEmailLayout("Recuperar Contraseña", content);

    const text = `Hola,\n\nHemos recibido una solicitud para cambiar tu contraseña en Plaet.\n\nPara crear una nueva, entra al siguiente enlace:\n${resetUrl}\n\nSi no fuiste tú, puedes ignorar este mensaje.\n\nEl equipo de Plaet`;

    if (config.nodeEnv === "development" && !config.resendApiKey) {
      logger.info("[EMAIL] Password reset email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Reset URL: ${resetUrl}`);
      return;
    }

    try {
      const from = config.fromEmail || "Plaet <no-reply@plaet.cloud>";
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
    const subject = "¡Bienvenido a Plaet! Confirma tu correo";

    const content = `
      <p style="margin-bottom: 20px;">¡Hola! Qué gusto tenerte por aquí.</p>
      <p style="margin-bottom: 24px;">Estamos emocionados de que empieces a gestionar tu restaurante con <strong>Plaet</strong>. Para poder utilizar tu cuenta y mantener todo seguro, solo necesitamos confirmar que este correo es tuyo.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Confirmar mi correo</a>
      </div>
      
      <p style="margin-bottom: 12px; font-size: 14px;">Si el botón no funciona, también puedes usar este enlace:</p>
      <p style="margin-bottom: 24px; font-size: 13px; color: #6b7280; word-break: break-all;"><a href="${verificationUrl}" style="color: #10b981; text-decoration: none;">${verificationUrl}</a></p>
      
      <p style="margin-top: 32px; font-size: 15px; color: #374151;">¡Nos vemos adentro!</p>
      <p style="margin-top: 4px; font-size: 15px; font-weight: 600; color: #111827;">El equipo de Plaet</p>
    `;

    const html = getEmailLayout("Confirma tu dirección de correo", content);

    const text = `¡Hola!\n\nGracias por unirte a Plaet. Para activar tu cuenta necesitamos confirmar tu correo.\n\nPor favor entra a este enlace:\n${verificationUrl}\n\n¡Nos vemos adentro!\nEl equipo de Plaet`;

    if (config.nodeEnv === "development" && !config.resendApiKey) {
      logger.info("[EMAIL] Verification email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Verification URL: ${verificationUrl}`);
      return;
    }

    try {
      const from = config.fromEmail || "Plaet <no-reply@plaet.cloud>";
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
    const subject = `Tu cuenta en Plaet para ${data.restaurantName} está lista`;

    const content = `
      <p style="margin-bottom: 20px;">Hola <strong>${data.name}</strong>,</p>
      <p style="margin-bottom: 24px;">Se ha creado una nueva cuenta administrativa en Plaet para el restaurante <strong>${data.restaurantName}</strong>. ¡Ya puedes empezar a gestionar tus órdenes y equipo!</p>
      
      <p style="margin-bottom: 12px; font-size: 15px;">Hemos generado estas credenciales temporales para que puedas acceder:</p>
      
      <div style="background-color: #ffffff; border: 1px dashed #d1d5db; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
        <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px;">Usuario / Email:</p>
        <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; font-weight: 600;">${to}</p>
        
        <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px;">Contraseña temporal:</p>
        <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 18px; color: #111827; font-weight: 700; letter-spacing: 2px; text-align: center;">
          ${data.tempPassword}
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Ir al panel de Plaet</a>
      </div>
      
      <div style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 12px 12px 0; margin-top: 32px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>🔒 Por tu seguridad:</strong> Te recomendamos encarecidamente que cambies esta contraseña temporal por una propia tan pronto inicies sesión por primera vez.</p>
      </div>
    `;

    const html = getEmailLayout("Bienvenido a Plaet", content);

    const text = `Hola ${data.name},\n\nTu cuenta para gestionar ${data.restaurantName} está lista.\n\nTus credenciales de acceso:\nEmail: ${to}\nContraseña temporal: ${data.tempPassword}\n\nIngresa aquí: ${loginUrl}\n\nPor seguridad, recuerda cambiar tu contraseña al iniciar sesión por primera vez.\n\nEl equipo de Plaet`;

    if (config.nodeEnv === "development" && !config.resendApiKey) {
      logger.info("[EMAIL] Restaurant Invitation email (development mode):");
      logger.info(`To: ${to}, Temp Pass: ${data.tempPassword}`);
      return;
    }

    try {
      const from = config.fromEmail || "Plaet <no-reply@plaet.cloud>";
      await sendMailHandler({ from, to, subject, html, text });
      logger.info(`[EMAIL] Invitation email sent successfully to ${to}`);
    } catch (error) {
      logger.error(`[EMAIL] Failed to send invitation email to ${to}:`, error);
      if (error instanceof Error) {
        logger.error(`[EMAIL] Resend Error Message: ${error.message}`);
      }
    }
  }

  /**
   * Send invitation email to a new user created by restaurant admin
   */
  static async sendUserInvitationEmail(
    to: string,
    data: {
      name: string;
      restaurantName: string;
      password: string;
    },
  ): Promise<void> {
    const loginUrl = `${config.clientUrl}/login`;
    const subject = `Tu cuenta en Plaet para ${data.restaurantName} está lista`;

    const content = `
      <p style="margin-bottom: 20px;">Hola <strong>${data.name}</strong>,</p>
      <p style="margin-bottom: 24px;">Se ha creado una nueva cuenta en Plaet para el restaurante <strong>${data.restaurantName}</strong>.</p>
      
      <p style="margin-bottom: 12px; font-size: 15px;">Estas son tus credenciales de acceso:</p>
      
      <div style="background-color: #ffffff; border: 1px dashed #d1d5db; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
        <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px;">Usuario / Email:</p>
        <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; font-weight: 600;">${to}</p>
        
        <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px;">Contraseña:</p>
        <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 18px; color: #111827; font-weight: 700; letter-spacing: 2px; text-align: center;">
          ${data.password}
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Ir al panel de Plaet</a>
      </div>
      
      <div style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 12px 12px 0; margin-top: 32px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>🔒 Por tu seguridad:</strong> Te recomendamos encarecidamente que cambies esta contraseña por una propia tan pronto inicies sesión por primera vez.</p>
      </div>
    `;

    const html = getEmailLayout("Bienvenido a Plaet", content);

    const text = `Hola ${data.name},\n\nTu cuenta para ${data.restaurantName} está lista.\n\nTus credenciales de acceso:\nEmail: ${to}\nContraseña: ${data.password}\n\nIngresa aquí: ${loginUrl}\n\nPor seguridad, recuerda cambiar tu contraseña al iniciar sesión por primera vez.\n\nEl equipo de Plaet`;

    if (config.nodeEnv === "development" && !config.resendApiKey) {
      logger.info("[EMAIL] User Invitation email (development mode):");
      logger.info(`To: ${to}, Password: ${data.password}`);
      return;
    }

    try {
      const from = config.fromEmail || "Plaet <no-reply@plaet.cloud>";
      await sendMailHandler({ from, to, subject, html, text });
      logger.info(`[EMAIL] User invitation email sent successfully to ${to}`);
    } catch (error) {
      logger.error(
        `[EMAIL] Failed to send user invitation email to ${to}:`,
        error,
      );
      if (error instanceof Error) {
        logger.error(`[EMAIL] Resend Error Message: ${error.message}`);
      }
    }
  }
}
