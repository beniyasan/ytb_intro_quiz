import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { 
  globalRateLimit, 
  authRateLimit, 
  strictRateLimit 
} from '../middleware/security.middleware';
import { validation } from '../middleware/validation.middleware';
import { sanitizeInput } from '../middleware/validation.middleware';

const router = Router();

/**
 * Authentication Routes
 * All routes are prefixed with /auth
 */

// Apply security middleware to all auth routes
router.use(globalRateLimit);
router.use(sanitizeInput);

/**
 * @route   POST /auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  authRateLimit,
  validation.register,
  authController.register.bind(authController)
);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimit,
  validation.login,
  authController.login.bind(authController)
);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public (but requires valid refresh token)
 */
router.post(
  '/refresh',
  authRateLimit,
  validation.refreshToken,
  authController.refresh.bind(authController)
);

/**
 * @route   POST /auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout.bind(authController)
);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  authController.getProfile.bind(authController)
);

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  validation.updateProfile,
  authController.updateProfile.bind(authController)
);

/**
 * @route   PUT /auth/password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/password',
  authenticate,
  strictRateLimit, // More restrictive rate limiting for password changes
  validation.changePassword,
  authController.changePassword.bind(authController)
);

/**
 * @route   GET /auth/validate
 * @desc    Validate access token
 * @access  Private
 */
router.get(
  '/validate',
  authenticate,
  authController.validateToken.bind(authController)
);

export default router;