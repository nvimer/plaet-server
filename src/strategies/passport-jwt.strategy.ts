import {
  ExtractJwt,
  Strategy as JwtStrategy,
  StrategyOptions,
  VerifyCallback,
} from "passport-jwt";
import userService from "../api/users/user.service";
import { PayloadInput } from "../api/auth/tokens/token.validation";
import { config } from "../config";

import { TokenType } from "@prisma/client";

// define options for strategy jwt
// extract jwt from header or cookie
const options: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    (req) => {
      // Extract from httpOnly cookie - ONLY accessToken
      return req?.cookies?.accessToken;
    },
  ]),
  secretOrKey: config.jwtSecret,
};

// Create a callback for verify user. Pass the payload with id of user.
// if user exists, return user with his roles and permissions, if not found user, return error
const jwtVerify: VerifyCallback = async (payload: PayloadInput, done) => {
  try {
    // SECURITY: Ensure this is an ACCESS token, not a REFRESH or other type
    if (payload.type !== TokenType.ACCESS) {
      return done(null, false, { message: "Invalid token type" });
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
