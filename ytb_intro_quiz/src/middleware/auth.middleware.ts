import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import { 
  UnauthorizedException, 
  ForbiddenException,
  InvalidSessionException
} from '../types/errors';
import { AuthenticatedRequest, TokenPayload } from '../types/auth';
import { authLogger } from '../utils/logger';

/**
 * Authentication middleware
 * Validates JWT tokens and adds user information to request
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Add user info to request
    req.user = payload;
    req.sessionId = payload.sessionId;

    next();
  } catch (error) {
    authLogger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    });
    
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Adds user information to request if token is valid, but doesn't fail if missing
 */
export function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        req.sessionId = payload.sessionId;
      } catch (error) {
        // Log warning but don't fail the request
        authLogger.warn('Optional authentication failed', {
          error: error.message,
          ip: req.ip,
          path: req.path
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Session validation middleware
 * Validates that the session is still active
 */
export function validateSession(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !req.sessionId) {
    throw new UnauthorizedException('Authentication required');
  }

  // Validate session in background (don't block request)
  userRepository.findActiveSession(req.sessionId)
    .then(session => {
      if (!session) {
        authLogger.warn('Invalid session detected', {
          userId: req.user?.sub,
          sessionId: req.sessionId,
          ip: req.ip
        });
        throw new InvalidSessionException();
      }

      // Update session last used (non-blocking)
      userRepository.updateSessionLastUsed(req.sessionId!).catch(error => {
        authLogger.warn('Failed to update session last used', { error, sessionId: req.sessionId });
      });

      next();
    })
    .catch(error => {
      if (error instanceof InvalidSessionException) {
        next(error);
      } else {
        authLogger.error('Session validation failed', { error, sessionId: req.sessionId });
        next(new UnauthorizedException('Session validation failed'));
      }
    });
}

/**
 * Role-based authorization middleware
 */
export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      authLogger.warn('Authorization failed - insufficient permissions', {
        userId: req.user.sub,
        userRoles,
        requiredRoles: roles,
        path: req.path
      });
      
      throw new ForbiddenException('Insufficient permissions');
    }

    next();
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }

    // TODO: Implement permission checking logic based on user roles
    // This would typically involve checking the user's roles against a permission map
    
    // For now, we'll use a simple role-based approach
    const userRoles = req.user.roles || [];
    
    // Admin role has all permissions
    if (userRoles.includes('admin')) {
      return next();
    }

    // Check specific permissions (this is a simplified implementation)
    const hasPermission = permissions.every(permission => {
      switch (permission) {
        case 'quiz:create':
          return userRoles.includes('host') || userRoles.includes('admin');
        case 'quiz:delete':
          return userRoles.includes('admin');
        case 'quiz:play':
          return userRoles.includes('player') || userRoles.includes('host') || userRoles.includes('admin');
        case 'user:manage':
          return userRoles.includes('admin');
        default:
          return false;
      }
    });

    if (!hasPermission) {
      authLogger.warn('Authorization failed - insufficient permissions', {
        userId: req.user.sub,
        userRoles,
        requiredPermissions: permissions,
        path: req.path
      });
      
      throw new ForbiddenException('Insufficient permissions');
    }

    next();
  };
}

/**
 * Self-access authorization middleware
 * Allows users to access their own resources
 */
export function authorizeSelfAccess(paramName: string = 'userId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const resourceUserId = req.params[paramName];
    const currentUserId = req.user.sub;

    // Allow access to own resources or if user is admin
    if (resourceUserId !== currentUserId && !req.user.roles?.includes('admin')) {
      authLogger.warn('Self-access authorization failed', {
        userId: currentUserId,
        attemptedAccess: resourceUserId,
        path: req.path
      });
      
      throw new ForbiddenException('Access denied');
    }

    next();
  };
}

/**
 * API key authentication middleware (for service-to-service communication)
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    throw new UnauthorizedException('API key is required');
  }

  // TODO: Implement API key validation logic
  // This would typically involve checking the key against a database of valid keys
  
  // For now, we'll use a simple environment variable check
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey || apiKey !== validApiKey) {
    authLogger.warn('Invalid API key', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    });
    
    throw new UnauthorizedException('Invalid API key');
  }

  next();
}

/**
 * Middleware to extract and validate bearer token format
 */
export function validateBearerToken(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization;

  if (!authorization) {
    throw new UnauthorizedException('Authorization header is required');
  }

  const parts = authorization.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedException('Authorization header must be in format: Bearer <token>');
  }

  if (!parts[1] || parts[1].trim() === '') {
    throw new UnauthorizedException('Token cannot be empty');
  }

  next();
}

/**
 * Middleware to prevent access for deactivated or suspended users
 */
export function requireActiveUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedException('Authentication required');
  }

  // Check user status in database
  userRepository.findById(req.user.sub)
    .then(user => {
      if (!user) {
        authLogger.warn('User not found for valid token', { userId: req.user?.sub });
        throw new UnauthorizedException('User account not found');
      }

      // TODO: Add user status checks (active, suspended, etc.)
      // This would require adding a status field to the user model
      
      next();
    })
    .catch(error => {
      if (error instanceof UnauthorizedException) {
        next(error);
      } else {
        authLogger.error('Failed to check user status', { error, userId: req.user?.sub });
        next(new UnauthorizedException('Failed to validate user status'));
      }
    });
}

/**
 * Combined authentication and session validation middleware
 */
export const authenticateAndValidateSession = [
  authenticate,
  validateSession
];

/**
 * Admin-only access middleware
 */
export const requireAdmin = [
  authenticate,
  authorize('admin')
];

/**
 * Host or admin access middleware
 */
export const requireHostOrAdmin = [
  authenticate,
  authorize('host', 'admin')
];

/**
 * Player, host, or admin access middleware
 */
export const requirePlayer = [
  authenticate,
  authorize('player', 'host', 'admin')
];