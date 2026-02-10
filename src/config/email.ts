import nodemailer from "nodemailer";
import { logger } from "./logger";

/**
 * Email Service Configuration
 *
 * For production, configure with actual SMTP credentials:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 *
 * For development, emails are logged to console.
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
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
    const subject = "Password Reset Request";
    const html = `
      <h1>Password Reset</h1>
      <p>You requested a password reset for your account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>Or copy and paste this URL:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const text = `
      Password Reset

      You requested a password reset for your account.

      Reset your password by clicking this link:
      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request this, please ignore this email.
    `;

    if (process.env.NODE_ENV === "development") {
      logger.info("[EMAIL] Password reset email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Reset URL: ${resetUrl}`);
      logger.info(`Token: ${resetToken}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@example.com",
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
    const subject = "Verify Your Email Address";
    const html = `
      <h1>Email Verification</h1>
      <p>Thank you for registering! Please verify your email address.</p>
      <p>Click the link below to verify your email:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>Or copy and paste this URL:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
    `;

    const text = `
      Email Verification

      Thank you for registering! Please verify your email address.

      Verify your email by clicking this link:
      ${verificationUrl}

      This link will expire in 24 hours.
    `;

    if (process.env.NODE_ENV === "development") {
      logger.info("[EMAIL] Verification email (development mode):");
      logger.info(`To: ${to}`);
      logger.info(`Verification URL: ${verificationUrl}`);
      logger.info(`Token: ${verificationToken}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@example.com",
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
