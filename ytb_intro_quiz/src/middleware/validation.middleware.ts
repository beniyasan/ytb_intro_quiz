import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationException } from '../types/errors';
import { appConfig } from '../config/app';

/**
 * Validation middleware factory
 * Creates middleware to validate request body, query parameters, or params
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        throw new ValidationException('Request body validation failed', errors);
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        throw new ValidationException('Query parameters validation failed', errors);
      }
      next(error);
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        throw new ValidationException('Path parameters validation failed', errors);
      }
      next(error);
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  // User registration
  registerBody: z.object({
    email: z.string()
      .email('Invalid email format')
      .min(1, 'Email is required')
      .max(255, 'Email must not exceed 255 characters'),
    
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    
    password: z.string()
      .min(appConfig.password.minLength, `Password must be at least ${appConfig.password.minLength} characters`)
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  }),

  // User login
  loginBody: z.object({
    email: z.string()
      .email('Invalid email format')
      .min(1, 'Email is required'),
    
    password: z.string()
      .min(1, 'Password is required')
  }),

  // Token refresh
  refreshTokenBody: z.object({
    refreshToken: z.string()
      .min(1, 'Refresh token is required')
  }),

  // Update profile
  updateProfileBody: z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
      .optional(),
    
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email must not exceed 255 characters')
      .optional()
  }).refine(
    data => data.username !== undefined || data.email !== undefined,
    { message: 'At least one field must be provided for update' }
  ),

  // Change password
  changePasswordBody: z.object({
    currentPassword: z.string()
      .min(1, 'Current password is required'),
    
    newPassword: z.string()
      .min(appConfig.password.minLength, `Password must be at least ${appConfig.password.minLength} characters`)
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  }),

  // UUID parameter
  uuidParam: z.object({
    id: z.string()
      .uuid('Invalid UUID format')
  }),

  // Pagination query
  paginationQuery: z.object({
    page: z.string()
      .regex(/^\d+$/, 'Page must be a positive integer')
      .transform(val => parseInt(val, 10))
      .refine(val => val >= 1, 'Page must be at least 1')
      .optional()
      .default('1'),
    
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(val => parseInt(val, 10))
      .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
      .optional()
      .default('10')
  }),

  // Search query
  searchQuery: z.object({
    q: z.string()
      .min(1, 'Search query cannot be empty')
      .max(100, 'Search query must not exceed 100 characters')
      .optional(),
    
    category: z.enum(['all', 'users', 'quizzes', 'videos'])
      .optional()
      .default('all')
  })
};

// Validation middleware for common endpoints
export const validation = {
  register: validateBody(commonSchemas.registerBody),
  login: validateBody(commonSchemas.loginBody),
  refreshToken: validateBody(commonSchemas.refreshTokenBody),
  updateProfile: validateBody(commonSchemas.updateProfileBody),
  changePassword: validateBody(commonSchemas.changePasswordBody),
  uuidParam: validateParams(commonSchemas.uuidParam),
  pagination: validateQuery(commonSchemas.paginationQuery),
  search: validateQuery(commonSchemas.searchQuery)
};

// Custom validation helper for file uploads
export function validateFile(options: {
  required?: boolean;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;

    // Check if file is required
    if (options.required && !file) {
      throw new ValidationException('File is required');
    }

    // If file is not provided and not required, skip validation
    if (!file) {
      return next();
    }

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      throw new ValidationException(
        `File size too large. Maximum size is ${Math.round(options.maxSize / (1024 * 1024))}MB`
      );
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw new ValidationException(
        `Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}`
      );
    }

    next();
  };
}

// Sanitize input middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize strings in request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
}

// Helper function to sanitize object recursively
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Helper function to sanitize individual strings
function sanitizeString(str: string): string {
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Trim whitespace
  str = str.trim();
  
  // Remove control characters except tabs, newlines
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return str;
}

// Rate limiting validation
export function validateRateLimit(req: Request, res: Response, next: NextFunction) {
  // Check if X-Forwarded-For header exists (behind proxy)
  const clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   'unknown';

  // Add client IP to request for use in other middleware
  (req as any).clientIP = clientIP;

  next();
}

// Content type validation
export function validateContentType(...allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      throw new ValidationException('Content-Type header is required');
    }

    // Extract base content type (ignore charset, etc.)
    const baseContentType = contentType.split(';')[0].trim();

    if (!allowedTypes.includes(baseContentType)) {
      throw new ValidationException(
        `Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    next();
  };
}

// JSON validation middleware
export const validateJSON = validateContentType('application/json');