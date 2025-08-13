import { config } from 'dotenv';
import { AppConfig } from '../types/auth';

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
  'SESSION_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Application configuration
export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'yiq-api',
    audience: 'yiq-client'
  },
  
  rateLimit: {
    global: {
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.GLOBAL_RATE_LIMIT || '100', 10),
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.AUTH_RATE_LIMIT || '5', 10),
      skipSuccessfulRequests: true,
      skipFailedRequests: false
    }
  },
  
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    historyCount: parseInt(process.env.PASSWORD_HISTORY_COUNT || '5', 10)
  },
  
  database: {
    url: process.env.DATABASE_URL!
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY!
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  }
};

// Configuration validation
export function validateConfig(): void {
  // Validate JWT secrets length
  if (appConfig.jwt.accessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
  }
  
  if (appConfig.jwt.refreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
  
  // Validate encryption key
  if (appConfig.encryption.key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)');
  }
  
  // Validate bcrypt rounds
  if (appConfig.password.bcryptRounds < 10 || appConfig.password.bcryptRounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be between 10 and 15');
  }
  
  // Validate port range
  if (appConfig.port < 1 || appConfig.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }
}

// Development mode check
export const isDevelopment = () => appConfig.nodeEnv === 'development';
export const isProduction = () => appConfig.nodeEnv === 'production';
export const isTest = () => appConfig.nodeEnv === 'test';