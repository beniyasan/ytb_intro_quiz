import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

/**
 * API Routes
 * All routes are prefixed with /api
 */

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ping endpoint (for basic connectivity testing)
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'pong' });
});

// Authentication routes
router.use('/auth', authRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    name: 'YouTube Quiz API',
    version: '1.0.0',
    description: 'API for YouTube Quiz application with JWT authentication',
    endpoints: {
      health: '/api/health',
      ping: '/api/ping',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/password',
        validate: 'GET /api/auth/validate'
      }
    }
  });
});

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'API endpoint not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      path: req.originalUrl
    }
  });
});

export default router;