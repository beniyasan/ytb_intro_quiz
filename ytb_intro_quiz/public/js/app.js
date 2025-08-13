/**
 * Main Application Module
 * Initializes the application and coordinates between all modules
 */

class Application {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
        this.eventListeners = new Map();
        this.performanceMarkers = new Map();
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.markPerformance('app_init_start');
            
            // Show loading state
            this.showInitialLoading();
            
            // Check browser compatibility
            if (!this.checkBrowserCompatibility()) {
                return;
            }
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Initialize modules in order
            await this.initializeModules();
            
            // Setup global error handling
            this.setupErrorHandling();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            // Setup service worker (if supported)
            await this.setupServiceWorker();
            
            // Check authentication state
            await this.checkAuthenticationState();
            
            // Setup auto-save and session management
            this.setupSessionManagement();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Setup PWA features
            this.setupPWAFeatures();
            
            // Initialize route handling
            this.initializeRouting();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Hide loading state
            this.hideInitialLoading();
            
            // Dispatch app ready event
            this.dispatchEvent('appReady', { timestamp: Date.now() });
            
            this.markPerformance('app_init_end');
            
            if (window.AppConfig.DEV.DEBUG) {
                console.log('🚀 Application initialized successfully');
                this.logPerformanceMetrics();
            }
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Show initial loading state
     */
    showInitialLoading() {
        const loadingHtml = `
            <div id="app-loading" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 9999;
            ">
                <div style="
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255,255,255,0.3);
                    border-left: 4px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 20px;
                "></div>
                <h2 style="margin: 0 0 10px 0;">JWT Authentication System</h2>
                <p style="margin: 0; opacity: 0.8;">Loading...</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', loadingHtml);
    }

    /**
     * Hide initial loading state
     */
    hideInitialLoading() {
        const loading = document.getElementById('app-loading');
        if (loading) {
            loading.style.opacity = '0';
            loading.style.transition = 'opacity 0.5s ease';
            setTimeout(() => loading.remove(), 500);
        }
    }

    /**
     * Check browser compatibility
     */
    checkBrowserCompatibility() {
        const requiredFeatures = [
            'fetch',
            'Promise',
            'localStorage',
            'sessionStorage',
            'JSON',
            'URLSearchParams'
        ];
        
        const missingFeatures = requiredFeatures.filter(feature => {
            try {
                return !window[feature];
            } catch {
                return true;
            }
        });
        
        if (missingFeatures.length > 0) {
            this.showBrowserCompatibilityError(missingFeatures);
            return false;
        }
        
        return true;
    }

    /**
     * Show browser compatibility error
     */
    showBrowserCompatibilityError(missingFeatures) {
        const errorHtml = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #f8f9fa;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 20px;
                z-index: 10000;
            ">
                <div style="max-width: 500px;">
                    <h1 style="color: #dc3545; margin-bottom: 20px;">
                        ⚠️ Browser Not Supported
                    </h1>
                    <p style="margin-bottom: 20px; color: #666;">
                        Your browser does not support all the features required for this application.
                    </p>
                    <p style="margin-bottom: 20px; color: #666;">
                        <strong>Missing features:</strong> ${missingFeatures.join(', ')}
                    </p>
                    <p style="color: #666;">
                        Please update your browser or use a modern browser such as:
                        <br><br>
                        <strong>Chrome 70+</strong> |
                        <strong>Firefox 65+</strong> |
                        <strong>Safari 12+</strong> |
                        <strong>Edge 79+</strong>
                    </p>
                </div>
            </div>
        `;
        
        document.body.innerHTML = errorHtml;
    }

