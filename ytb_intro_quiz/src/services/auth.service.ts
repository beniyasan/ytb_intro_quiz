import { User } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { auditRepository } from '../repositories/audit.repository';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { 
  AuthResponse, 
  RegisterRequest, 
  LoginRequest, 
  RefreshTokenRequest,
  UserProfileResponse 
} from '../types/auth';
import {
  InvalidCredentialsException,
  EmailAlreadyExistsException,
  UsernameAlreadyExistsException,
  NotFoundException,
  UnauthorizedException,
  WeakPasswordException
} from '../types/errors';
import { authLogger } from '../utils/logger';
import { appConfig } from '../config/app';

/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */
export class AuthService {
  /**
   * Register new user
   */
  async register(
    data: RegisterRequest,
    metadata: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponse> {
    const { email, password, username } = data;

    try {
      // Check if email already exists
      if (await userRepository.emailExists(email)) {
        await this.logAuditEvent({
          action: 'register',
          resource: 'user',
          result: 'failure',
          metadata: { reason: 'email_exists', email },
          ...metadata
        });
        throw new EmailAlreadyExistsException();
      }

      // Check if username already exists
      if (await userRepository.usernameExists(username)) {
        await this.logAuditEvent({
          action: 'register',
          resource: 'user',
          result: 'failure',
          metadata: { reason: 'username_exists', username },
          ...metadata
        });
        throw new UsernameAlreadyExistsException();
      }

      // Hash password
      let passwordHash: string;
      try {
        passwordHash = await hashPassword(password);
      } catch (error) {
        if (error instanceof WeakPasswordException) {
          await this.logAuditEvent({
            action: 'register',
            resource: 'user',
            result: 'failure',
            metadata: { reason: 'weak_password', email },
            ...metadata
          });
          throw error;
        }
        throw error;
      }

      // Create user
      const user = await userRepository.create({
        email,
        username,
        passwordHash
      });

      // Add initial password to history
      await userRepository.addPasswordHistory(user.id, passwordHash);

      // Generate tokens
      const { tokens, sessionId } = generateTokens({
        id: user.id,
        email: user.email,
        username: user.username,
        roles: ['player'] // Default role
      });

      // Store refresh token
      await userRepository.createRefreshToken({
        userId: user.id,
        token: tokens.refreshToken,
        sessionId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Create session
      await userRepository.createSession({
        userId: user.id,
        sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });

      // Log success
      await this.logAuditEvent({
        userId: user.id,
        action: 'register',
        resource: 'user',
        result: 'success',
        metadata: { email, username },
        ...metadata
      });

      authLogger.info('User registered successfully', { userId: user.id, email, username });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      if (error instanceof EmailAlreadyExistsException ||
          error instanceof UsernameAlreadyExistsException ||
          error instanceof WeakPasswordException) {
        throw error;
      }

      authLogger.error('Registration failed', { error, email, username });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(
    data: LoginRequest,
    metadata: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponse> {
    const { email, password } = data;

    try {
      // Find user by email
      const user = await userRepository.findByEmail(email);
      if (!user) {
        await this.logAuditEvent({
          action: 'login',
          resource: 'user',
          result: 'failure',
          metadata: { reason: 'user_not_found', email },
          ...metadata
        });
        throw new InvalidCredentialsException();
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        await this.logAuditEvent({
          userId: user.id,
          action: 'login',
          resource: 'user',
          result: 'failure',
          metadata: { reason: 'invalid_password', email },
          ...metadata
        });
        throw new InvalidCredentialsException();
      }

      // Generate tokens
      const { tokens, sessionId } = generateTokens({
        id: user.id,
        email: user.email,
        username: user.username,
        roles: ['player'] // TODO: Get actual roles from user
      });

      // Store refresh token
      await userRepository.createRefreshToken({
        userId: user.id,
        token: tokens.refreshToken,
        sessionId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Create session
      await userRepository.createSession({
        userId: user.id,
        sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });

      // Log success
      await this.logAuditEvent({
        userId: user.id,
        action: 'login',
        resource: 'user',
        result: 'success',
        metadata: { email },
        ...metadata
      });

      authLogger.info('User logged in successfully', { userId: user.id, email });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        throw error;
      }

      authLogger.error('Login failed', { error, email });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    data: RefreshTokenRequest,
    metadata: { ipAddress?: string; userAgent?: string }
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = data;

    try {
      // Verify refresh token
      const tokenPayload = verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database
      const storedToken = await userRepository.findValidRefreshToken(refreshToken);
      if (!storedToken) {
        await this.logAuditEvent({
          action: 'refresh_token',
          resource: 'token',
          result: 'failure',
          metadata: { reason: 'token_not_found' },
          ...metadata
        });
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await userRepository.findByIdOrThrow(tokenPayload.sub);

      // Revoke old refresh token
      await userRepository.revokeRefreshToken(refreshToken);

      // Generate new tokens
      const { tokens, sessionId } = generateTokens({
        id: user.id,
        email: user.email,
        username: user.username,
        roles: ['player'] // TODO: Get actual roles from user
      });

      // Store new refresh token
      await userRepository.createRefreshToken({
        userId: user.id,
        token: tokens.refreshToken,
        sessionId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Update session
      await userRepository.updateSessionLastUsed(tokenPayload.sessionId);

      // Log success
      await this.logAuditEvent({
        userId: user.id,
        action: 'refresh_token',
        resource: 'token',
        result: 'success',
        ...metadata
      });

      authLogger.info('Token refreshed successfully', { userId: user.id });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      authLogger.error('Token refresh failed', { error });
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  /**
   * Logout user
   */
  async logout(
    userId: string,
    refreshToken?: string,
    metadata: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<void> {
    try {
      // Revoke refresh token if provided
      if (refreshToken) {
        await userRepository.revokeRefreshToken(refreshToken);
      }

      // Deactivate all user sessions (logout from all devices)
      await userRepository.deactivateAllUserSessions(userId);

      // Log logout
      await this.logAuditEvent({
        userId,
        action: 'logout',
        resource: 'user',
        result: 'success',
        ...metadata
      });

      authLogger.info('User logged out', { userId });
    } catch (error) {
      authLogger.error('Logout failed', { error, userId });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfileResponse> {
    const user = await userRepository.findByIdOrThrow(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updateData: { username?: string; email?: string },
    metadata: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<UserProfileResponse> {
    try {
      // Check if new email already exists
      if (updateData.email) {
        const existingUser = await userRepository.findByEmail(updateData.email);
        if (existingUser && existingUser.id !== userId) {
          throw new EmailAlreadyExistsException();
        }
      }

      // Check if new username already exists
      if (updateData.username) {
        const existingUser = await userRepository.findByUsername(updateData.username);
        if (existingUser && existingUser.id !== userId) {
          throw new UsernameAlreadyExistsException();
        }
      }

      // Update user
      const user = await userRepository.update(userId, updateData);

      // Log update
      await this.logAuditEvent({
        userId,
        action: 'update_profile',
        resource: 'user',
        result: 'success',
        metadata: { updatedFields: Object.keys(updateData) },
        ...metadata
      });

      authLogger.info('User profile updated', { userId, updatedFields: Object.keys(updateData) });

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error: any) {
      await this.logAuditEvent({
        userId,
        action: 'update_profile',
        resource: 'user',
        result: 'failure',
        metadata: { error: error.message },
        ...metadata
      });

      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    metadata: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<void> {
    try {
      // Get user
      const user = await userRepository.findByIdOrThrow(userId);

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        await this.logAuditEvent({
          userId,
          action: 'change_password',
          resource: 'user',
          result: 'failure',
          metadata: { reason: 'invalid_current_password' },
          ...metadata
        });
        throw new InvalidCredentialsException();
      }

      // Check password history
      const passwordHistory = await userRepository.getPasswordHistory(
        userId,
        appConfig.password.historyCount
      );

      const isPasswordInHistory = await Promise.all(
        passwordHistory.map(p => verifyPassword(newPassword, p.passwordHash))
      ).then(results => results.some(Boolean));

      if (isPasswordInHistory) {
        await this.logAuditEvent({
          userId,
          action: 'change_password',
          resource: 'user',
          result: 'failure',
          metadata: { reason: 'password_in_history' },
          ...metadata
        });
        throw new WeakPasswordException([
          `Password cannot be one of the last ${appConfig.password.historyCount} passwords`
        ]);
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await userRepository.updatePassword(userId, newPasswordHash);

      // Add to password history
      await userRepository.addPasswordHistory(userId, newPasswordHash);

      // Clean old password history
      await userRepository.cleanOldPasswordHistory(userId, appConfig.password.historyCount);

      // Revoke all refresh tokens (force re-login on all devices)
      await userRepository.revokeAllUserRefreshTokens(userId);

      // Deactivate all sessions
      await userRepository.deactivateAllUserSessions(userId);

      // Log success
      await this.logAuditEvent({
        userId,
        action: 'change_password',
        resource: 'user',
        result: 'success',
        ...metadata
      });

      authLogger.info('Password changed successfully', { userId });
    } catch (error) {
      if (error instanceof InvalidCredentialsException || 
          error instanceof WeakPasswordException) {
        throw error;
      }

      await this.logAuditEvent({
        userId,
        action: 'change_password',
        resource: 'user',
        result: 'failure',
        metadata: { error: (error as Error).message },
        ...metadata
      });

      authLogger.error('Password change failed', { error, userId });
      throw error;
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: {
    userId?: string;
    action: string;
    resource: string;
    result: 'success' | 'failure';
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await auditRepository.createAuditLog(event);
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      authLogger.error('Failed to log audit event', { error, event });
    }
  }
}

// Singleton instance
export const authService = new AuthService();