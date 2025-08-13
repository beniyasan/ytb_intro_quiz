import { Request } from 'express';

// JWT Token Payload Interface
export interface TokenPayload {
  sub: string; // User ID
  email: string;
  username: string;
  roles: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

// Token Pair Interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// User Registration Request
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

// User Login Request
export interface LoginRequest {
  email: string;
  password: string;
}

// Token Refresh Request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Authentication Response
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

// User Profile Response
export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Request with User
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  sessionId?: string;
}

// Password Validation Result
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

// Session Information
export interface SessionInfo {
  sessionId: string;
  userId: string;
  isActive: boolean;
  lastUsed: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Audit Log Entry
export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// JWT Configuration
export interface JWTConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

// Rate Limit Configuration
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Application Configuration
export interface AppConfig {
  port: number;
  apiVersion: string;
  nodeEnv: string;
  corsOrigins: string[];
  jwt: JWTConfig;
  rateLimit: {
    global: RateLimitConfig;
    auth: RateLimitConfig;
  };
  password: {
    minLength: number;
    bcryptRounds: number;
    historyCount: number;
  };
  database: {
    url: string;
  };
  encryption: {
    key: string;
  };
  logging: {
    level: string;
    file: string;
  };
}