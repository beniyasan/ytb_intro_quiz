import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types/auth';
import { 
  ValidationException,
  InvalidCredentialsException,
  EmailAlreadyExistsException,
  UsernameAlreadyExistsException,
  UnauthorizedException
} from '../types/errors';
import { authLogger } from '../utils/logger';

/**
 * Authentication Controller
 * Handles authentication-related HTTP endpoints
 */
export class AuthController {
  /**
   * Register new user
   * POST /auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, password } = req.body;

      const result = await authService.register(
        { email, username, password },
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsException ||
          error instanceof UsernameAlreadyExistsException ||
          error instanceof ValidationException) {
        res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: error.name,
            statusCode: 400,
            ...(error instanceof ValidationException && { details: error.details })
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await authService.login(
        { email, password },
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        res.status(401).json({
          success: false,
          error: {
            message: error.message,
            code: error.name,
            statusCode: 401
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshToken(
        { refreshToken },
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        res.status(401).json({
          success: false,
          error: {
            message: error.message,
            code: error.name,
            statusCode: 401
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken;
      const userId = req.user?.sub;

      if (!userId) {
        throw new UnauthorizedException('Authentication required');
      }

      await authService.logout(
        userId,
        refreshToken,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /auth/me
   */
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        throw new UnauthorizedException('Authentication required');
      }

      const profile = await authService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /auth/profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      const { username, email } = req.body;

      if (!userId) {
        throw new UnauthorizedException('Authentication required');
      }

      const profile = await authService.updateUserProfile(
        userId,
        { username, email },
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsException ||
          error instanceof UsernameAlreadyExistsException) {
        res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: error.name,
            statusCode: 400
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Change password
   * PUT /auth/password
   */
  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        throw new UnauthorizedException('Authentication required');
      }

      await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        res.status(401).json({
          success: false,
          error: {
            message: error.message,
            code: error.name,
            statusCode: 401
          }
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Validate token (utility endpoint)
   * GET /auth/validate
   */
  async validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    // If we reach here, the token is valid (middleware passed)
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user,
        sessionId: req.sessionId
      }
    });
  }
}

// Singleton instance
export const authController = new AuthController();