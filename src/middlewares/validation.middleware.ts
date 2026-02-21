import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";
import { asyncHandler } from "../utils/asyncHandler";

export const validate = (schema: AnyZodObject) =>
  asyncHandler(async (req: Request, _res: Response, _next: NextFunction) => {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) req.body = parsed.body;
    
    if (parsed.query) {
        // Handle potential read-only req.query
        try {
            req.query = parsed.query;
        } catch {
            Object.assign(req.query, parsed.query);
        }
    }
    
    if (parsed.params) {
        try {
            req.params = parsed.params;
        } catch {
            Object.assign(req.params, parsed.params);
        }
    }

    // next() is called automatically by asyncHandler
  });
