import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

// Database configuration for testing
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/ytb_quiz_test';

// Disable logging during tests to reduce noise
process.env.LOG_LEVEL = 'error';

// Set test-specific configuration
process.env.BCRYPT_ROUNDS = '4'; // Faster for testing
process.env.RATE_LIMIT_WINDOW = '60000'; // 1 minute
process.env.RATE_LIMIT_MAX = '100'; // More lenient for testing

console.log('Test environment setup complete');
console.log(`Database URL: ${process.env.DATABASE_URL}`);
console.log(`Node Environment: ${process.env.NODE_ENV}`);