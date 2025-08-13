/**
 * API Module
 * Handles all HTTP requests and API communications
 */

class APIClient {
    constructor() {
        this.baseURL = window.AppConfig.API.BASE_URL;
        this.timeout = window.AppConfig.API.TIMEOUT;
        this.retryAttempts = window.AppConfig.API.RETRY_ATTEMPTS;
        this.retryDelay = window.AppConfig.API.RETRY_DELAY;
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        this.setupDefaultInterceptors();
    }

    /**
     * Setup default request and response interceptors
     */
    setupDefaultInterceptors() {
        // Request interceptor for authentication
        this.addRequestInterceptor(async (config) => {
            // Add authentication headers if available
            if (window.authManager && window.authManager.isAuthenticated) {
                const authHeaders = window.authManager.getAuthHeaders();
                config.headers = { ...config.headers, ...authHeaders };
            }
            
            // Add CSRF token if available
            const csrfToken = document.querySelector('meta[name="csrf-token"]');
            if (csrfToken) {
                config.headers[window.AppConfig.SECURITY.CSRF_HEADER] = csrfToken.getAttribute('content');
            }
            
            // Add request timestamp
            config.headers['X-Request-ID'] = this.generateRequestId();
            config.headers['X-Timestamp'] = Date.now().toString();
            
            return config;
        });

        // Response interceptor for error handling
        this.addResponseInterceptor(
            (response) => response,
            async (error) => {
                // Handle 401 Unauthorized
                if (error.status === 401 && window.authManager) {
                    console.warn('🔒 Unauthorized request, attempting token refresh...');
                    
                    try {
                        await window.authManager.refreshTokens();
                        // Retry the original request
                        return this.retryRequest(error.config);
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        window.authManager.logout();
                        throw error;
                    }
                }
                
                // Handle network errors
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    error.message = window.AppConfig.ERROR_MESSAGES.NETWORK_ERROR;
                }
                
                // Handle server errors
                if (error.status >= 500) {
                    error.message = window.AppConfig.ERROR_MESSAGES.SERVER_ERROR;
                }
                
                throw error;
            }
        );
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(successHandler, errorHandler) {
        this.responseInterceptors.push({ success: successHandler, error: errorHandler });
    }

    /**
     * Apply request interceptors
     */
    async applyRequestInterceptors(config) {
        let finalConfig = config;
        
        for (const interceptor of this.requestInterceptors) {
            try {
                finalConfig = await interceptor(finalConfig);
            } catch (error) {
                console.error('Request interceptor error:', error);
            }
        }
        
        return finalConfig;
    }

    /**
     * Apply response interceptors
     */
    async applyResponseInterceptors(response, error = null) {
        let finalResponse = response;
        let finalError = error;
        
        for (const interceptor of this.responseInterceptors) {
            try {
                if (error && interceptor.error) {
                    finalError = await interceptor.error(error);
                } else if (!error && interceptor.success) {
                    finalResponse = await interceptor.success(response);
                }
            } catch (interceptorError) {
                console.error('Response interceptor error:', interceptorError);
                if (!finalError) {
                    finalError = interceptorError;
                }
            }
        }
        
        if (finalError) {
            throw finalError;
        }
        
        return finalResponse;
    }

    /**
     * Create fetch request with timeout
     */
    createFetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const fetchPromise = fetch(url, {
            ...options,
            signal: controller.signal
        }).finally(() => {
            clearTimeout(timeoutId);
        });
        
