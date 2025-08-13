import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { appConfig } from '../config/app';
import { TooManyRequestsException } from '../types/errors';
import { securityLogger } from '../utils/logger';

/**
 * Global rate limiting middleware
 */
export const globalRateLimit = rateLimit({
  windowMs: appConfig.rateLimit.global.windowMs,
  max: appConfig.rateLimit.global.max,
  message: {
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Global rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    
    throw new TooManyRequestsException();
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ping';
  }
});

/**
 * Authentication endpoints rate limiting
 */
export const authRateLimit = rateLimit({
  windowMs: appConfig.rateLimit.auth.windowMs,
  max: appConfig.rateLimit.auth.max,
  skipSuccessfulRequests: appConfig.rateLimit.auth.skipSuccessfulRequests,
  skipFailedRequests: appConfig.rateLimit.auth.skipFailedRequests,
  message: {
    error: {
      message: 'Too many authentication attempts from this IP, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    
    throw new TooManyRequestsException('Too many authentication attempts');
  }
});

/**
 * Strict rate limiting for sensitive operations
 */
export const strictRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 attempts per window
  skipSuccessfulRequests: true,
  message: {
    error: {
      message: 'Too many sensitive operations from this IP, please try again later.',
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    
    throw new TooManyRequestsException('Too many sensitive operations');
  }
});

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Permissions Policy
  permittedCrossDomainPolicies: false,
  
  // Hide X-Powered-By header
  hidePoweredBy: true
});

/**
 * Request size limiting middleware
 */
export function requestSizeLimit(maxSize: string = '1mb') {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength > maxSizeBytes) {
      securityLogger.warn('Request size limit exceeded', {
        ip: req.ip,
        path: req.path,
        contentLength,
        maxSize: maxSizeBytes
      });
      
      return res.status(413).json({
        error: {
          message: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE',
          statusCode: 413
        }
      });
    }
    
    next();
  };
}

/**
 * IP whitelist middleware
 */
export function ipWhitelist(allowedIPs: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      securityLogger.warn('Access denied - IP not whitelisted', {
        ip: clientIP,
        path: req.path,
        allowedIPs
      });
      
      return res.status(403).json({
        error: {
          message: 'Access denied',
          code: 'IP_NOT_WHITELISTED',
          statusCode: 403
        }
      });
    }
    
    next();
  };
}

/**
 * Request timeout middleware
 */
export function requestTimeout(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(timeout, () => {
      securityLogger.warn('Request timeout', {
        ip: req.ip,
        path: req.path,
        timeout
      });
      
      if (!res.headersSent) {
        res.status(408).json({
          error: {
            message: 'Request timeout',
            code: 'REQUEST_TIMEOUT',
            statusCode: 408
          }
        });
      }
    });
    
    next();
  };
}

/**
 * Suspicious pattern detection middleware
 */
export function detectSuspiciousPatterns(req: Request, res: Response, next: NextFunction) {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(union|select|insert|update|delete|drop|exec|script)\b)/i,
    
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    
    // Path traversal patterns
    /\.\.\//g,
    /\.\.\\\//g,
    
    // Command injection patterns
    /[;&|`$()]/g
  ];

  const requestString = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      securityLogger.warn('Suspicious pattern detected', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent'],
        pattern: pattern.toString(),
        requestString: requestString.substring(0, 500) // Truncate for logging
      });
      
      return res.status(400).json({
        error: {
          message: 'Invalid request detected',
          code: 'SUSPICIOUS_REQUEST',
          statusCode: 400
        }
      });
    }
  }

  next();
}

/**
 * CORS middleware with security considerations
 */
export function secureCORS() {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowedOrigins = appConfig.corsOrigins;

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin && req.headers.host) {
      // Allow requests from same host (for development)
      if (appConfig.nodeEnv === 'development') {
        res.setHeader('Access-Control-Allow-Origin', `http://${req.headers.host}`);
      }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  };
}

/**
 * Request logging middleware with security context
 */
export function securityRequestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    securityLogger.info('Request processed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
      referer: req.headers.referer
    });
  });

  next();
}

/**
 * Helper function to parse size strings (e.g., '1mb', '500kb')
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)([a-z]*)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const [, number, unit] = match;
  const multiplier = units[unit] || units.b;

  return Math.floor(parseFloat(number) * multiplier);
}