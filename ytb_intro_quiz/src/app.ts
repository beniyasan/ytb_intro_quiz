import express from 'express';
import cors from 'cors';
import { appConfig } from './config/app';
import { connectDatabase } from './config/database';
import routes from './routes';
import { 
  securityHeaders, 
  requestSizeLimit,
  requestTimeout,
  detectSuspiciousPatterns,
  secureCORS,
  securityRequestLogger
} from './middleware/security.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { appLogger } from './utils/logger';

/**
 * Express Application Setup
 */
class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Trust proxy (important for rate limiting and IP detection)
    this.express.set('trust proxy', 1);

    // Security headers
    this.express.use(securityHeaders);

    // CORS configuration
    if (appConfig.corsOrigins.length > 0) {
      this.express.use(cors({
        origin: appConfig.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
      }));
    } else {
      // Use custom CORS middleware for more control
      this.express.use(secureCORS());
    }

    // Request timeout
    this.express.use(requestTimeout(30000)); // 30 seconds

    // Request size limiting
    this.express.use(requestSizeLimit('10mb'));

    // Body parsing middleware
    this.express.use(express.json({ limit: '10mb' }));
    this.express.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security request logging
    this.express.use(securityRequestLogger);

    // Suspicious pattern detection
    this.express.use(detectSuspiciousPatterns);

    // Disable X-Powered-By header (already handled by helmet but extra safety)
    this.express.disable('x-powered-by');
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Root endpoint
    this.express.get('/', (req, res) => {
      res.json({
        message: 'YouTube Quiz API Server',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: appConfig.nodeEnv
      });
    });

    // API routes
    this.express.use('/api', routes);
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler (must be after all routes)
    this.express.use(notFoundHandler);

    // Global error handler (must be last middleware)
    this.express.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      appLogger.info('Database connected successfully');

      // Start server
      const server = this.express.listen(appConfig.port, () => {
        appLogger.info(`Server is running on port ${appConfig.port}`, {
          port: appConfig.port,
          environment: appConfig.nodeEnv,
          pid: process.pid
        });
      });

      // Graceful shutdown handling
      const gracefulShutdown = (signal: string) => {
        appLogger.info(`Received ${signal}, shutting down gracefully...`);
        
        server.close(() => {
          appLogger.info('HTTP server closed');
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          appLogger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      };

      // Listen for shutdown signals
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        appLogger.error('Uncaught Exception:', error);
        process.exit(1);
      });

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        appLogger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
      });

    } catch (error) {
      appLogger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

export default App;