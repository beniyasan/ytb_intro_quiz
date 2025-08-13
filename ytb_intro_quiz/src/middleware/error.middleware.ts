import { Request, Response, NextFunction } from 'express';
import { 
  BaseApiException,
  ValidationException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  TooManyRequestsException,
  DatabaseException
} from '../types/errors';
import { appLogger } from '../utils/logger';

/**
 * Global error handling middleware
 * Should be the last middleware in the chain
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response has already been sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Handle custom API exceptions
  if (error instanceof BaseApiException) {
    handleApiException(error, req, res);
    return;
  }

  // Handle specific error types
  if (error.name === 'JsonWebTokenError') {
    handleJwtError(error, req, res);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    handleTokenExpiredError(error, req, res);
    return;
  }

  if (error.name === 'SyntaxError' && 'body' in error) {
    handleJsonSyntaxError(error, req, res);
    return;
  }

  if (error.name === 'MulterError') {
    handleMulterError(error, req, res);
    return;
  }

  // Handle Prisma errors
  if (error.name.startsWith('Prisma')) {
    handlePrismaError(error, req, res);
    return;
  }

  // Log unexpected errors
  appLogger.error('Unexpected error occurred', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500
    }
  });
}

/**
 * Handle custom API exceptions
 */
function handleApiException(error: BaseApiException, req: Request, res: Response): void {
  const statusCode = getStatusCodeForException(error);
  
  // Log the error with appropriate level
  if (statusCode >= 500) {
    appLogger.error('API Exception (Server Error)', {
      error: error.message,
      name: error.name,
      statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  } else if (statusCode >= 400) {
    appLogger.warn('API Exception (Client Error)', {
      error: error.message,
      name: error.name,
      statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  }

  const response: any = {
    success: false,
    error: {
      message: error.message,
      code: error.name,
      statusCode
    }
  };

  // Add additional details for validation errors
  if (error instanceof ValidationException && error.details) {
    response.error.details = error.details;
  }

  res.status(statusCode).json(response);
}

/**
 * Handle JWT errors
 */
function handleJwtError(error: Error, req: Request, res: Response): void {
  appLogger.warn('JWT Error', {
    error: error.message,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(401).json({
    success: false,
    error: {
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      statusCode: 401
    }
  });
}

/**
 * Handle token expired errors
 */
function handleTokenExpiredError(error: Error, req: Request, res: Response): void {
  appLogger.warn('Token Expired', {
    error: error.message,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(401).json({
    success: false,
    error: {
      message: 'Token has expired',
      code: 'TOKEN_EXPIRED',
      statusCode: 401
    }
  });
}

/**
 * Handle JSON syntax errors
 */
function handleJsonSyntaxError(error: Error, req: Request, res: Response): void {
  appLogger.warn('JSON Syntax Error', {
    error: error.message,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(400).json({
    success: false,
    error: {
      message: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      statusCode: 400
    }
  });
}

/**
 * Handle Multer errors (file upload errors)
 */
function handleMulterError(error: any, req: Request, res: Response): void {
  appLogger.warn('Multer Error', {
    error: error.message,
    code: error.code,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  let message = 'File upload error';
  let statusCode = 400;

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File size too large';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected file field';
      break;
    default:
      message = error.message || 'File upload error';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: 'FILE_UPLOAD_ERROR',
      statusCode
    }
  });
}

/**
 * Handle Prisma database errors
 */
function handlePrismaError(error: any, req: Request, res: Response): void {
  appLogger.error('Prisma Database Error', {
    error: error.message,
    code: error.code,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  let message = 'Database error';
  let statusCode = 500;

  // Handle specific Prisma error codes
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      message = 'A record with this data already exists';
      statusCode = 409; // Conflict
      break;
    case 'P2025': // Record not found
      message = 'The requested resource was not found';
      statusCode = 404;
      break;
    case 'P2003': // Foreign key constraint violation
      message = 'Related record not found';
      statusCode = 400;
      break;
    default:
      message = 'Database operation failed';
      statusCode = 500;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: 'DATABASE_ERROR',
      statusCode
    }
  });
}

/**
 * Get appropriate status code for custom exceptions
 */
function getStatusCodeForException(error: BaseApiException): number {
  if (error instanceof ValidationException) return 400;
  if (error instanceof UnauthorizedException) return 401;
  if (error instanceof ForbiddenException) return 403;
  if (error instanceof NotFoundException) return 404;
  if (error instanceof TooManyRequestsException) return 429;
  if (error instanceof DatabaseException) return 500;
  
  // Default to 500 for unknown exceptions
  return 500;
}

/**
 * 404 Not Found middleware
 * Should be placed before the error handler but after all routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      path: req.originalUrl
    }
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}