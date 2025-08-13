/**
 * Authentication Module
 * Handles JWT token management, user authentication, and session management
 */

class AuthManager {
    constructor() {
        this.tokens = {
            accessToken: null,
            refreshToken: null
        };
        this.user = null;
        this.refreshTimer = null;
        this.sessionTimer = null;
        this.isAuthenticated = false;
        
        // Bind methods to preserve context
        this.refreshTokens = this.refreshTokens.bind(this);
        this.handleSessionTimeout = this.handleSessionTimeout.bind(this);
        this.handleStorageChange = this.handleStorageChange.bind(this);
        
        this.init();
    }

    /**
     * Initialize authentication manager
     */
    init() {
        this.loadTokensFromStorage();
        this.setupEventListeners();
        this.setupSessionManagement();
        
        if (this.tokens.accessToken) {
            this.validateCurrentSession();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for storage changes (multi-tab support)
        window.addEventListener('storage', this.handleStorageChange);
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            if (this.tokens.accessToken) {
                this.validateCurrentSession();
            }
        });
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.tokens.accessToken) {
                this.validateCurrentSession();
            }
        });
        
        // Listen for beforeunload to cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Setup session management
     */
    setupSessionManagement() {
        if (this.tokens.accessToken) {
            this.scheduleTokenRefresh();
            this.resetSessionTimeout();
        }
    }

    /**
     * Load tokens from storage
     */
    loadTokensFromStorage() {
        try {
            const accessToken = localStorage.getItem(window.AppConfig.STORAGE.ACCESS_TOKEN_KEY) ||
                              sessionStorage.getItem(window.AppConfig.STORAGE.ACCESS_TOKEN_KEY);
            const refreshToken = localStorage.getItem(window.AppConfig.STORAGE.REFRESH_TOKEN_KEY) ||
                               sessionStorage.getItem(window.AppConfig.STORAGE.REFRESH_TOKEN_KEY);
            const userData = localStorage.getItem(window.AppConfig.STORAGE.USER_DATA_KEY) ||
                           sessionStorage.getItem(window.AppConfig.STORAGE.USER_DATA_KEY);

            if (accessToken && refreshToken) {
                this.tokens = { accessToken, refreshToken };
                this.user = userData ? JSON.parse(userData) : null;
                this.isAuthenticated = true;
                
                if (window.AppConfig.DEV.DEBUG) {
                    console.log('🔑 Tokens loaded from storage');
                }
            }
        } catch (error) {
            console.error('Error loading tokens from storage:', error);
            this.clearStoredTokens();
        }
    }

    /**
     * Store tokens in storage
     */
    storeTokens(tokens, userData = null, rememberMe = false) {
        try {
            const storage = rememberMe ? localStorage : sessionStorage;
            
            storage.setItem(window.AppConfig.STORAGE.ACCESS_TOKEN_KEY, tokens.accessToken);
            storage.setItem(window.AppConfig.STORAGE.REFRESH_TOKEN_KEY, tokens.refreshToken);
            
            if (userData) {
                storage.setItem(window.AppConfig.STORAGE.USER_DATA_KEY, JSON.stringify(userData));
            }
            
            if (rememberMe) {
                localStorage.setItem(window.AppConfig.STORAGE.REMEMBER_ME_KEY, 'true');
            }
            
            this.tokens = tokens;
            this.user = userData;
            this.isAuthenticated = true;
            
            if (window.AppConfig.DEV.DEBUG) {
                console.log('🔑 Tokens stored successfully');
            }
        } catch (error) {
            console.error('Error storing tokens:', error);
            throw new Error('Failed to store authentication data');
        }
    }

    /**
     * Clear stored tokens
     */
    clearStoredTokens() {
        try {
            // Clear from both storage types
            [localStorage, sessionStorage].forEach(storage => {
                storage.removeItem(window.AppConfig.STORAGE.ACCESS_TOKEN_KEY);
                storage.removeItem(window.AppConfig.STORAGE.REFRESH_TOKEN_KEY);
                storage.removeItem(window.AppConfig.STORAGE.USER_DATA_KEY);
                storage.removeItem(window.AppConfig.STORAGE.REMEMBER_ME_KEY);
            });
            
            this.tokens = { accessToken: null, refreshToken: null };
            this.user = null;
            this.isAuthenticated = false;
            
            if (window.AppConfig.DEV.DEBUG) {
                console.log('🔑 Tokens cleared from storage');
            }
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    }

    /**
     * Get authorization header
     */
    getAuthHeaders() {
        if (!this.tokens.accessToken) {
            return {};
        }
        
        return {
            'Authorization': `Bearer ${this.tokens.accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Check if token is expired or about to expire
     */
    isTokenExpiringSoon() {
        if (!this.tokens.accessToken) {
            return true;
        }
        
        try {
            const payload = JSON.parse(atob(this.tokens.accessToken.split('.')[1]));
            const expiry = payload.exp * 1000;
            const now = Date.now();
            const threshold = window.AppConfig.SECURITY.TOKEN_REFRESH_THRESHOLD;
            
            return (expiry - now) <= threshold;
        } catch (error) {
            console.error('Error checking token expiry:', error);
            return true;
        }
    }

    /**
     * Schedule automatic token refresh
     */
    scheduleTokenRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        if (!this.tokens.accessToken) {
            return;
        }
        
        try {
            const payload = JSON.parse(atob(this.tokens.accessToken.split('.')[1]));
            const expiry = payload.exp * 1000;
            const now = Date.now();
            const refreshTime = expiry - now - window.AppConfig.SECURITY.TOKEN_REFRESH_THRESHOLD;
            
            if (refreshTime > 0) {
                this.refreshTimer = setTimeout(() => {
                    this.refreshTokens();
                }, refreshTime);
                
                if (window.AppConfig.DEV.DEBUG) {
                    console.log(`🔄 Token refresh scheduled in ${Math.round(refreshTime / 1000)} seconds`);
                }
            } else {
                // Token is already expired or about to expire
                this.refreshTokens();
            }
        } catch (error) {
            console.error('Error scheduling token refresh:', error);
            this.logout();
        }
    }

    /**
     * Reset session timeout
     */
    resetSessionTimeout() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        this.sessionTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, window.AppConfig.SECURITY.SESSION_TIMEOUT);
    }

    /**
     * Handle session timeout
     */
    handleSessionTimeout() {
        console.warn('Session timed out due to inactivity');
        this.logout();
        showToast('Your session has expired due to inactivity. Please log in again.', 'warning');
    }

    /**
     * Handle storage changes (multi-tab support)
     */
    handleStorageChange(event) {
        if (event.key === window.AppConfig.STORAGE.ACCESS_TOKEN_KEY) {
            if (event.newValue) {
                // Tokens updated in another tab
                this.loadTokensFromStorage();
                this.setupSessionManagement();
                
                // Update UI if needed
                if (window.updateAuthenticationState) {
                    window.updateAuthenticationState(this.isAuthenticated);
                }
            } else {
                // Tokens cleared in another tab
                this.logout(false); // Don't call API, just clear local state
            }
        }
    }

    /**
     * Login user
     */
    async login(email, password, rememberMe = false) {
        try {
            showLoading(true);
            
            const response = await fetch(`${window.AppConfig.API.BASE_URL}${window.AppConfig.API.ENDPOINTS.LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || window.AppConfig.ERROR_MESSAGES.LOGIN_FAILED);
            }
            
            if (!data.data || !data.data.tokens) {
                throw new Error('Invalid response format from server');
            }
            
            // Store tokens and user data
            this.storeTokens(data.data.tokens, data.data.user, rememberMe);
            
            // Setup session management
            this.setupSessionManagement();
            
            // Update authentication state
            if (window.updateAuthenticationState) {
                window.updateAuthenticationState(true);
            }
            
            // Track user activity
            this.trackUserActivity();
            
            showToast(window.AppConfig.SUCCESS_MESSAGES.LOGIN_SUCCESS, 'success');
            
            if (window.AppConfig.DEV.DEBUG) {
                console.log('✅ Login successful:', data.data.user);
            }
            
            return {
                success: true,
                user: data.data.user,
                tokens: data.data.tokens
            };
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Clear any partially stored data
            this.clearStoredTokens();
            
            throw error;
        } finally {
            showLoading(false);
        }
    }

    /**
     * Register user
     */
    async register(userData) {
        try {
            showLoading(true);
            
            const response = await fetch(`${window.AppConfig.API.BASE_URL}${window.AppConfig.API.ENDPOINTS.REGISTER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || window.AppConfig.ERROR_MESSAGES.REGISTER_FAILED);
            }
            
            showToast(window.AppConfig.SUCCESS_MESSAGES.REGISTER_SUCCESS, 'success');
            
            if (window.AppConfig.DEV.DEBUG) {
                console.log('✅ Registration successful:', data.data);
            }
            
            return {
                success: true,
                user: data.data
            };
            
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    /**
     * Refresh tokens
     */
    async refreshTokens() {
        if (!this.tokens.refreshToken) {
            console.warn('No refresh token available');
            this.logout();
            return;
        }
        
        try {
            const response = await fetch(`${window.AppConfig.API.BASE_URL}${window.AppConfig.API.ENDPOINTS.REFRESH}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.tokens.refreshToken })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            if (!data.data || !data.data.tokens) {
                throw new Error('Invalid refresh response format');
            }
            
            // Update stored tokens
            const rememberMe = localStorage.getItem(window.AppConfig.STORAGE.REMEMBER_ME_KEY) === 'true';
            this.storeTokens(data.data.tokens, this.user, rememberMe);
            
            // Schedule next refresh
            this.scheduleTokenRefresh();
            
            if (window.AppConfig.DEV.DEBUG) {
                console.log('🔄 Tokens refreshed successfully');
            }
            
            return data.data.tokens;
            
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            throw error;
        }
    }

    /**
     * Validate current session
     */
    async validateCurrentSession() {
        if (!this.tokens.accessToken) {
            return false;
        }
        
        try {
            const response = await fetch(`${window.AppConfig.API.BASE_URL}${window.AppConfig.API.ENDPOINTS.VALIDATE}`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update user data if returned
                if (data.data) {
                    this.user = data.data;
                    const rememberMe = localStorage.getItem(window.AppConfig.STORAGE.REMEMBER_ME_KEY) === 'true';
                    const storage = rememberMe ? localStorage : sessionStorage;
                    storage.setItem(window.AppConfig.STORAGE.USER_DATA_KEY, JSON.stringify(data.data));
                }
                
                this.isAuthenticated = true;
                
                if (window.AppConfig.DEV.DEBUG) {
                    console.log('✅ Session validated');
                }
                
                return true;
            } else {
                throw new Error('Session validation failed');
            }
            
        } catch (error) {
            console.error('Session validation error:', error);
            
            // Try to refresh tokens if validation fails
            if (this.tokens.refreshToken) {
                try {
                    await this.refreshTokens();
                    return true;
                } catch (refreshError) {
                    console.error('Token refresh during validation failed:', refreshError);
                }
            }
            
            this.logout();
            return false;
        }
    }

    /**
     * Logout user
     */
    async logout(callAPI = true) {
        try {
            if (callAPI && this.tokens.accessToken) {
                // Call logout endpoint to invalidate tokens on server
                await fetch(`${window.AppConfig.API.BASE_URL}${window.AppConfig.API.ENDPOINTS.LOGOUT}`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ refreshToken: this.tokens.refreshToken })
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        }
        
        // Clear local state
        this.cleanup();
        this.clearStoredTokens();
        
        // Update authentication state
        if (window.updateAuthenticationState) {
            window.updateAuthenticationState(false);
        }
        
        if (callAPI) {
            showToast(window.AppConfig.SUCCESS_MESSAGES.LOGOUT_SUCCESS, 'success');
        }
        
        // Redirect to login page
        if (window.showPage) {
            window.showPage('login');
        }
        
        if (window.AppConfig.DEV.DEBUG) {
            console.log('👋 Logged out successfully');
        }
    }

    /**
     * Get user profile
     */
    async getUserProfile() {
        if (!this.isAuthenticated || !this.tokens.accessToken) {
            throw new Error('User not authenticated');
        }
        
        try {
            const response = await fetch(`${window.AppConfig.API.BASE_URL}${window.AppConfig.API.ENDPOINTS.ME}`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error(window.AppConfig.ERROR_MESSAGES.UNAUTHORIZED);
                }
                throw new Error('Failed to fetch user profile');
            }
            
            const data = await response.json();
            this.user = data.data;
            
            // Update stored user data
            const rememberMe = localStorage.getItem(window.AppConfig.STORAGE.REMEMBER_ME_KEY) === 'true';
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem(window.AppConfig.STORAGE.USER_DATA_KEY, JSON.stringify(data.data));
            
            return data.data;
            
        } catch (error) {
            console.error('Get user profile error:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(profileData) {
        if (!this.isAuthenticated || !this.tokens.accessToken) {
            throw new Error('User not authenticated');
        }
        
        try {
            showLoading(true);
            
            const response = await fetch(`${window.AppConfig.API.BASE_URL}${window.AppConfig.API.ENDPOINTS.PROFILE}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(profileData)
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error(window.AppConfig.ERROR_MESSAGES.UNAUTHORIZED);
                }
                const data = await response.json();
                throw new Error(data.message || 'Failed to update profile');
            }
            
            const data = await response.json();
            this.user = data.data;
            
            // Update stored user data
            const rememberMe = localStorage.getItem(window.AppConfig.STORAGE.REMEMBER_ME_KEY) === 'true';
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem(window.AppConfig.STORAGE.USER_DATA_KEY, JSON.stringify(data.data));
            
            showToast(window.AppConfig.SUCCESS_MESSAGES.PROFILE_UPDATED, 'success');
            
            return data.data;
            
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    /**
     * Change user password
     */
    async changePassword(passwordData) {
        if (!this.isAuthenticated || !this.tokens.accessToken) {
            throw new Error('User not authenticated');
        }
        
        try {
            showLoading(true);
            
            const response = await fetch(`${window.AppConfig.API.BASE_URL}${window.AppConfig.API.ENDPOINTS.PASSWORD}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(passwordData)
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error(window.AppConfig.ERROR_MESSAGES.UNAUTHORIZED);
                }
                const data = await response.json();
                throw new Error(data.message || 'Failed to change password');
            }
            
            showToast(window.AppConfig.SUCCESS_MESSAGES.PASSWORD_CHANGED, 'success');
            
            return true;
            
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    /**
     * Track user activity to reset session timeout
     */
    trackUserActivity() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        const resetTimeout = () => {
            if (this.isAuthenticated) {
                this.resetSessionTimeout();
            }
        };
        
        events.forEach(event => {
            document.addEventListener(event, resetTimeout, { passive: true });
        });
    }

    /**
     * Cleanup timers and event listeners
     */
    cleanup() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    /**
     * Get authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.user,
            hasValidToken: !!this.tokens.accessToken,
            tokenExpiringSoon: this.isTokenExpiringSoon()
        };
    }
}

// Create global authentication manager instance
window.authManager = new AuthManager();

// Export functions for global access
window.loginUser = window.authManager.login.bind(window.authManager);
window.registerUser = window.authManager.register.bind(window.authManager);
window.logoutUser = window.authManager.logout.bind(window.authManager);
window.getCurrentUser = window.authManager.getUserProfile.bind(window.authManager);
window.updateUserProfile = window.authManager.updateUserProfile.bind(window.authManager);
window.changeUserPassword = window.authManager.changePassword.bind(window.authManager);
window.refreshTokenManual = window.authManager.refreshTokens.bind(window.authManager);
window.getAuthHeaders = window.authManager.getAuthHeaders.bind(window.authManager);
window.isAuthenticated = () => window.authManager.isAuthenticated;

// Debug functions
if (window.AppConfig.DEV.DEBUG) {
    window.debugAuth = function() {
        console.log('🔍 Authentication Debug Info:', {
            isAuthenticated: window.authManager.isAuthenticated,
            user: window.authManager.user,
            tokens: {
                hasAccessToken: !!window.authManager.tokens.accessToken,
                hasRefreshToken: !!window.authManager.tokens.refreshToken,
                accessTokenExpiringSoon: window.authManager.isTokenExpiringSoon()
            }
        });
    };
}