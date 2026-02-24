import { Request, Response } from "express";
import { User } from "@prisma/client";
import userService from "../users/user.service";
import { HttpStatus } from "../../utils/httpStatus.enum";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
} from "./auth.validator";
import authService from "./auth.service";
import { AuthServiceInterface } from "./interfaces/auth.service.interface";
import { TokenServiceInterface } from "./tokens/token.interface";
import tokenService from "./tokens/token.service";
import { EmailService } from "../../config/email";
import { logger } from "../../config/logger";
import { config } from "../../config";

/**
 * Auth Controller
 */
class AuthController {
  constructor(
    private authService: AuthServiceInterface,
    private tokenService: TokenServiceInterface,
  ) {}

  /**
   * POST /auth/register
   *
   * Registers a new user in the system and creates their account.
   * This endpoint handles the complete user registration process including
   * validation, account creation, and initial setup.
   *
   * Request Body:
   * - firstName: User's first name (string, required)
   * - lastName: User's last name (string, required)
   * - email: User's email address (string, required, must be unique)
   * - password: User's password (string, required, min 6 characters)
   * - phone: User's phone number (string, optional)
   * - roleIds: Array of role IDs to assign (number[], optional)
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const data: RegisterInput = req.body;

    const newUser = await userService.register(data);

    // Send verification email
    try {
      const verificationToken =
        await this.tokenService.generateEmailVerificationToken(newUser.id);
      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}`;

      await EmailService.sendVerificationEmail(
        newUser.email,
        verificationToken,
        verificationUrl,
      );

      logger.info(`[REGISTER] Verification email sent to ${newUser.email}`);
    } catch (error) {
      logger.error(
        `[REGISTER] Failed to send verification email to ${newUser.email}:`,
        error,
      );
      // Don't fail registration if email fails
    }

    res.status(HttpStatus.CREATED).json({
      success: true,
      message:
        "User created successfully. Please check your email to verify your account.",
      data: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        emailVerified: false,
      },
    });
  });

  /**
   * POST /auth/login
   *
   * Authenticates a user and generates a JWT token for session management.
   * This endpoint validates user credentials and creates an authenticated
   * session for accessing protected routes.
   *
   * Request Body:
   * - email: User's email address (string, required)
   * - password: User's password (string, required)
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const data: LoginInput = req.body;

    const user = await this.authService.login(data);

    const token = await this.tokenService.generateAuthToken(
      user.id,
      user.restaurantId,
    );

    // Set httpOnly cookies for secure token storage
    // Using sameSite: "lax" to allow cookies on subdomains of the same domain
    // Maximum security: api.plaet.cloud (backend) + plaet.cloud (frontend)
    res.cookie("accessToken", token.access.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Allows cookies on subdomains of same domain base
      maxAge: (config.jwtAccessExpirationMinutes || 30) * 60 * 1000,
      path: "/",
    });

    res.cookie("refreshToken", token.refresh.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Allows cookies on subdomains of same domain base
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Return user data (tokens are in cookies)
    res.status(HttpStatus.OK).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    });
  });

  /**
   * POST /auth/logout
   *
   * Logs out authenticated user by invalidating all tokens.
   * This endpoint requires authentication and uses user ID from JWT token.
   *
   * Authentication: Required (JWT token)
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (userId) {
      await this.tokenService.logout(userId);
    }

    // Clear httpOnly cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Logged out successfully",
    });
  });

  /**
   * POST /auth/forgot-password
   *
   * Requests a password reset for a user.
   * Sends a password reset email with a secure token.
   *
   * Security: Always returns success to prevent email enumeration
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const data: ForgotPasswordInput = req.body;

    try {
      // Find user by email
      const user = await userService.findByEmail(data.email);

      if (user) {
        // Generate reset token
        const resetToken = await this.tokenService.generatePasswordResetToken(
          user.id,
        );

        // Build reset URL
        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

        // Send email
        await EmailService.sendPasswordResetEmail(
          user.email,
          resetToken,
          resetUrl,
        );

        logger.info(`[PASSWORD_RESET] Email sent to ${user.email}`);
      }

      // Always return success (prevent email enumeration)
      res.status(HttpStatus.OK).json({
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link",
      });
    } catch (error) {
      // Log error but don't expose it to client
      logger.error("[PASSWORD_RESET] Error processing request:", error);

      // Still return success to prevent email enumeration
      res.status(HttpStatus.OK).json({
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link",
      });
    }
  });

  /**
   * POST /auth/reset-password
   *
   * Resets a user's password using a valid reset token.
   * The token is validated and then blacklisted after use.
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const data: ResetPasswordInput = req.body;

    // Verify the reset token
    const { userId, isValid } =
      await this.tokenService.verifyPasswordResetToken(data.token);

    if (!isValid || !userId) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid or expired reset token",
        errorCode: "INVALID_RESET_TOKEN",
      });
      return;
    }

    // Update password
    await userService.updatePassword(userId, data.newPassword);

    // Blacklist the used token
    await this.tokenService.blacklistToken(data.token);

    // Logout user from all sessions (blacklist all tokens)
    await this.tokenService.logout(userId);

    logger.info(
      `[PASSWORD_RESET] Password reset successful for user ${userId}`,
    );

    res.status(HttpStatus.OK).json({
      success: true,
      message:
        "Password reset successful. Please login with your new password.",
    });
  });

  /**
   * POST /auth/verify-email
   *
   * Verifies a user's email address using a verification token.
   * The token is validated and then blacklisted after use.
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const data: VerifyEmailInput = req.body;

    // Verify the token
    const { userId, isValid } =
      await this.tokenService.verifyEmailVerificationToken(data.token);

    if (!isValid || !userId) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid or expired verification token",
        errorCode: "INVALID_VERIFICATION_TOKEN",
      });
      return;
    }

    // Mark email as verified
    await userService.verifyEmail(userId);

    // Blacklist the used token
    await this.tokenService.blacklistToken(data.token);

    logger.info(`[EMAIL_VERIFY] Email verified for user ${userId}`);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  });

  /**
   * POST /auth/resend-verification
   *
   * Resends the email verification link.
   * Security: Always returns success to prevent email enumeration
   */
  resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const data: ResendVerificationInput = req.body;

