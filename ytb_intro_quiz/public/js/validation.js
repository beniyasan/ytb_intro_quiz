/**
 * Validation Module
 * Handles form validation, input sanitization, and security checks
 */

class ValidationManager {
    constructor() {
        this.validators = new Map();
        this.sanitizers = new Map();
        
        this.setupDefaultValidators();
        this.setupDefaultSanitizers();
    }

    /**
     * Setup default validation rules
     */
    setupDefaultValidators() {
        // Email validator
        this.addValidator('email', (value, options = {}) => {
            if (!value && !options.required) return { isValid: true };
            
            const emailRegex = window.AppConfig.VALIDATION.EMAIL_REGEX;
            const isValid = emailRegex.test(value);
            
            return {
                isValid,
                message: isValid ? null : window.AppConfig.ERROR_MESSAGES.EMAIL_INVALID
            };
        });

        // Password validator
        this.addValidator('password', (value, options = {}) => {
            if (!value && !options.required) return { isValid: true };
            
            const minLength = options.minLength || window.AppConfig.VALIDATION.PASSWORD_MIN_LENGTH;
            const requireComplexity = options.requireComplexity !== false;
            
            let isValid = true;
            let messages = [];
            
            // Length check
            if (value.length < minLength) {
                isValid = false;
                messages.push(`Password must be at least ${minLength} characters long`);
            }
            
            // Complexity check
            if (requireComplexity) {
                const hasLower = /[a-z]/.test(value);
                const hasUpper = /[A-Z]/.test(value);
                const hasDigit = /\d/.test(value);
                const hasSpecial = /[@$!%*?&]/.test(value);
                
                if (!hasLower) messages.push('Password must contain lowercase letters');
                if (!hasUpper) messages.push('Password must contain uppercase letters');
                if (!hasDigit) messages.push('Password must contain numbers');
                if (!hasSpecial) messages.push('Password must contain special characters (@$!%*?&)');
                
                if (messages.length > 0) {
                    isValid = false;
                }
            }
            
            // Common password check
            if (this.isCommonPassword(value)) {
                isValid = false;
                messages.push('Password is too common, please choose a stronger one');
            }
            
            // Sequential or repeated characters
            if (this.hasSequentialChars(value) || this.hasRepeatedChars(value)) {
                isValid = false;
                messages.push('Password contains sequential or repeated characters');
            }
            
            return {
                isValid,
                message: isValid ? null : messages.join('; '),
                strength: this.calculatePasswordStrength(value)
            };
        });

        // Username validator
        this.addValidator('username', (value, options = {}) => {
            if (!value && !options.required) return { isValid: true };
            
            const minLength = options.minLength || window.AppConfig.VALIDATION.USERNAME_MIN_LENGTH;
            const maxLength = options.maxLength || window.AppConfig.VALIDATION.USERNAME_MAX_LENGTH;
            const regex = window.AppConfig.VALIDATION.USERNAME_REGEX;
            
            let isValid = true;
            let messages = [];
            
            if (value.length < minLength) {
                isValid = false;
                messages.push(`Username must be at least ${minLength} characters`);
            }
            
            if (value.length > maxLength) {
                isValid = false;
                messages.push(`Username must not exceed ${maxLength} characters`);
            }
            
            if (!regex.test(value)) {
                isValid = false;
                messages.push('Username can only contain letters, numbers, underscores, and hyphens');
            }
            
            // Check for reserved usernames
            if (this.isReservedUsername(value)) {
                isValid = false;
                messages.push('This username is not available');
            }
            
            return {
                isValid,
                message: isValid ? null : messages.join('; ')
            };
        });

        // Required field validator
        this.addValidator('required', (value, options = {}) => {
            const fieldName = options.fieldName || 'Field';
            const isValid = value && value.toString().trim().length > 0;
            
            return {
                isValid,
                message: isValid ? null : `${fieldName} is required`
            };
        });

        // URL validator
        this.addValidator('url', (value, options = {}) => {
            if (!value && !options.required) return { isValid: true };
            
            try {
                new URL(value);
                
                // Additional security checks
                const url = new URL(value);
                
                // Block dangerous protocols
                const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];
                if (!allowedProtocols.includes(url.protocol)) {
                    return {
                        isValid: false,
                        message: 'URL protocol not allowed'
                    };
                }
                
                // Block suspicious domains (basic check)
                if (this.isSuspiciousDomain(url.hostname)) {
                    return {
                        isValid: false,
                        message: 'Suspicious URL detected'
                    };
                }
                
                return { isValid: true };
            } catch {
                return {
                    isValid: false,
                    message: 'Please enter a valid URL'
                };
            }
        });

