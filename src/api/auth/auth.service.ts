import { User } from "@prisma/client";
import { LoginInput } from "./auth.validator";
import { AuthServiceInterface } from "./interfaces/auth.service.interface";
import { UserServiceInterface } from "../users/interfaces/user.service.interface";
import userService from "../users/user.service";
import userRepository from "../users/user.repository";
import hasherUtils from "../../utils/hasher.utils";
import { CustomError } from "../../types/custom-errors";
import { HttpStatus } from "../../utils/httpStatus.enum";

interface _FailedLoginUpdateData {
  failedLoginAttempts: number;
  lastFailedLogin: Date | null;
  lockedUntil?: Date | null;
}

interface _ResetLoginUpdateData {
  failedLoginAttempts: number;
  lastFailedLogin: null;
  lockedUntil: null;
}

type _LoginUpdateData = _FailedLoginUpdateData | _ResetLoginUpdateData;

/**
 * Auth Service
 *
 * Core business logic layer for authentication operations.
 * The service follows the dependency injection pattern and
 * implements the AuthServiceInterface for consistency.
 */
export class AuthService implements AuthServiceInterface {
  constructor(private userService: UserServiceInterface) {}

  /**
   * Authenticates a user by validating their email and password credentials.
   * This method verifies that the email exists in the database and that
   * the provided password matches the stored hashed password.
   */
  async login(data: LoginInput): Promise<User> {
    const user = await this.userService.findByEmail(data.email);

    // Check if account is locked
    const now = new Date();
    const lockedUntil = user.lockedUntil;
    if (lockedUntil && lockedUntil > now) {
      const minutesLeft = Math.ceil(
        (lockedUntil.getTime() - now.getTime()) / (1000 * 60),
      );
      throw new CustomError(
        `Account is locked. Try again in ${minutesLeft} minutes.`,
        HttpStatus.LOCKED,
        "ACCOUNT_LOCKED",
      );
    }

    const isValidPassword = await hasherUtils.comparePass(
      data.password,
      user.password,
    );

    if (!isValidPassword) {
      // Increment failed login attempts
      await this.handleFailedLogin(user.id);

      throw new CustomError(
        "Invalid credentials",
        HttpStatus.BAD_REQUEST,
        "BAD_REQUEST",
      );
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(user.id);

    // decronstructed user for quit password and not exposed.
    const { password: _password, ...userData } = user;
    return userData as User;
  }

  /**
   * Handles failed login attempt by incrementing counter and potentially locking account
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    try {
      const user = await this.userService.findById(userId);
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = 5;
      const lockoutMinutes = 15;

      const updateData: _FailedLoginUpdateData = {
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: new Date(),
      };

      // Lock account after max attempts
      if (failedAttempts >= maxAttempts) {
        const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
        updateData.lockedUntil = lockedUntil;
      }

      // Use userRepository directly for raw updates
      await userRepository.update(
        userId,
        updateData as unknown as Record<string, unknown>,
      );
    } catch (error) {
      // Log but don't expose error
      console.error("[AUTH] Error handling failed login:", error);
    }
  }

  /**
   * Resets failed login attempts after successful login
   */
  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      const updateData: _ResetLoginUpdateData = {
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        lockedUntil: null,
      };

      // Use userRepository directly for raw updates
      await userRepository.update(
        userId,
        updateData as unknown as Record<string, unknown>,
      );
    } catch (error) {
      // Log but don't expose error
      console.error("[AUTH] Error resetting failed login attempts:", error);
    }
  }

  /**
   * Validates a user's password without returning user data.
   * Used for password verification in sensitive operations.
   *
   * @param email - User email
   * @param password - Password to validate
   * @returns true if password is valid, false otherwise
   */
  async validatePassword(email: string, password: string): Promise<boolean> {
    try {
      const user = await this.userService.findByEmail(email);
      return await hasherUtils.comparePass(password, user.password);
    } catch {
      return false;
    }
  }
}

export default new AuthService(userService);
