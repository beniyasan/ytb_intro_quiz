import { prisma } from '../config/database';
import { AuditLog } from '@prisma/client';
import { AuditLogEntry } from '../types/auth';
import { DatabaseException } from '../types/errors';
import { dbLogger } from '../utils/logger';

/**
 * Audit Log Repository for security monitoring
 */
export class AuditRepository {
  /**
   * Create audit log entry
   */
  async createAuditLog(entry: AuditLogEntry): Promise<AuditLog> {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          result: entry.result,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent
        }
      });

      return auditLog;
    } catch (error) {
      dbLogger.error('Failed to create audit log', { error, entry });
      throw new DatabaseException('Failed to create audit log', error as Error);
    }
  }

  /**
   * Find audit logs by user
   */
  async findByUser(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      result?: 'success' | 'failure';
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<AuditLog[]> {
    try {
      const where: any = { userId };

      if (options?.action) {
        where.action = options.action;
      }

      if (options?.result) {
        where.result = options.result;
      }

      if (options?.fromDate || options?.toDate) {
        where.createdAt = {};
        if (options.fromDate) {
          where.createdAt.gte = options.fromDate;
        }
        if (options.toDate) {
          where.createdAt.lte = options.toDate;
        }
      }

      return await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0
      });
    } catch (error) {
      dbLogger.error('Failed to find audit logs by user', { error, userId, options });
      throw new DatabaseException('Failed to find audit logs by user', error as Error);
    }
  }

  /**
   * Find recent failed login attempts
   */
  async findRecentFailedLogins(
    ipAddress?: string,
    timeWindow: Date = new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
  ): Promise<AuditLog[]> {
    try {
      const where: any = {
        action: 'login',
        result: 'failure',
        createdAt: {
          gte: timeWindow
        }
      };

      if (ipAddress) {
        where.ipAddress = ipAddress;
      }

      return await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      dbLogger.error('Failed to find recent failed logins', { error, ipAddress });
      throw new DatabaseException('Failed to find recent failed logins', error as Error);
    }
  }

  /**
   * Find suspicious activity patterns
   */
  async findSuspiciousActivity(options: {
    userId?: string;
    ipAddress?: string;
    timeWindow: Date;
    minOccurrences?: number;
  }): Promise<{
    action: string;
    count: number;
    ipAddress?: string;
    userId?: string;
  }[]> {
    try {
      const where: any = {
        createdAt: {
          gte: options.timeWindow
        }
      };

      if (options.userId) {
        where.userId = options.userId;
      }

      if (options.ipAddress) {
        where.ipAddress = options.ipAddress;
      }

      // Use raw query for aggregation
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          action,
          COUNT(*) as count,
          ip_address as "ipAddress",
          user_id as "userId"
        FROM audit_logs
        WHERE created_at >= ${options.timeWindow}
          ${options.userId ? `AND user_id = ${options.userId}` : ''}
          ${options.ipAddress ? `AND ip_address = ${options.ipAddress}` : ''}
        GROUP BY action, ip_address, user_id
        HAVING COUNT(*) >= ${options.minOccurrences || 5}
        ORDER BY count DESC
      `;

      return results.map(result => ({
        action: result.action,
        count: parseInt(result.count),
        ipAddress: result.ipAddress,
        userId: result.userId
      }));
    } catch (error) {
      dbLogger.error('Failed to find suspicious activity', { error, options });
      throw new DatabaseException('Failed to find suspicious activity', error as Error);
    }
  }

  /**
   * Count audit logs by criteria
   */
  async countAuditLogs(criteria: {
    userId?: string;
    action?: string;
    result?: 'success' | 'failure';
    ipAddress?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<number> {
    try {
      const where: any = {};

      if (criteria.userId) {
        where.userId = criteria.userId;
      }

      if (criteria.action) {
        where.action = criteria.action;
      }

      if (criteria.result) {
        where.result = criteria.result;
      }

      if (criteria.ipAddress) {
        where.ipAddress = criteria.ipAddress;
      }

      if (criteria.fromDate || criteria.toDate) {
        where.createdAt = {};
        if (criteria.fromDate) {
          where.createdAt.gte = criteria.fromDate;
        }
        if (criteria.toDate) {
          where.createdAt.lte = criteria.toDate;
        }
      }

      return await prisma.auditLog.count({ where });
    } catch (error) {
      dbLogger.error('Failed to count audit logs', { error, criteria });
      throw new DatabaseException('Failed to count audit logs', error as Error);
    }
  }

  /**
   * Get audit log statistics
   */
  async getAuditStatistics(timeWindow: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)): Promise<{
    totalLogs: number;
    successfulActions: number;
    failedActions: number;
    uniqueUsers: number;
    uniqueIPs: number;
    topActions: { action: string; count: number }[];
  }> {
    try {
      // Get basic counts
      const [totalLogs, successfulActions, failedActions] = await Promise.all([
        prisma.auditLog.count({
          where: { createdAt: { gte: timeWindow } }
        }),
        prisma.auditLog.count({
          where: { 
            createdAt: { gte: timeWindow },
            result: 'success'
          }
        }),
        prisma.auditLog.count({
          where: { 
            createdAt: { gte: timeWindow },
            result: 'failure'
          }
        })
      ]);

      // Get unique counts and top actions
      const [uniqueUsers, uniqueIPs, topActions] = await Promise.all([
        prisma.auditLog.findMany({
          where: { 
            createdAt: { gte: timeWindow },
            userId: { not: null }
          },
          select: { userId: true },
          distinct: ['userId']
        }).then(results => results.length),
        
        prisma.auditLog.findMany({
          where: { 
            createdAt: { gte: timeWindow },
            ipAddress: { not: null }
          },
          select: { ipAddress: true },
          distinct: ['ipAddress']
        }).then(results => results.length),

        prisma.$queryRaw<any[]>`
          SELECT action, COUNT(*) as count
          FROM audit_logs
          WHERE created_at >= ${timeWindow}
          GROUP BY action
          ORDER BY count DESC
          LIMIT 10
        `.then(results => 
          results.map(r => ({
            action: r.action,
            count: parseInt(r.count)
          }))
        )
      ]);

      return {
        totalLogs,
        successfulActions,
        failedActions,
        uniqueUsers,
        uniqueIPs,
        topActions
      };
    } catch (error) {
      dbLogger.error('Failed to get audit statistics', { error });
      throw new DatabaseException('Failed to get audit statistics', error as Error);
    }
  }

  /**
   * Clean old audit logs (data retention policy)
   */
  async cleanOldAuditLogs(olderThan: Date): Promise<number> {
    try {
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: olderThan
          }
        }
      });

      dbLogger.info('Old audit logs cleaned', { deletedCount: result.count, olderThan });
      return result.count;
    } catch (error) {
      dbLogger.error('Failed to clean old audit logs', { error, olderThan });
      throw new DatabaseException('Failed to clean old audit logs', error as Error);
    }
  }
}

// Singleton instance
export const auditRepository = new AuditRepository();