    try {
      // Find user by email
      const user = await userService.findByEmail(data.email);

      // Use type assertion until Prisma Client is regenerated with new fields
      const userWithVerification = user as User & { emailVerified?: boolean };
      if (userWithVerification && !userWithVerification.emailVerified) {
        // Generate new verification token
        const verificationToken =
          await this.tokenService.generateEmailVerificationToken(user.id);

        // Build verification URL
        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}`;

        // Send email
        await EmailService.sendVerificationEmail(
          user.email,
          verificationToken,
          verificationUrl,
        );

        logger.info(
          `[EMAIL_VERIFY] Resent verification email to ${user.email}`,
        );
      }

      // Always return success (prevent email enumeration)
      res.status(HttpStatus.OK).json({
        success: true,
        message:
          "If an account exists with this email and is not verified, you will receive a verification link",
      });
    } catch (error) {
      // Log error but don't expose it to client
      logger.error("[EMAIL_VERIFY] Error resending verification:", error);

      // Still return success to prevent email enumeration
      res.status(HttpStatus.OK).json({
        success: true,
        message:
          "If an account exists with this email and is not verified, you will receive a verification link",
      });
    }
  });

  /**
   * POST /auth/refresh-token
   *
   * Refreshes access and refresh tokens using a valid refresh token.
   * Implements token rotation for enhanced security.
   *
   * Security:
   * - Reads refresh token from httpOnly cookie
   * - Validates token type and expiration
   * - Detects token reuse attempts
   * - Rotates refresh token (blacklists old, creates new)
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Refresh token not found",
        errorCode: "REFRESH_TOKEN_MISSING",
      });
      return;
    }

    // Refresh tokens (with rotation)
    const newTokens = await this.tokenService.refreshTokens(refreshToken);

    if (!newTokens) {
      // Clear cookies on failure
      res.clearCookie("accessToken", { httpOnly: true, path: "/" });
      res.clearCookie("refreshToken", { httpOnly: true, path: "/" });

      res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Invalid or expired refresh token",
        errorCode: "INVALID_REFRESH_TOKEN",
      });
      return;
    }

    // Set new httpOnly cookies
    res.cookie("accessToken", newTokens.access.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: (config.jwtAccessExpirationMinutes || 30) * 60 * 1000,
      path: "/",
    });

    res.cookie("refreshToken", newTokens.refresh.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    logger.info("[REFRESH] Tokens refreshed successfully");

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Tokens refreshed successfully",
    });
  });

  /**
   * POST /auth/change-password
   *
   * Changes user's password. Requires current password verification.
   * All existing sessions are invalidated after password change.
   *
   * Security:
   * - Requires authentication
   * - Validates current password
   * - Applies strong password policy
   * - Invalidates all tokens (logout from all sessions)
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const user = await userService.findById(userId);
    const isValidPassword = await this.authService.validatePassword(
      user.email,
      currentPassword,
    );

    if (!isValidPassword) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Current password is incorrect",
        errorCode: "INVALID_CURRENT_PASSWORD",
      });
      return;
    }

    // Update password
    await userService.updatePassword(userId, newPassword);

    // Invalidate all tokens (logout from all sessions)
    await this.tokenService.logout(userId);

    // Clear cookies
    res.clearCookie("accessToken", { httpOnly: true, path: "/" });
    res.clearCookie("refreshToken", { httpOnly: true, path: "/" });

    logger.info(`[CHANGE_PASSWORD] Password changed for user ${userId}`);

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  });
}

export default new AuthController(authService, tokenService);
