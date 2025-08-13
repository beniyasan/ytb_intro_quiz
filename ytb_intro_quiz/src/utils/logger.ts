import winston from 'winston';
import { appConfig, isDevelopment } from '../config/app';

// Custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Custom colors for log levels
const logColors = {
  error: 'red',
  warn: 'yellow', 
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Log format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}` +
    (info.splat !== undefined ? `${info.splat}` : '') +
    (info.stack !== undefined ? `\n${info.stack}` : '')
  ),
);

// Log format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport
transports.push(
  new winston.transports.Console({
    format: isDevelopment() ? developmentFormat : productionFormat,
  })
);

// File transport for production
if (!isDevelopment()) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: appConfig.logging.file,
      format: productionFormat,
    })
  );
}

// Create Winston logger
export const logger = winston.createLogger({
  level: appConfig.logging.level,
  levels: logLevels,
  transports,
  exitOnError: false,
});

// HTTP request logger middleware compatible format
export const httpLogger = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Security event logger
export const securityLogger = {
  info: (message: string, meta?: any) => {
    logger.info(`[SECURITY] ${message}`, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(`[SECURITY] ${message}`, meta);
  },
  error: (message: string, meta?: any) => {
    logger.error(`[SECURITY] ${message}`, meta);
  },
};

// Database operation logger
export const dbLogger = {
  info: (message: string, meta?: any) => {
    logger.info(`[DATABASE] ${message}`, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(`[DATABASE] ${message}`, meta);
  },
  error: (message: string, meta?: any) => {
    logger.error(`[DATABASE] ${message}`, meta);
  },
};

// Authentication logger
export const authLogger = {
  info: (message: string, meta?: any) => {
    logger.info(`[AUTH] ${message}`, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(`[AUTH] ${message}`, meta);
  },
  error: (message: string, meta?: any) => {
    logger.error(`[AUTH] ${message}`, meta);
  },
};

// Utility function for structured logging
export const logWithContext = (
  level: string,
  message: string,
  context: Record<string, any> = {}
) => {
  // Sanitize sensitive data
  const sanitizedContext = sanitizeLogData(context);
  
  (logger as any)[level](message, sanitizedContext);
};

// Sanitize sensitive information from logs
function sanitizeLogData(data: any): any {
  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'secret',
    'key',
    'hash'
  ];

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const [key, value] of Object.entries(sanitized)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    }
  }

  return sanitized;
}

// Error logging with stack trace
export const logError = (error: Error, context?: Record<string, any>) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  };

  logger.error('Application error occurred', sanitizeLogData(errorInfo));
};

// Performance measurement logger
export const performanceLogger = {
  start: (label: string) => {
    console.time(label);
  },
  end: (label: string, meta?: any) => {
    console.timeEnd(label);
    logger.debug(`[PERFORMANCE] ${label} completed`, meta);
  }
};

// Export the main logger as appLogger for compatibility
export const appLogger = logger;