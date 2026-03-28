import { AuthService } from "../../auth.service";
import { UserServiceInterface } from "../../../users/interfaces/user.service.interface";
import { createMockUserService } from "../../../users/__tests__/helpers";
import { createUserFixture } from "../../../users/__tests__/helpers/user.fixtures";
import { CustomError } from "../../../../types/custom-errors";
import { HttpStatus } from "../../../../utils/httpStatus.enum";
import hasherUtils from "../../../../utils/hasher.utils";
import { LoginInput } from "../../auth.validator";

// Mock hasher utils
jest.mock("../../../../utils/hasher.utils", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    comparePass: jest.fn(),
  },
}));

describe("AuthService - Unit Tests", () => {
  let authService: AuthService;
  let mockUserService: jest.Mocked<UserServiceInterface>;

  beforeEach(() => {
    mockUserService = createMockUserService();
    authService = new AuthService(mockUserService);
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should return user without password when valid credentials provided", async () => {
      // Arrange
      const loginData: LoginInput = {
        email: "test@example.com",
        password: "correctPassword123",
      };

      const userWithPassword = createUserFixture({
        email: loginData.email,
        password: "hashedPassword$2b$10$XXXXXXXXXXXX",
      });

      mockUserService.findByEmail.mockResolvedValue(userWithPassword);
      jest.mocked(hasherUtils.comparePass).mockResolvedValue(true);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(hasherUtils.comparePass).toHaveBeenCalledWith(
        loginData.password,
        userWithPassword.password,
      );
      expect(result).not.toHaveProperty("password");
      expect(result.id).toBe(userWithPassword.id);
      expect(result.email).toBe(userWithPassword.email);
    });

    it("should throw CustomError when password is incorrect", async () => {
      // Arrange
      const loginData: LoginInput = {
        email: "test@example.com",
        password: "wrongPassword",
      };

      const user = createUserFixture({
        email: loginData.email,
        password: "hashedPassword$2b$10$XXXXXXXXXXXX",
      });

      mockUserService.findByEmail.mockResolvedValue(user);
      jest.mocked(hasherUtils.comparePass).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(CustomError);
      await expect(authService.login(loginData)).rejects.toThrow(
        "Email o contraseña incorrectos",
      );

      try {
        await authService.login(loginData);
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        if (error instanceof CustomError) {
          expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(error.errorCode).toBe("INVALID_CREDENTIALS");
        }
      }
    });

    it("should throw error when user is not found", async () => {
      // Arrange
      const loginData: LoginInput = {
        email: "nonexistent@example.com",
        password: "anyPassword",
      };

      mockUserService.findByEmail.mockRejectedValue(
        new CustomError(
          "User not found",
          HttpStatus.NOT_FOUND,
          "USER_NOT_FOUND",
        ),
      );

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(CustomError);
      await expect(authService.login(loginData)).rejects.toThrow(
        "Email o contraseña incorrectos",
      );
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(hasherUtils.comparePass).not.toHaveBeenCalled();
    });

    it("should call findByEmail with correct email", async () => {
      // Arrange
      const loginData: LoginInput = {
        email: "specific@example.com",
        password: "password123",
      };

      const user = createUserFixture({
        email: loginData.email,
      });

      mockUserService.findByEmail.mockResolvedValue(user);
      jest.mocked(hasherUtils.comparePass).mockResolvedValue(true);

      // Act
      await authService.login(loginData);

      // Assert
      expect(mockUserService.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(loginData.email);
    });

    it("should call comparePass with correct password and hashed password", async () => {
      // Arrange
      const loginData: LoginInput = {
        email: "test@example.com",
        password: "plainPassword123",
      };

      const hashedPassword = "hashedPassword$2b$10$YYYYYYYYYYYY";
      const user = createUserFixture({
        email: loginData.email,
        password: hashedPassword,
      });

      mockUserService.findByEmail.mockResolvedValue(user);
      jest.mocked(hasherUtils.comparePass).mockResolvedValue(true);

      // Act
      await authService.login(loginData);

      // Assert
      expect(hasherUtils.comparePass).toHaveBeenCalledWith(
        loginData.password,
        hashedPassword,
      );
    });

    it("should return user with all fields except password", async () => {
      // Arrange
      const loginData: LoginInput = {
        email: "complete@example.com",
        password: "password123",
      };

      const user = createUserFixture({
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        email: loginData.email,
        phone: "3001234567",
        password: "hashedPassword",
      });

      mockUserService.findByEmail.mockResolvedValue(user);
      jest.mocked(hasherUtils.comparePass).mockResolvedValue(true);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result.id).toBe(user.id);
      expect(result.firstName).toBe(user.firstName);
      expect(result.lastName).toBe(user.lastName);
      expect(result.email).toBe(user.email);
      expect(result.phone).toBe(user.phone);
      expect(result).not.toHaveProperty("password");
    });
  });
});
