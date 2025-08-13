import { prisma } from '../config/database';
import { User, RefreshToken, PasswordHistory, Session } from '@prisma/client';
import { DatabaseException, NotFoundException } from '../types/errors';
import { dbLogger } from '../utils/logger';

/**
 * User Repository for database operations
 */
export class UserRepository {
  /**
   * Create a new user
   */
  async create(userData: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: userData
      });

      dbLogger.info('User created', { userId: user.id });
      return user;
    } catch (error) {
      dbLogger.error('Failed to create user', { error, userData: { email: userData.email, username: userData.username } });
      throw new DatabaseException('Failed to create user', error as Error);
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email }
      });
    } catch (error) {
      dbLogger.error('Failed to find user by email', { error, email });
      throw new DatabaseException('Failed to find user by email', error as Error);
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { username }
      });
    } catch (error) {
      dbLogger.error('Failed to find user by username', { error, username });
      throw new DatabaseException('Failed to find user by username', error as Error);
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id }
      });
    } catch (error) {
      dbLogger.error('Failed to find user by ID', { error, userId: id });
      throw new DatabaseException('Failed to find user by ID', error as Error);
    }
  }

  /**
   * Find user by ID or throw
   */
  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Update user
   */
  async update(id: string, updateData: Partial<Pick<User, 'username' | 'email'>>): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: updateData
      });

      dbLogger.info('User updated', { userId: id, updatedFields: Object.keys(updateData) });
      return user;
    } catch (error) {
      dbLogger.error('Failed to update user', { error, userId: id, updateData });
      throw new DatabaseException('Failed to update user', error as Error);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: { passwordHash }
      });

      dbLogger.info('User password updated', { userId: id });
    } catch (error) {
      dbLogger.error('Failed to update user password', { error, userId: id });
      throw new DatabaseException('Failed to update user password', error as Error);
    }
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id }
      });

      dbLogger.info('User deleted', { userId: id });
    } catch (error) {
      dbLogger.error('Failed to delete user', { error, userId: id });
      throw new DatabaseException('Failed to delete user', error as Error);
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });
      
      return user !== null;
    } catch (error) {
      dbLogger.error('Failed to check email existence', { error, email });
      throw new DatabaseException('Failed to check email existence', error as Error);
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true }
      });
      
      return user !== null;
    } catch (error) {
      dbLogger.error('Failed to check username existence', { error, username });
      throw new DatabaseException('Failed to check username existence', error as Error);
    }
  }

  /**
   * Create refresh token
   */
  async createRefreshToken(data: {
    userId: string;
    token: string;
    sessionId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    try {
      const refreshToken = await prisma.refreshToken.create({
        data
      });

      dbLogger.info('Refresh token created', { userId: data.userId, sessionId: data.sessionId });
      return refreshToken;
    } catch (error) {
      dbLogger.error('Failed to create refresh token', { error, userId: data.userId });
      throw new DatabaseException('Failed to create refresh token', error as Error);
    }
  }

  /**
   * Find valid refresh token
   */
  async findValidRefreshToken(token: string): Promise<RefreshToken | null> {
    try {
      return await prisma.refreshToken.findFirst({
        where: {
          token,
          isRevoked: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });
    } catch (error) {
      dbLogger.error('Failed to find refresh token', { error });
      throw new DatabaseException('Failed to find refresh token', error as Error);
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { isRevoked: true }
      });

      dbLogger.info('Refresh token revoked');
    } catch (error) {
      dbLogger.error('Failed to revoke refresh token', { error });
      throw new DatabaseException('Failed to revoke refresh token', error as Error);
    }
  }

  /**
   * Revoke all user refresh tokens
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    try {
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true }
      });

      dbLogger.info('All user refresh tokens revoked', { userId });
    } catch (error) {
      dbLogger.error('Failed to revoke user refresh tokens', { error, userId });
      throw new DatabaseException('Failed to revoke user refresh tokens', error as Error);
    }
  }

  /**
   * Clean expired refresh tokens
   */
  async cleanExpiredRefreshTokens(): Promise<void> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { isRevoked: true },
            { expiresAt: { lt: new Date() } }
          ]
        }
      });

      dbLogger.info('Expired refresh tokens cleaned', { deletedCount: result.count });
    } catch (error) {
      dbLogger.error('Failed to clean expired refresh tokens', { error });
      throw new DatabaseException('Failed to clean expired refresh tokens', error as Error);
    }
  }

  /**
   * Add password to history
   */
  async addPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      await prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash
        }
      });

      dbLogger.info('Password added to history', { userId });
    } catch (error) {
      dbLogger.error('Failed to add password history', { error, userId });
      throw new DatabaseException('Failed to add password history', error as Error);
    }
  }

  /**
   * Get password history
   */
  async getPasswordHistory(userId: string, limit: number): Promise<PasswordHistory[]> {
    try {
      return await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      dbLogger.error('Failed to get password history', { error, userId });
      throw new DatabaseException('Failed to get password history', error as Error);
    }
  }

  /**
   * Clean old password history
   */
  async cleanOldPasswordHistory(userId: string, keepCount: number): Promise<void> {
    try {
      const toDelete = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: keepCount,
        select: { id: true }
      });

      if (toDelete.length > 0) {
        await prisma.passwordHistory.deleteMany({
          where: {
            id: { in: toDelete.map(p => p.id) }
          }
        });

        dbLogger.info('Old password history cleaned', { userId, deletedCount: toDelete.length });
      }
    } catch (error) {
      dbLogger.error('Failed to clean old password history', { error, userId });
      throw new DatabaseException('Failed to clean old password history', error as Error);
    }
  }

  /**
   * Create session
   */
  async createSession(data: {
    userId: string;
    sessionId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Session> {
    try {
      const session = await prisma.session.create({
        data
      });

      dbLogger.info('Session created', { userId: data.userId, sessionId: data.sessionId });
      return session;
    } catch (error) {
      dbLogger.error('Failed to create session', { error, userId: data.userId });
      throw new DatabaseException('Failed to create session', error as Error);
    }
  }

  /**
   * Find active session
   */
  async findActiveSession(sessionId: string): Promise<Session | null> {
    try {
      return await prisma.session.findUnique({
        where: {
          sessionId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        }
      });
    } catch (error) {
      dbLogger.error('Failed to find session', { error, sessionId });
      throw new DatabaseException('Failed to find session', error as Error);
    }
  }

  /**
   * Update session last used
   */
  async updateSessionLastUsed(sessionId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: { sessionId },
        data: { lastUsed: new Date() }
      });
    } catch (error) {
      dbLogger.error('Failed to update session last used', { error, sessionId });
      // Don't throw error for this non-critical operation
    }
  }

  /**
   * Deactivate session
   */
  async deactivateSession(sessionId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: { sessionId },
        data: { isActive: false }
      });

      dbLogger.info('Session deactivated', { sessionId });
    } catch (error) {
      dbLogger.error('Failed to deactivate session', { error, sessionId });
      throw new DatabaseException('Failed to deactivate session', error as Error);
    }
  }

  /**
   * Deactivate all user sessions
   */
  async deactivateAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.updateMany({
        where: { userId },
        data: { isActive: false }
      });

      dbLogger.info('All user sessions deactivated', { userId });
    } catch (error) {
      dbLogger.error('Failed to deactivate user sessions', { error, userId });
      throw new DatabaseException('Failed to deactivate user sessions', error as Error);
    }
  }

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions(): Promise<void> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          OR: [
            { isActive: false },
            { expiresAt: { lt: new Date() } }
          ]
        }
      });

      dbLogger.info('Expired sessions cleaned', { deletedCount: result.count });
    } catch (error) {
      dbLogger.error('Failed to clean expired sessions', { error });
      throw new DatabaseException('Failed to clean expired sessions', error as Error);
    }
  }
}

// Singleton instance
export const userRepository = new UserRepository();