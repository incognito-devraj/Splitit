import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Generic Zod validation middleware.
 * Pass a schema that validates { body, params, query }.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      next(result.error);
      return;
    }
    // Write coerced values back
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.params !== undefined) req.params = result.data.params;
    if (result.data.query !== undefined) req.query = result.data.query;
    next();
  };
}