    /**
     * Initialize modules in proper order
     */
    async initializeModules() {
        const modules = [
            { name: 'config', instance: window.AppConfig, required: true },
            { name: 'validation', instance: window.validationManager, required: true },
            { name: 'api', instance: window.apiClient, required: true },
            { name: 'auth', instance: window.authManager, required: true },
            { name: 'ui', instance: window.uiManager, required: true }
        ];
        
        for (const module of modules) {
            try {
                if (module.instance) {
                    this.modules.set(module.name, module.instance);
                    
                    if (window.AppConfig.DEV.DEBUG) {
                        console.log(`✅ Module '${module.name}' loaded`);
                    }
                } else if (module.required) {
                    throw new Error(`Required module '${module.name}' not found`);
                }
            } catch (error) {
                console.error(`❌ Failed to load module '${module.name}':`, error);
                
                if (module.required) {
                    throw error;
                }
            }
        }
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            if (window.AppConfig.DEV.ERROR_REPORTING) {
                this.reportError('unhandledRejection', event.reason);
            }
            
            // Prevent the default browser behavior
            event.preventDefault();
        });
        
        // Catch uncaught exceptions
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            
            if (window.AppConfig.DEV.ERROR_REPORTING) {
                this.reportError('uncaughtException', event.error);
            }
        });
        
        // Override console.error to catch manual error logs
        if (window.AppConfig.DEV.ERROR_REPORTING) {
            const originalError = console.error;
            console.error = (...args) => {
                originalError.apply(console, args);
                this.reportError('consoleError', args);
            };
        }
    }

    /**
     * Report error for monitoring
     */
    reportError(type, error) {
        // In a real application, this would send errors to a monitoring service
        const errorInfo = {
            type,
            message: error.message || String(error),
            stack: error.stack,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: window.authManager?.user?.id
        };
        
        // Store error locally for debugging
        const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
        errors.push(errorInfo);
        
        // Keep only last 50 errors
        if (errors.length > 50) {
            errors.splice(0, errors.length - 50);
        }
        
        localStorage.setItem('app_errors', JSON.stringify(errors));
        
        if (window.AppConfig.DEV.DEBUG) {
            console.log('📊 Error reported:', errorInfo);
        }
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        if (!window.AppConfig.DEV.PERFORMANCE_MONITORING) {
            return;
        }
        
        // Monitor page load performance
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perf = performance.getEntriesByType('navigation')[0];
                    
                    if (perf) {
                        const metrics = {
                            domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
                            loadComplete: perf.loadEventEnd - perf.loadEventStart,
                            firstPaint: this.getFirstPaint(),
                            timestamp: Date.now()
                        };
                        
                        localStorage.setItem('app_performance', JSON.stringify(metrics));
                        
                        if (window.AppConfig.DEV.DEBUG) {
                            console.log('📈 Performance metrics:', metrics);
                        }
                    }
                }, 1000);
            });
        }
        
        // Monitor API response times
        if (window.apiClient) {
            window.apiClient.addResponseInterceptor(
                (response) => {
                    const requestTime = response.config?.requestTime;
                    if (requestTime) {
                        const responseTime = Date.now() - requestTime;
                        this.recordAPIPerformance(response.config.url, responseTime);
                    }
                    return response;
                },
                (error) => error
            );
        }
    }

    /**
     * Get first paint timing
     */
    getFirstPaint() {
        if ('performance' in window) {
            const paintEntries = performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            return firstPaint ? firstPaint.startTime : null;
        }
        return null;
    }

    /**
     * Record API performance metrics
     */
    recordAPIPerformance(url, responseTime) {
        const key = 'api_performance';
        const metrics = JSON.parse(localStorage.getItem(key) || '{}');
        
        if (!metrics[url]) {
            metrics[url] = { times: [], average: 0, count: 0 };
        }
        
        metrics[url].times.push(responseTime);
        metrics[url].count++;
        
        // Keep only last 10 measurements per endpoint
        if (metrics[url].times.length > 10) {
            metrics[url].times = metrics[url].times.slice(-10);
        }
        
        // Calculate average
        metrics[url].average = metrics[url].times.reduce((a, b) => a + b, 0) / metrics[url].times.length;
        
        localStorage.setItem(key, JSON.stringify(metrics));
    }

    /**
     * Setup service worker
     */
    async setupServiceWorker() {
        if (!('serviceWorker' in navigator) || !window.AppConfig.APP.FEATURES.OFFLINE_SUPPORT) {
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        this.showUpdateAvailable();
                    }
                });
            });
            
            if (window.AppConfig.DEV.DEBUG) {
                console.log('📱 Service worker registered');
            }
        } catch (error) {
            console.warn('Service worker registration failed:', error);
        }
    }

    /**
     * Show update available notification
     */
    showUpdateAvailable() {
        if (window.showToast) {
            window.showToast(
                'A new version is available. Please refresh to update.',
                'info',
                10000
            );
        }
    }

    /**
     * Check authentication state
     */
    async checkAuthenticationState() {
        if (!window.authManager) {
            return;
        }
        
        try {
            // Validate existing session
            if (window.authManager.tokens.accessToken) {
                await window.authManager.validateCurrentSession();
            }
            
            // Update UI based on authentication state
            if (window.updateAuthenticationState) {
                window.updateAuthenticationState(window.authManager.isAuthenticated);
            }
        } catch (error) {
            console.warn('Authentication state check failed:', error);
        }
    }

    /**
     * Setup session management
     */
    setupSessionManagement() {
        // Auto-save form data
        this.setupAutoSave();
        
        // Track user activity for session timeout
        if (window.authManager) {
            window.authManager.trackUserActivity();
        }
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });
        
        // Handle beforeunload for cleanup
        window.addEventListener('beforeunload', (event) => {
            this.onBeforeUnload(event);
        });
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        const autoSaveKey = 'app_autosave';
        const autoSaveInterval = 30000; // 30 seconds
        
        // Save form data periodically
        setInterval(() => {
            const forms = document.querySelectorAll('form[data-autosave]');
            const formData = {};
            
            forms.forEach(form => {
                const formId = form.id || form.dataset.autosave;
                const data = new FormData(form);
                const serialized = {};
                
                for (const [key, value] of data.entries()) {
                    // Don't save sensitive data
                    if (!['password', 'confirmPassword', 'currentPassword', 'newPassword'].includes(key)) {
                        serialized[key] = value;
                    }
                }
                
                if (Object.keys(serialized).length > 0) {
                    formData[formId] = serialized;
                }
            });
            
            if (Object.keys(formData).length > 0) {
                localStorage.setItem(autoSaveKey, JSON.stringify({
                    data: formData,
                    timestamp: Date.now()
                }));
            }
        }, autoSaveInterval);
        
        // Restore form data on page load
        this.restoreAutoSavedData();
    }

    /**
     * Restore auto-saved form data
     */
    restoreAutoSavedData() {
        try {
            const autoSaveKey = 'app_autosave';
            const saved = JSON.parse(localStorage.getItem(autoSaveKey) || '{}');
            
            if (!saved.data || !saved.timestamp) {
                return;
            }
            
            // Check if data is not too old (1 hour)
            const maxAge = 60 * 60 * 1000; // 1 hour
            if (Date.now() - saved.timestamp > maxAge) {
                localStorage.removeItem(autoSaveKey);
                return;
            }
            
            // Restore form data
            Object.entries(saved.data).forEach(([formId, formData]) => {
                const form = document.getElementById(formId) || 
                           document.querySelector(`form[data-autosave="${formId}"]`);
                
                if (form) {
                    Object.entries(formData).forEach(([fieldName, value]) => {
                        const field = form.querySelector(`[name="${fieldName}"]`);
                        if (field && field.type !== 'password') {
                            field.value = value;
                        }
                    });
                }
            });
            
            if (window.AppConfig.DEV.DEBUG && Object.keys(saved.data).length > 0) {
                console.log('🔄 Auto-saved form data restored');
            }
        } catch (error) {
            console.warn('Failed to restore auto-saved data:', error);
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        const shortcuts = {
            'Escape': () => {
                // Close modals, dropdowns, etc.
                if (window.uiManager) {
                    window.uiManager.closeAllDropdowns();
                }
            },
            'F5': (event) => {
                // Custom refresh behavior if needed
                if (window.AppConfig.DEV.DEBUG) {
                    console.log('🔄 Page refresh requested');
                }
            }
        };
        
        document.addEventListener('keydown', (event) => {
            const handler = shortcuts[event.key];
            if (handler && typeof handler === 'function') {
                handler(event);
            }
        });
    }

    /**
     * Setup PWA features
     */
    setupPWAFeatures() {
        // Add to home screen prompt
        window.addEventListener('beforeinstallprompt', (event) => {
            // Prevent the mini-infobar from appearing
            event.preventDefault();
            
            // Store the event for later use
            this.deferredPrompt = event;
            
            // Show custom install prompt
            this.showInstallPrompt();
        });
        
        // Handle app installation
        window.addEventListener('appinstalled', () => {
            console.log('📱 App installed successfully');
            this.deferredPrompt = null;
        });
    }

    /**
     * Show install prompt
     */
    showInstallPrompt() {
        // This would show a custom UI to promote app installation
        if (window.AppConfig.DEV.DEBUG) {
            console.log('📱 App can be installed');
        }
    }

    /**
     * Initialize routing
     */
    initializeRouting() {
        // Handle initial route
        const hash = window.location.hash.substring(1);
        const initialPage = hash || window.AppConfig.APP.DEFAULT_PAGE;
        
        if (window.showPage) {
            setTimeout(() => {
                window.showPage(initialPage);
            }, 100);
        }
    }

    /**
     * Handle page hidden event
     */
    onPageHidden() {
        if (window.AppConfig.DEV.DEBUG) {
            console.log('👁️ Page hidden');
        }
        
        // Pause any ongoing operations
        this.dispatchEvent('pageHidden');
    }

    /**
     * Handle page visible event
     */
    onPageVisible() {
        if (window.AppConfig.DEV.DEBUG) {
            console.log('👁️ Page visible');
        }
        
        // Resume operations and check authentication
        if (window.authManager && window.authManager.isAuthenticated) {
            window.authManager.validateCurrentSession();
        }
        
        this.dispatchEvent('pageVisible');
    }

    /**
     * Handle before unload event
     */
    onBeforeUnload(event) {
        // Cleanup and save state
        this.cleanup();
        
        // Check if there are unsaved changes
        const hasUnsavedChanges = this.checkUnsavedChanges();
        
        if (hasUnsavedChanges) {
            const message = 'You have unsaved changes. Are you sure you want to leave?';
            event.returnValue = message;
            return message;
        }
    }

    /**
     * Check for unsaved changes
     */
    checkUnsavedChanges() {
        const forms = document.querySelectorAll('form[data-check-unsaved]');
        
        for (const form of forms) {
            const formData = new FormData(form);
            let hasData = false;
            
            for (const [key, value] of formData.entries()) {
                if (value && value.toString().trim()) {
                    hasData = true;
                    break;
                }
            }
            
            if (hasData) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Cleanup application resources
     */
    cleanup() {
        // Clear timers
        this.clearAllTimers();
        
        // Close connections
        if (window.authManager) {
            window.authManager.cleanup();
        }
        
        // Clear event listeners
        this.eventListeners.clear();
        
        if (window.AppConfig.DEV.DEBUG) {
            console.log('🧹 Application cleanup completed');
        }
    }

    /**
     * Clear all timers
     */
    clearAllTimers() {
        // This would clear any application-level timers
        // Individual modules should handle their own cleanup
    }

    /**
     * Mark performance milestone
     */
    markPerformance(name) {
        if (window.AppConfig.DEV.PERFORMANCE_MONITORING && 'performance' in window) {
            performance.mark(name);
            this.performanceMarkers.set(name, Date.now());
        }
    }

    /**
     * Log performance metrics
     */
    logPerformanceMetrics() {
        if (!window.AppConfig.DEV.PERFORMANCE_MONITORING) {
            return;
        }
        
        const startTime = this.performanceMarkers.get('app_init_start');
        const endTime = this.performanceMarkers.get('app_init_end');
        
        if (startTime && endTime) {
            const initTime = endTime - startTime;
            console.log(`⚡ Application initialized in ${initTime}ms`);
        }
        
        // Log other performance markers
        console.log('📊 Performance markers:', Object.fromEntries(this.performanceMarkers));
    }

    /**
     * Dispatch custom application event
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`app:${eventName}`, { detail });
        window.dispatchEvent(event);
        
        if (window.AppConfig.DEV.DEBUG) {
            console.log(`📡 Event dispatched: app:${eventName}`, detail);
        }
    }

    /**
     * Add event listener
     */
    addEventListener(eventName, handler) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        
        this.eventListeners.get(eventName).add(handler);
        window.addEventListener(`app:${eventName}`, handler);
    }

    /**
     * Remove event listener
     */
    removeEventListener(eventName, handler) {
        const handlers = this.eventListeners.get(eventName);
        if (handlers) {
            handlers.delete(handler);
            window.removeEventListener(`app:${eventName}`, handler);
        }
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        const errorHtml = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #f8f9fa;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 20px;
                z-index: 10000;
            ">
                <div style="max-width: 500px;">
                    <h1 style="color: #dc3545; margin-bottom: 20px;">
                        ⚠️ Application Error
                    </h1>
                    <p style="margin-bottom: 20px; color: #666;">
                        The application failed to initialize properly.
                    </p>
                    <p style="margin-bottom: 20px; color: #666;">
                        Please refresh the page to try again.
                    </p>
                    <button onclick="window.location.reload()" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    ">
                        Refresh Page
                    </button>
                    ${window.AppConfig.DEV.DEBUG ? `
                        <details style="margin-top: 20px; text-align: left;">
                            <summary style="cursor: pointer; color: #007bff;">Error Details</summary>
                            <pre style="
                                background: #f8f9fa;
                                border: 1px solid #dee2e6;
                                border-radius: 4px;
                                padding: 10px;
                                margin-top: 10px;
                                font-size: 12px;
                                overflow: auto;
                                color: #333;
                            ">${error.stack || error.message || String(error)}</pre>
                        </details>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.innerHTML = errorHtml;
    }

    /**
     * Get application info
     */
    getInfo() {
        return {
            isInitialized: this.isInitialized,
            modules: Array.from(this.modules.keys()),
            eventListeners: Array.from(this.eventListeners.keys()),
            performanceMarkers: Object.fromEntries(this.performanceMarkers)
        };
    }
}

// Initialize the application when script loads
const app = new Application();

// Export application instance globally
window.app = app;

// Export utility functions
window.reportError = app.reportError.bind(app);
window.markPerformance = app.markPerformance.bind(app);

// Debug functions
if (window.AppConfig.DEV.DEBUG) {
    window.debugApp = function() {
        console.log('🔍 Application Debug Info:', app.getInfo());
    };
    
    window.getPerformanceMetrics = function() {
        console.log('📈 Performance Metrics:', Object.fromEntries(app.performanceMarkers));
    };
    
    window.getErrors = function() {
        const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
        console.log('🐛 Stored Errors:', errors);
        return errors;
    };
    
    window.clearErrors = function() {
        localStorage.removeItem('app_errors');
        console.log('🧹 Errors cleared');
    };
    
    window.clearAllAppData = function() {
        const keys = [
            'app_errors',
            'app_performance',
            'api_performance',
            'app_autosave'
        ];
        
        keys.forEach(key => localStorage.removeItem(key));
        console.log('🧹 All application data cleared');
    };
}

// Expose application readiness
window.appReady = new Promise((resolve) => {
    if (app.isInitialized) {
        resolve(app);
    } else {
        window.addEventListener('app:appReady', () => resolve(app));
    }
});

console.log('📱 JWT Authentication Frontend Application Loaded');