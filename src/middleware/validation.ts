import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import logger from '../config/logger';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      logger.error('Validation error:', error);
      
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          formattedErrors[path] = err.message;
        });
        
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: formattedErrors,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || 'Validation failed',
        });
      }
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error: any) {
      logger.error('Query validation error:', error);
      
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          formattedErrors[path] = err.message;
        });
        
        res.status(400).json({
          success: false,
          error: 'Query validation failed',
          errors: formattedErrors,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || 'Query validation failed',
        });
      }
    }
  };
};
