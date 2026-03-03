import morgan from "morgan";
import { Application } from "express";
import { logger } from "../config/logger";

const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export function requestLogger(app: Application) {
  app.use(morgan("dev", { stream: morganStream }));
}
