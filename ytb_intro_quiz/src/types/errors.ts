// Custom Error Classes

// Base Application Error
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication Errors
export class UnauthorizedException extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenException extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message = 'Forbidden') {
    super(message);
  }
}

// Validation Errors
export class ValidationException extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    message = 'Validation failed',
    public readonly details?: string[]
  ) {
    super(message);
  }
}

// Conflict Errors
export class ConflictException extends AppError {
  readonly statusCode = 409;
  readonly isOperational = true;

  constructor(message = 'Resource conflict') {
    super(message);
  }
}

// Not Found Errors
export class NotFoundException extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(message = 'Resource not found') {
    super(message);
  }
}

// Rate Limiting Errors
export class TooManyRequestsException extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(message = 'Too many requests') {
    super(message);
  }
}

// Internal Server Errors
export class InternalServerException extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message = 'Internal server error', cause?: Error) {
    super(message, cause);
  }
}

// Database Errors
export class DatabaseException extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message = 'Database operation failed', cause?: Error) {
    super(message, cause);
  }
}

// JWT Token Errors
export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super('Token has expired');
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor() {
    super('Invalid token provided');
  }
}

export class TokenMalformedException extends UnauthorizedException {
  constructor() {
    super('Token is malformed');
  }
}

// Session Errors
export class SessionExpiredException extends UnauthorizedException {
  constructor() {
    super('Session has expired');
  }
}

export class InvalidSessionException extends UnauthorizedException {
  constructor() {
    super('Invalid session');
  }
}

// Password Errors
export class WeakPasswordException extends ValidationException {
  constructor(requirements: string[]) {
    super('Password does not meet security requirements', requirements);
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid email or password');
  }
}

// Account Errors
export class AccountLockedException extends ForbiddenException {
  constructor() {
    super('Account is temporarily locked');
  }
}

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super('Email address is already registered');
  }
}

export class UsernameAlreadyExistsException extends ConflictException {
  constructor() {
    super('Username is already taken');
  }
}

// Error Response Interface
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: string[];
    timestamp: string;
    path: string;
  };
}

// Error Handler Utility Type
export type ErrorHandler = (error: Error) => ErrorResponse;