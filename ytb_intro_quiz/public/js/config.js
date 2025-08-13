/**
 * Application Configuration
 */

// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:3001',  // Backend server URL
    ENDPOINTS: {
        // Authentication endpoints
        HEALTH: '/api/health',
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        REFRESH: '/api/auth/refresh',
        LOGOUT: '/api/auth/logout',
        ME: '/api/auth/me',
        PROFILE: '/api/auth/profile',
        PASSWORD: '/api/auth/password',
        VALIDATE: '/api/auth/validate'
    },
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
};

// Storage Configuration
const STORAGE_CONFIG = {
    ACCESS_TOKEN_KEY: 'jwt_access_token',
    REFRESH_TOKEN_KEY: 'jwt_refresh_token',
    USER_DATA_KEY: 'user_data',
    REMEMBER_ME_KEY: 'remember_me',
    THEME_KEY: 'app_theme'
};

// UI Configuration
const UI_CONFIG = {
    TOAST_DURATION: 5000, // 5 seconds
    LOADING_DELAY: 300, // Minimum loading time to prevent flashing
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500,
    PAGINATION_SIZE: 10
};

// Validation Configuration
const VALIDATION_CONFIG = {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/
};

// Security Configuration
const SECURITY_CONFIG = {
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity
    CSRF_HEADER: 'X-CSRF-Token',
    CONTENT_SECURITY_POLICY: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        'font-src': ["'self'", 'https://cdnjs.cloudflare.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", API_CONFIG.BASE_URL]
    }
};

// Application State Configuration
const APP_CONFIG = {
    DEFAULT_PAGE: 'home',
    AUTHENTICATED_DEFAULT_PAGE: 'dashboard',
    ROUTES: {
        PUBLIC: ['home', 'login', 'register'],
        PRIVATE: ['dashboard', 'profile'],
        AUTH_REQUIRED: ['dashboard', 'profile']
    },
    FEATURES: {
        DARK_MODE: true,
        REMEMBER_ME: true,
        AUTO_REFRESH: true,
        OFFLINE_SUPPORT: false,
        PUSH_NOTIFICATIONS: false
    }
};

// Error Messages Configuration
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    UNAUTHORIZED: 'Your session has expired. Please log in again.',
    FORBIDDEN: 'You do not have permission to access this resource.',
    NOT_FOUND: 'The requested resource was not found.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    
    // Field-specific errors
    EMAIL_REQUIRED: 'Email address is required.',
    EMAIL_INVALID: 'Please enter a valid email address.',
    PASSWORD_REQUIRED: 'Password is required.',
    PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    PASSWORD_MISMATCH: 'Passwords do not match.',
    USERNAME_REQUIRED: 'Username is required.',
    USERNAME_INVALID: 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens.',
    
    // Authentication errors
    LOGIN_FAILED: 'Invalid email or password.',
    REGISTER_FAILED: 'Registration failed. Please try again.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    TOKEN_INVALID: 'Invalid authentication token.',
    
    // Generic errors
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    MAINTENANCE: 'The system is currently under maintenance. Please try again later.'
};

// Success Messages Configuration
const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Successfully logged in!',
    REGISTER_SUCCESS: 'Account created successfully!',
    LOGOUT_SUCCESS: 'Successfully logged out!',
    PROFILE_UPDATED: 'Profile updated successfully!',
    PASSWORD_CHANGED: 'Password changed successfully!',
    TOKEN_REFRESHED: 'Session refreshed successfully!'
};

// Development Configuration
const DEV_CONFIG = {
    DEBUG: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    MOCK_API: false,
    LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    PERFORMANCE_MONITORING: true,
    ERROR_REPORTING: true
};

// Export configuration objects to global scope
window.AppConfig = {
    API: API_CONFIG,
    STORAGE: STORAGE_CONFIG,
    UI: UI_CONFIG,
    VALIDATION: VALIDATION_CONFIG,
    SECURITY: SECURITY_CONFIG,
    APP: APP_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    DEV: DEV_CONFIG
};

// Utility function to get configuration values
window.getConfig = function(path) {
    const keys = path.split('.');
    let value = window.AppConfig;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            console.warn(`Configuration path "${path}" not found`);
            return undefined;
        }
    }
    
    return value;
};

// Environment-specific configuration override
if (DEV_CONFIG.DEBUG) {
    console.log('🔧 Application Configuration Loaded:', window.AppConfig);
    
    // Add configuration to global scope for debugging
    window.debugConfig = function() {
        console.table(window.AppConfig);
    };
}

// Feature detection and polyfills
(function() {
    // Check for required features
    const requiredFeatures = [
        'localStorage',
        'sessionStorage',
        'fetch',
        'Promise',
        'JSON'
    ];
    
    const missingFeatures = requiredFeatures.filter(feature => {
        try {
            return !window[feature];
        } catch (e) {
            return true;
        }
    });
    
    if (missingFeatures.length > 0) {
        console.error('Missing required features:', missingFeatures);
        
        // Show fallback message for unsupported browsers
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
                background: #f8f9fa;
            ">
                <h1 style="color: #dc3545; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Browser Not Supported
                </h1>
                <p style="margin-bottom: 20px;">
                    Your browser does not support all the features required for this application.
                </p>
                <p style="margin-bottom: 20px;">
                    Missing features: <strong>${missingFeatures.join(', ')}</strong>
                </p>
                <p>
                    Please update your browser or use a modern browser such as:
                    <br><br>
                    <strong>Chrome 70+</strong> |
                    <strong>Firefox 65+</strong> |
                    <strong>Safari 12+</strong> |
                    <strong>Edge 79+</strong>
                </p>
            </div>
        `;
        
        return;
    }
    
    // Add feature flags based on browser capabilities
    window.AppConfig.BROWSER = {
        SUPPORTS_WEBP: false,
        SUPPORTS_SERVICE_WORKER: 'serviceWorker' in navigator,
        SUPPORTS_PUSH_NOTIFICATIONS: 'PushManager' in window,
        SUPPORTS_WEB_CRYPTO: 'crypto' in window && 'subtle' in window.crypto,
        SUPPORTS_CLIPBOARD: 'clipboard' in navigator,
        IS_MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        IS_TOUCH_DEVICE: 'ontouchstart' in window,
        IS_ONLINE: navigator.onLine
    };
    
    // Test for WebP support
    const webp = new Image();
    webp.onload = webp.onerror = function() {
        window.AppConfig.BROWSER.SUPPORTS_WEBP = (webp.height === 2);
    };
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
})();