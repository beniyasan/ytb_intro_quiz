import jwt from 'jsonwebtoken';
import { appConfig } from '../config/app';
import { TokenPayload, TokenPair } from '../types/auth';
import { 
  TokenExpiredException, 
  InvalidTokenException, 
  TokenMalformedException 
} from '../types/errors';
import { generateSessionId } from './encryption';
import { authLogger } from './logger';

/**
 * JWT Service for token generation and verification
 * Implements secure JWT handling with access and refresh tokens
 */
export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    this.accessTokenSecret = appConfig.jwt.accessSecret;
    this.refreshTokenSecret = appConfig.jwt.refreshSecret;
    this.issuer = appConfig.jwt.issuer;
    this.audience = appConfig.jwt.audience;
  }

  /**
   * Generate access and refresh token pair
   */
  generateTokens(user: {
    id: string;
    email: string;
    username: string;
    roles?: string[];
  }): { tokens: TokenPair; sessionId: string } {
    const sessionId = generateSessionId();
    
    // Access token payload
    const accessTokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles || ['player'],
      sessionId
    };

    // Generate access token
    const accessToken = jwt.sign(
      accessTokenPayload,
      this.accessTokenSecret,
      {
        expiresIn: appConfig.jwt.accessExpiresIn,
        issuer: this.issuer,
        audience: this.audience,
        algorithm: 'HS256'
      }
    );

    // Generate refresh token (simpler payload)
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        sessionId,
        type: 'refresh'
      },
      this.refreshTokenSecret,
      {
        expiresIn: appConfig.jwt.refreshExpiresIn,
        issuer: this.issuer,
        audience: this.audience,
        algorithm: 'HS256'
      }
    );

    authLogger.info('Token pair generated', { 
      userId: user.id, 
      sessionId: sessionId.substring(0, 8) + '...' 
    });

    return {
      tokens: { accessToken, refreshToken },
      sessionId
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      }) as TokenPayload;

      return payload;
    } catch (error) {
      this.handleJWTError(error, 'access');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { sub: string; sessionId: string } {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      }) as any;

      if (payload.type !== 'refresh') {
        throw new InvalidTokenException();
      }

      return {
        sub: payload.sub,
        sessionId: payload.sessionId
      };
    } catch (error) {
      this.handleJWTError(error, 'refresh');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      throw new TokenMalformedException();
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration date
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiration(token: string): number | null {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return null;
    }

    const now = new Date();
    return Math.max(0, Math.floor((expiration.getTime() - now.getTime()) / 1000));
  }

  /**
   * Extract user ID from token without full verification
   */
  extractUserId(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.sub || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId: string): string {
    return jwt.sign(
      {
        sub: userId,
        type: 'password_reset',
        purpose: 'reset'
      },
      this.accessTokenSecret,
      {
        expiresIn: '1h', // 1 hour for password reset
        issuer: this.issuer,
        audience: this.audience,
        algorithm: 'HS256'
      }
    );
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      }) as any;

      if (payload.type !== 'password_reset' || payload.purpose !== 'reset') {
        throw new InvalidTokenException();
      }

      return { userId: payload.sub };
    } catch (error) {
      this.handleJWTError(error, 'password_reset');
    }
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(userId: string, email: string): string {
    return jwt.sign(
      {
        sub: userId,
        email,
        type: 'email_verification',
        purpose: 'verify'
      },
      this.accessTokenSecret,
      {
        expiresIn: '24h', // 24 hours for email verification
        issuer: this.issuer,
        audience: this.audience,
        algorithm: 'HS256'
      }
    );
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token: string): { userId: string; email: string } {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      }) as any;

      if (payload.type !== 'email_verification' || payload.purpose !== 'verify') {
        throw new InvalidTokenException();
      }

      return { 
        userId: payload.sub,
        email: payload.email
      };
    } catch (error) {
      this.handleJWTError(error, 'email_verification');
    }
  }

  /**
   * Handle JWT errors and convert to appropriate exceptions
   */
  private handleJWTError(error: any, tokenType: string): never {
    authLogger.warn(`Token verification failed for ${tokenType} token`, {
      error: error.message
    });

    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredException();
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      if (error.message.includes('malformed')) {
        throw new TokenMalformedException();
      }
      throw new InvalidTokenException();
    }
    
    if (error instanceof jwt.NotBeforeError) {
      throw new InvalidTokenException();
    }

    // If it's already one of our custom exceptions, re-throw
    if (error instanceof TokenExpiredException || 
        error instanceof InvalidTokenException || 
        error instanceof TokenMalformedException) {
      throw error;
    }

    // Default to invalid token
    throw new InvalidTokenException();
  }
}

// Singleton instance
export const jwtService = new JWTService();

// Export commonly used functions
export const generateTokens = (user: Parameters<typeof jwtService.generateTokens>[0]) => 
  jwtService.generateTokens(user);

export const verifyAccessToken = (token: string) => 
  jwtService.verifyAccessToken(token);

export const verifyRefreshToken = (token: string) => 
  jwtService.verifyRefreshToken(token);

export const isTokenExpired = (token: string) => 
  jwtService.isTokenExpired(token);

export const extractUserId = (token: string) => 
  jwtService.extractUserId(token);

// Token extraction helper for Authorization header
export function extractTokenFromHeader(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

// Utility to get token info for logging (safely)
export function getTokenInfo(token: string): { userId?: string; sessionId?: string; exp?: Date } {
  try {
    const decoded = jwt.decode(token) as any;
    return {
      userId: decoded?.sub,
      sessionId: decoded?.sessionId,
      exp: decoded?.exp ? new Date(decoded.exp * 1000) : undefined
    };
  } catch (error) {
    return {};
  }
}