        // Phone number validator
        this.addValidator('phone', (value, options = {}) => {
            if (!value && !options.required) return { isValid: true };
            
            // Basic phone validation (can be enhanced for specific regions)
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            const isValid = phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
            
            return {
                isValid,
                message: isValid ? null : 'Please enter a valid phone number'
            };
        });

        // File upload validator
        this.addValidator('file', (file, options = {}) => {
            if (!file && !options.required) return { isValid: true };
            
            let isValid = true;
            let messages = [];
            
            // File size check
            if (options.maxSize && file.size > options.maxSize) {
                isValid = false;
                messages.push(`File size must not exceed ${this.formatFileSize(options.maxSize)}`);
            }
            
            // File type check
            if (options.allowedTypes) {
                const fileType = file.type.toLowerCase();
                const allowedTypes = options.allowedTypes.map(type => type.toLowerCase());
                
                if (!allowedTypes.includes(fileType)) {
                    isValid = false;
                    messages.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
                }
            }
            
            // File extension check (additional security)
            if (options.allowedExtensions) {
                const fileExt = file.name.split('.').pop().toLowerCase();
                const allowedExts = options.allowedExtensions.map(ext => ext.toLowerCase());
                
                if (!allowedExts.includes(fileExt)) {
                    isValid = false;
                    messages.push(`File extension not allowed. Allowed extensions: ${allowedExts.join(', ')}`);
                }
            }
            
            return {
                isValid,
                message: isValid ? null : messages.join('; ')
            };
        });
    }

    /**
     * Setup default sanitizers
     */
    setupDefaultSanitizers() {
        // HTML sanitizer
        this.addSanitizer('html', (value) => {
            if (typeof value !== 'string') return value;
            
            return value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        });

        // SQL injection sanitizer
        this.addSanitizer('sql', (value) => {
            if (typeof value !== 'string') return value;
            
            return value.replace(/['";\\]/g, '\\$&');
        });

        // Trim whitespace
        this.addSanitizer('trim', (value) => {
            if (typeof value !== 'string') return value;
            return value.trim();
        });

        // Remove special characters
        this.addSanitizer('alphanumeric', (value) => {
            if (typeof value !== 'string') return value;
            return value.replace(/[^a-zA-Z0-9]/g, '');
        });

        // Email sanitizer
        this.addSanitizer('email', (value) => {
            if (typeof value !== 'string') return value;
            return value.toLowerCase().trim();
        });

        // Phone sanitizer
        this.addSanitizer('phone', (value) => {
            if (typeof value !== 'string') return value;
            return value.replace(/[^\d\+]/g, '');
        });

        // URL sanitizer
        this.addSanitizer('url', (value) => {
            if (typeof value !== 'string') return value;
            
            try {
                const url = new URL(value);
                return url.toString();
            } catch {
                return value;
            }
        });
    }

    /**
     * Add custom validator
     */
    addValidator(name, validatorFunction) {
        this.validators.set(name, validatorFunction);
    }

    /**
     * Add custom sanitizer
     */
    addSanitizer(name, sanitizerFunction) {
        this.sanitizers.set(name, sanitizerFunction);
    }

    /**
     * Validate single value
     */
    validate(value, rules) {
        const results = [];
        
        for (const rule of rules) {
            const { type, options = {} } = typeof rule === 'string' ? { type: rule } : rule;
            const validator = this.validators.get(type);
            
            if (validator) {
                const result = validator(value, options);
                results.push({
                    type,
                    ...result
                });
                
                // Stop on first error if specified
                if (!result.isValid && options.stopOnError) {
                    break;
                }
            } else {
                console.warn(`Unknown validator: ${type}`);
            }
        }
        
        const isValid = results.every(result => result.isValid);
        const messages = results.filter(result => !result.isValid).map(result => result.message);
        
        return {
            isValid,
            messages,
            results
        };
    }

    /**
     * Sanitize single value
     */
    sanitize(value, sanitizers) {
        let sanitizedValue = value;
        
        for (const sanitizer of sanitizers) {
            const sanitizerFunction = this.sanitizers.get(sanitizer);
            
            if (sanitizerFunction) {
                sanitizedValue = sanitizerFunction(sanitizedValue);
            } else {
                console.warn(`Unknown sanitizer: ${sanitizer}`);
            }
        }
        
        return sanitizedValue;
    }

    /**
     * Validate form data
     */
    validateForm(formData, schema) {
        const results = {};
        let isFormValid = true;
        
        for (const [fieldName, rules] of Object.entries(schema)) {
            const value = formData.get ? formData.get(fieldName) : formData[fieldName];
            const result = this.validate(value, rules);
            
            results[fieldName] = result;
            
            if (!result.isValid) {
                isFormValid = false;
            }
        }
        
        return {
            isValid: isFormValid,
            fields: results
        };
    }

    /**
     * Sanitize form data
     */
    sanitizeForm(formData, schema) {
        const sanitizedData = {};
        
        for (const [fieldName, sanitizers] of Object.entries(schema)) {
            const value = formData.get ? formData.get(fieldName) : formData[fieldName];
            sanitizedData[fieldName] = this.sanitize(value, sanitizers);
        }
        
        return sanitizedData;
    }

    /**
     * Calculate password strength
     */
    calculatePasswordStrength(password) {
        if (!password) return { score: 0, level: 'none' };
        
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[^A-Za-z0-9]/.test(password),
            longLength: password.length >= 12,
            veryLongLength: password.length >= 16
        };
        
        // Basic requirements
        Object.values(checks).forEach(check => {
            if (check) score++;
        });
        
        // Penalty for common patterns
        if (this.isCommonPassword(password)) score -= 2;
        if (this.hasSequentialChars(password)) score -= 1;
        if (this.hasRepeatedChars(password)) score -= 1;
        
        // Bonus for variety
        const charTypes = [checks.lowercase, checks.uppercase, checks.numbers, checks.symbols].filter(Boolean).length;
        score += Math.max(0, charTypes - 2);
        
        const maxScore = 10;
        const normalizedScore = Math.max(0, Math.min(maxScore, score));
        
        let level;
        if (normalizedScore <= 2) level = 'weak';
        else if (normalizedScore <= 4) level = 'fair';
        else if (normalizedScore <= 6) level = 'good';
        else level = 'strong';
        
        return {
            score: normalizedScore,
            maxScore,
            level,
            checks
        };
    }

    /**
     * Check if password is commonly used
     */
    isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            'dragon', '1234567890', 'password1', 'qwerty123'
        ];
        
        return commonPasswords.includes(password.toLowerCase());
    }

    /**
     * Check for sequential characters
     */
    hasSequentialChars(password) {
        const sequences = [
            'abcdefghijklmnopqrstuvwxyz',
            'qwertyuiop',
            'asdfghjkl',
            'zxcvbnm',
            '1234567890'
        ];
        
        const lower = password.toLowerCase();
        
        for (const sequence of sequences) {
            for (let i = 0; i <= sequence.length - 3; i++) {
                const substr = sequence.substring(i, i + 3);
                if (lower.includes(substr)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check for repeated characters
     */
    hasRepeatedChars(password) {
        // Check for 3 or more consecutive same characters
        return /(.)\1{2,}/.test(password);
    }

    /**
     * Check if username is reserved
     */
    isReservedUsername(username) {
        const reserved = [
            'admin', 'administrator', 'root', 'user', 'test',
            'guest', 'demo', 'system', 'null', 'undefined',
            'api', 'www', 'mail', 'ftp', 'blog', 'help',
            'support', 'service', 'info', 'contact'
        ];
        
        return reserved.includes(username.toLowerCase());
    }

    /**
     * Check for suspicious domains
     */
    isSuspiciousDomain(hostname) {
        const suspiciousPatterns = [
            /\d+\.\d+\.\d+\.\d+/, // IP addresses
            /[0-9]{5,}/, // Long number sequences
            /(.)\1{3,}/, // Repeated characters
            /(bit\.ly|tinyurl|t\.co|goo\.gl)/ // URL shorteners (basic check)
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(hostname));
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Check for XSS patterns
     */
    containsXSS(value) {
        if (typeof value !== 'string') return false;
        
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            /<link/gi,
            /<meta/gi
        ];
        
        return xssPatterns.some(pattern => pattern.test(value));
    }

    /**
     * Check for SQL injection patterns
     */
    containsSQLInjection(value) {
        if (typeof value !== 'string') return false;
        
        const sqlPatterns = [
            /('|(\\')|(;|\\;))/i,
            /((\s*(union|select|insert|delete|update|drop|create|alter|exec|execute)\s+))/i,
            /(-{2}|\/\*|\*\/)/i,
            /(\s*(or|and)\s+[\w\s]*=[\w\s]*)/i
        ];
        
        return sqlPatterns.some(pattern => pattern.test(value));
    }

    /**
     * Comprehensive security check
     */
    isSecure(value, options = {}) {
        const checks = {
            xss: !this.containsXSS(value),
            sql: !this.containsSQLInjection(value),
            length: !options.maxLength || value.length <= options.maxLength,
            encoding: this.isValidEncoding(value)
        };
        
        const isSecure = Object.values(checks).every(Boolean);
        
        return {
            isSecure,
            checks,
            threats: Object.entries(checks)
                .filter(([_, passed]) => !passed)
                .map(([threat]) => threat)
        };
    }

    /**
     * Check for valid encoding
     */
    isValidEncoding(value) {
        try {
            // Check for valid UTF-8 encoding
            return encodeURIComponent(decodeURIComponent(encodeURIComponent(value))) === encodeURIComponent(value);
        } catch {
            return false;
        }
    }

    /**
     * Rate limiting validation (client-side check)
     */
    checkRateLimit(action, limit = 5, timeWindow = 60000) {
        const key = `rateLimit_${action}`;
        const now = Date.now();
        
        let attempts = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Remove old attempts outside time window
        attempts = attempts.filter(timestamp => now - timestamp < timeWindow);
        
        if (attempts.length >= limit) {
            return {
                allowed: false,
                remainingTime: Math.ceil((attempts[0] + timeWindow - now) / 1000),
                message: `Too many attempts. Please try again in ${Math.ceil((attempts[0] + timeWindow - now) / 1000)} seconds.`
            };
        }
        
        // Add current attempt
        attempts.push(now);
        localStorage.setItem(key, JSON.stringify(attempts));
        
        return {
            allowed: true,
            remaining: limit - attempts.length
        };
    }

    /**
     * Clear rate limiting data
     */
    clearRateLimit(action) {
        const key = `rateLimit_${action}`;
        localStorage.removeItem(key);
    }
}

// Create global validation manager instance
window.validationManager = new ValidationManager();

// Export validation functions for global access
window.validateInput = function(value, rules) {
    return window.validationManager.validate(value, rules);
};

window.sanitizeInput = function(value, sanitizers) {
    return window.validationManager.sanitize(value, sanitizers);
};

window.validateForm = function(formData, schema) {
    return window.validationManager.validateForm(formData, schema);
};

window.sanitizeForm = function(formData, schema) {
    return window.validationManager.sanitizeForm(formData, schema);
};

window.checkPasswordStrength = function(password) {
    return window.validationManager.calculatePasswordStrength(password);
};

window.checkSecurity = function(value, options) {
    return window.validationManager.isSecure(value, options);
};

window.checkRateLimit = function(action, limit, timeWindow) {
    return window.validationManager.checkRateLimit(action, limit, timeWindow);
};

// Common validation schemas
window.ValidationSchemas = {
    LOGIN: {
        email: [
            'required',
            { type: 'email', options: { fieldName: 'Email' } }
        ],
        password: [
            'required'
        ]
    },
    
    REGISTER: {
        username: [
            'required',
            { type: 'username', options: { fieldName: 'Username' } }
        ],
        email: [
            'required',
            { type: 'email', options: { fieldName: 'Email' } }
        ],
        password: [
            'required',
            { type: 'password', options: { fieldName: 'Password' } }
        ]
    },
    
    PROFILE_UPDATE: {
        username: [
            { type: 'username', options: { fieldName: 'Username' } }
        ],
        email: [
            { type: 'email', options: { fieldName: 'Email' } }
        ]
    },
    
    PASSWORD_CHANGE: {
        currentPassword: [
            'required'
        ],
        newPassword: [
            'required',
            { type: 'password', options: { fieldName: 'New Password' } }
        ]
    }
};

// Common sanitization schemas
window.SanitizationSchemas = {
    USER_INPUT: {
        username: ['trim', 'html'],
        email: ['email'],
        firstName: ['trim', 'html'],
        lastName: ['trim', 'html'],
        bio: ['trim', 'html']
    },
    
    SEARCH_QUERY: {
        query: ['trim', 'html', 'sql']
    }
};

// Debug functions
if (window.AppConfig.DEV.DEBUG) {
    window.debugValidation = function() {
        console.log('🔍 Validation Debug Info:', {
            validators: Array.from(window.validationManager.validators.keys()),
            sanitizers: Array.from(window.validationManager.sanitizers.keys()),
            schemas: Object.keys(window.ValidationSchemas)
        });
    };
    
    window.testPasswordStrength = function(password) {
        const result = window.validationManager.calculatePasswordStrength(password);
        console.log(`Password: "${password}"`, result);
        return result;
    };
}