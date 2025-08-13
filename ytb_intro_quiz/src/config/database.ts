import { PrismaClient } from '@prisma/client';
import { appConfig, isDevelopment, isTest } from './app';
import { logger } from '../utils/logger';

// Prisma client configuration
const prismaConfig = {
  datasources: {
    db: {
      url: appConfig.database.url
    }
  },
  log: isDevelopment() 
    ? ['query', 'info', 'warn', 'error'] as const
    : ['warn', 'error'] as const
};

// Create Prisma client instance
export const prisma = new PrismaClient(prismaConfig);

// Database connection management
export class DatabaseManager {
  private static instance: DatabaseManager;
  private isConnected = false;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async connect(): Promise<void> {
    try {
      await prisma.$connect();
      this.isConnected = true;
      logger.info('Database connected successfully');
      
      // Test the connection
      await this.healthCheck();
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect();
      this.isConnected = false;
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  isConnectedToDatabase(): boolean {
    return this.isConnected;
  }

  // Transaction helper
  async executeTransaction<T>(
    callback: (tx: Parameters<typeof prisma.$transaction>[0]) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(callback);
  }

  // Migration helpers for development
  async resetDatabase(): Promise<void> {
    if (isTest()) {
      // In test environment, we can reset the database
      const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
      `;

      const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter(name => name !== '_prisma_migrations')
        .map(name => `"public"."${name}"`)
        .join(', ');

      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
        logger.info('Database tables truncated for testing');
      } catch (error) {
        logger.warn('Failed to truncate tables:', error);
      }
    } else {
      throw new Error('Database reset is only allowed in test environment');
    }
  }
}

// Singleton instance
export const dbManager = DatabaseManager.getInstance();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connection...');
  await dbManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connection...');
  await dbManager.disconnect();
  process.exit(0);
});

// Export commonly used Prisma utilities
export { Prisma } from '@prisma/client';

// Custom error handling for Prisma errors
export function isPrismaError(error: any): error is import('@prisma/client').PrismaClientKnownRequestError {
  return error && error.code && error.code.startsWith('P');
}

export function handlePrismaError(error: any): Error {
  if (isPrismaError(error)) {
    switch (error.code) {
      case 'P2002':
        return new Error('Unique constraint violation');
      case 'P2025':
        return new Error('Record not found');
      case 'P2003':
        return new Error('Foreign key constraint violation');
      case 'P2016':
        return new Error('Query interpretation error');
      default:
        return new Error(`Database error: ${error.message}`);
    }
  }
  return error;
}

// Export connection functions
export const connectDatabase = () => database.connect();
export const disconnectDatabase = () => database.disconnect();