        return fetchPromise;
    }

    /**
     * Retry request with exponential backoff
     */
    async retryRequest(config, attempt = 1) {
        try {
            return await this.request(config);
        } catch (error) {
            if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                console.warn(`🔄 Retrying request (attempt ${attempt + 1}/${this.retryAttempts}) in ${delay}ms...`);
                
                await this.sleep(delay);
                return this.retryRequest(config, attempt + 1);
            }
            
            throw error;
        }
    }

    /**
     * Check if request should be retried
     */
    shouldRetry(error) {
        // Don't retry client errors (4xx) except for 408, 429
        if (error.status >= 400 && error.status < 500) {
            return error.status === 408 || error.status === 429;
        }
        
        // Retry server errors (5xx) and network errors
        return error.status >= 500 || error.name === 'TypeError';
    }

    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Main request method
     */
    async request(config) {
        // Apply request interceptors
        const finalConfig = await this.applyRequestInterceptors({
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            ...config
        });
        
        const url = finalConfig.url.startsWith('http') ? finalConfig.url : `${this.baseURL}${finalConfig.url}`;
        
        try {
            if (window.AppConfig.DEV.DEBUG) {
                console.log(`🌐 ${finalConfig.method} ${url}`, finalConfig);
            }
            
            const response = await this.createFetchWithTimeout(url, {
                method: finalConfig.method,
                headers: finalConfig.headers,
                body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined
            });
            
            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            if (!response.ok) {
                const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.statusText = response.statusText;
                error.data = data;
                error.config = finalConfig;
                
                return await this.applyResponseInterceptors(null, error);
            }
            
            const result = {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                config: finalConfig
            };
            
            return await this.applyResponseInterceptors(result);
            
        } catch (error) {
            // Handle network errors, timeouts, etc.
            if (error.name === 'AbortError') {
                error.message = 'Request timed out';
            }
            
            error.config = finalConfig;
            
            return await this.applyResponseInterceptors(null, error);
        }
    }

    /**
     * GET request
     */
    async get(url, params = {}, config = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        
        return this.request({
            url: fullUrl,
            method: 'GET',
            ...config
        });
    }

    /**
     * POST request
     */
    async post(url, data = {}, config = {}) {
        return this.request({
            url,
            method: 'POST',
            body: data,
            ...config
        });
    }

    /**
     * PUT request
     */
    async put(url, data = {}, config = {}) {
        return this.request({
            url,
            method: 'PUT',
            body: data,
            ...config
        });
    }

    /**
     * DELETE request
     */
    async delete(url, config = {}) {
        return this.request({
            url,
            method: 'DELETE',
            ...config
        });
    }

    /**
     * PATCH request
     */
    async patch(url, data = {}, config = {}) {
        return this.request({
            url,
            method: 'PATCH',
            body: data,
            ...config
        });
    }

    /**
     * Health check
     */
    async checkHealth() {
        return this.get(window.AppConfig.API.ENDPOINTS.HEALTH);
    }

    /**
     * Authentication API methods
     */
    auth = {
        login: (credentials) => this.post(window.AppConfig.API.ENDPOINTS.LOGIN, credentials),
        register: (userData) => this.post(window.AppConfig.API.ENDPOINTS.REGISTER, userData),
        refresh: (refreshToken) => this.post(window.AppConfig.API.ENDPOINTS.REFRESH, { refreshToken }),
        logout: (refreshToken) => this.post(window.AppConfig.API.ENDPOINTS.LOGOUT, { refreshToken }),
        getProfile: () => this.get(window.AppConfig.API.ENDPOINTS.ME),
        updateProfile: (profileData) => this.put(window.AppConfig.API.ENDPOINTS.PROFILE, profileData),
        changePassword: (passwordData) => this.put(window.AppConfig.API.ENDPOINTS.PASSWORD, passwordData),
        validate: () => this.get(window.AppConfig.API.ENDPOINTS.VALIDATE)
    };

    /**
     * Upload file
     */
    async uploadFile(url, file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Progress tracking
            if (onProgress && typeof onProgress === 'function') {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }
            
            // Success/Error handling
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            };
            
            xhr.onerror = () => {
                reject(new Error('Upload failed: Network error'));
            };
            
            // Set headers
            if (window.authManager && window.authManager.isAuthenticated) {
                const authHeaders = window.authManager.getAuthHeaders();
                Object.entries(authHeaders).forEach(([key, value]) => {
                    if (key !== 'Content-Type') { // Don't set Content-Type for FormData
                        xhr.setRequestHeader(key, value);
                    }
                });
            }
            
            // Start upload
            xhr.open('POST', url.startsWith('http') ? url : `${this.baseURL}${url}`);
            xhr.send(formData);
        });
    }

    /**
     * Download file
     */
    async downloadFile(url, filename = null) {
        try {
            const response = await this.createFetchWithTimeout(url.startsWith('http') ? url : `${this.baseURL}${url}`, {
                method: 'GET',
                headers: window.authManager ? window.authManager.getAuthHeaders() : {}
            });
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Create temporary download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || `download_${Date.now()}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Cleanup
            window.URL.revokeObjectURL(downloadUrl);
            
            return blob;
            
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    /**
     * Cancel all pending requests
     */
    cancelAllRequests() {
        // Implementation would depend on tracking active requests
        console.log('Cancelling all pending requests...');
    }

    /**
     * Get API statistics
     */
    getStats() {
        return {
            baseURL: this.baseURL,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            requestInterceptors: this.requestInterceptors.length,
            responseInterceptors: this.responseInterceptors.length
        };
    }
}

// Create global API client instance
window.apiClient = new APIClient();

// Export API client for global access
window.api = window.apiClient;

// Convenience methods
window.apiGet = window.apiClient.get.bind(window.apiClient);
window.apiPost = window.apiClient.post.bind(window.apiClient);
window.apiPut = window.apiClient.put.bind(window.apiClient);
window.apiDelete = window.apiClient.delete.bind(window.apiClient);
window.apiPatch = window.apiClient.patch.bind(window.apiClient);

// Debug functions
if (window.AppConfig.DEV.DEBUG) {
    window.debugAPI = function() {
        console.log('🌐 API Debug Info:', window.apiClient.getStats());
    };
    
    window.testAPI = async function() {
        try {
            console.log('🧪 Testing API health check...');
            const response = await window.apiClient.checkHealth();
            console.log('✅ Health check successful:', response.data);
            return response;
        } catch (error) {
            console.error('❌ Health check failed:', error);
            throw error;
        }
    };
}