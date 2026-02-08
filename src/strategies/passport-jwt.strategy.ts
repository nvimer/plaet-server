import {
  ExtractJwt,
  Strategy as JwtStrategy,
  StrategyOptions,
  VerifyCallback,
} from "passport-jwt";
import userService from "../api/users/user.service";
import { PayloadInput } from "../api/auth/tokens/token.validation";
import { config } from "../config";
import tokenService from "../api/auth/tokens/token.service";

// define options for strategy jwt
// extract jwt from header or cookie
const options: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    (req) => req?.cookies?.accessToken, // Extract from httpOnly cookie
  ]),
  secretOrKey: config.jwtSecret,
  // can user issuer and audience for major security
  // issuer:
  // audience:
};

// Create a callback for verify user. Pass the payload with id of user.
// if user exists, return user with his roles and permissions, if not found user, return error
const jwtVerify: VerifyCallback = async (payload: PayloadInput, done) => {
  try {
    // Check if token is blacklisted
    const isBlacklisted = await tokenService.isTokenBlacklisted(
      payload.token || "",
    );
    if (isBlacklisted) {
      return done(null, false);
    }

    const user = await userService.findUserWithRolesAndPermissions(payload.sub);
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error as Error, false);
  }
};

// configure strategy with object decoded of jwt
export const jwtStrategy = new JwtStrategy(options, jwtVerify);
