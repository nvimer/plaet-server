import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";
import { asyncHandler } from "../utils/asyncHandler";

export const validate = (schema: AnyZodObject) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  });
