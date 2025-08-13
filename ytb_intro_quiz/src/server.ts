import 'dotenv/config';
import App from './app';
import { appLogger } from './utils/logger';

/**
 * Server Entry Point
 */
async function bootstrap() {
  try {
    appLogger.info('Starting YouTube Quiz API Server...');
    
    const app = new App();
    await app.start();
  } catch (error) {
    appLogger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
bootstrap();