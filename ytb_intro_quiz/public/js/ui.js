/**
 * UI Module
 * Handles user interface interactions, navigation, and visual feedback
 */

class UIManager {
    constructor() {
        this.currentPage = null;
        this.loadingCount = 0;
        this.toastQueue = [];
        this.animations = new Map();
        
        this.init();
    }

    /**
     * Initialize UI manager
     */
    init() {
        this.setupNavigationHandlers();
        this.setupFormHandlers();
        this.setupMobileNavigation();
        this.setupAccessibility();
        this.setupThemeHandling();
        
        // Set initial page
        this.showPage(window.AppConfig.APP.DEFAULT_PAGE);
        
        // Update authentication state
        this.updateAuthenticationState(window.authManager ? window.authManager.isAuthenticated : false);
    }

    /**
     * Setup navigation handlers
     */
    setupNavigationHandlers() {
        // Handle navigation clicks
        document.addEventListener('click', (event) => {
            const target = event.target.closest('a[href^="#"], button[onclick*="showPage"]');
            if (target) {
                event.preventDefault();
                
                const href = target.getAttribute('href');
                const onclick = target.getAttribute('onclick');
                
                if (href && href.startsWith('#')) {
                    const page = href.substring(1);
                    this.showPage(page);
                } else if (onclick && onclick.includes('showPage')) {
                    const match = onclick.match(/showPage\(['"](.+?)['"]\)/);
                    if (match) {
                        this.showPage(match[1]);
                    }
                }
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            const page = event.state?.page || window.AppConfig.APP.DEFAULT_PAGE;
            this.showPage(page, false);
        });
    }

    /**
     * Setup form handlers
     */
    setupFormHandlers() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLoginSubmit.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegisterSubmit.bind(this));
        }

        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileSubmit.bind(this));
        }

        // Password form
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', this.handlePasswordSubmit.bind(this));
        }

        // Real-time validation
        this.setupRealTimeValidation();
    }

    /**
     * Setup real-time validation
     */
    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input[required]');
        
        inputs.forEach(input => {
            // Validate on blur
            input.addEventListener('blur', () => {
                this.validateInput(input);
            });
            
            // Clear error on input
            input.addEventListener('input', () => {
                this.clearInputError(input);
                
                // Special handling for password strength
                if (input.id === 'registerPassword' || input.id === 'newPassword') {
                    this.updatePasswordStrength(input);
                }
                
                // Special handling for confirm password
                if (input.id === 'confirmPassword' || input.id === 'confirmNewPassword') {
                    this.validatePasswordMatch(input);
                }
            });
        });
    }

    /**
     * Setup mobile navigation
     */
    setupMobileNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });
            
            // Close mobile menu when clicking outside
            document.addEventListener('click', (event) => {
                if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                }
            });
            
            // Close mobile menu when clicking on nav links
            navMenu.addEventListener('click', (event) => {
                if (event.target.classList.contains('nav-link')) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                }
            });
        }
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
            skipLink.style.opacity = '1';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
            skipLink.style.opacity = '0';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add main content ID
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.id = 'main-content';
            mainContent.setAttribute('tabindex', '-1');
        }
        
        // Announce page changes to screen readers
        this.createAriaLiveRegion();
        
        // Enhanced keyboard navigation
        this.setupKeyboardNavigation();
    }

    /**
     * Create ARIA live region for announcements
     */
    createAriaLiveRegion() {
        const liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(liveRegion);
    }

    /**
     * Announce message to screen readers
     */
    announce(message) {
        const liveRegion = document.getElementById('aria-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            // Escape key closes modals and mobile menu
            if (event.key === 'Escape') {
                const navMenu = document.getElementById('navMenu');
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    document.getElementById('navToggle')?.classList.remove('active');
                }
                
                // Close any open dropdowns or modals
                this.closeAllDropdowns();
            }
            
            // Enter key on buttons
            if (event.key === 'Enter' && event.target.tagName === 'BUTTON') {
                event.target.click();
            }
        });
    }

    /**
     * Setup theme handling
     */
    setupThemeHandling() {
        // Check for saved theme preference or default to auto
        const savedTheme = localStorage.getItem(window.AppConfig.STORAGE.THEME_KEY) || 'auto';
        this.applyTheme(savedTheme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (localStorage.getItem(window.AppConfig.STORAGE.THEME_KEY) === 'auto') {
                this.applyTheme('auto');
            }
        });
    }

    /**
     * Apply theme
     */
    applyTheme(theme) {
        const root = document.documentElement;
        
        switch (theme) {
            case 'dark':
                root.setAttribute('data-theme', 'dark');
                break;
            case 'light':
                root.setAttribute('data-theme', 'light');
                break;
            case 'auto':
            default:
                root.removeAttribute('data-theme');
                break;
        }
        
        localStorage.setItem(window.AppConfig.STORAGE.THEME_KEY, theme);
    }

    /**
     * Show page
     */
    showPage(pageId, updateHistory = true) {
        // Check if page requires authentication
        if (window.AppConfig.APP.ROUTES.AUTH_REQUIRED.includes(pageId)) {
            if (!window.authManager || !window.authManager.isAuthenticated) {
                this.showPage('login', updateHistory);
                this.showToast('Please log in to access this page.', 'warning');
                return;
            }
        }
        
        // Hide current page
        if (this.currentPage) {
            const currentPageElement = document.getElementById(`${this.currentPage}Page`);
            if (currentPageElement) {
                currentPageElement.classList.remove('active');
            }
        }
        
        // Show new page
        const newPageElement = document.getElementById(`${pageId}Page`);
        if (newPageElement) {
            newPageElement.classList.add('active');
            this.currentPage = pageId;
            
            // Update navigation
            this.updateNavigation(pageId);
            
            // Update page title
            this.updatePageTitle(pageId);
            
            // Update browser history
            if (updateHistory) {
                const url = pageId === window.AppConfig.APP.DEFAULT_PAGE ? '/' : `/#${pageId}`;
                history.pushState({ page: pageId }, '', url);
            }
            
            // Announce page change
            const pageTitle = this.getPageTitle(pageId);
            this.announce(`Navigated to ${pageTitle}`);
            
            // Focus management
            this.manageFocus(pageId);
            
            // Load page-specific data
            this.loadPageData(pageId);
            
            // Add animation
            this.animatePageTransition(newPageElement);
            
        } else {
            console.warn(`Page "${pageId}" not found`);
        }
    }

    /**
     * Update navigation active state
     */
    updateNavigation(activePageId) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${activePageId}` || (href === '#home' && activePageId === window.AppConfig.APP.DEFAULT_PAGE)) {
                link.closest('.nav-item')?.classList.add('active');
            } else {
                link.closest('.nav-item')?.classList.remove('active');
            }
        });
    }

    /**
     * Update page title
     */
    updatePageTitle(pageId) {
        const titles = {
            home: 'JWT Authentication System',
            login: 'Login - JWT Auth',
            register: 'Register - JWT Auth',
            dashboard: 'Dashboard - JWT Auth',
            profile: 'Profile - JWT Auth'
        };
        
        document.title = titles[pageId] || 'JWT Authentication System';
    }

    /**
     * Get page title for announcements
     */
    getPageTitle(pageId) {
        const titles = {
            home: 'Home',
            login: 'Login',
            register: 'Register',
            dashboard: 'Dashboard',
            profile: 'Profile'
        };
        
        return titles[pageId] || pageId;
    }

    /**
     * Manage focus for accessibility
     */
    manageFocus(pageId) {
        setTimeout(() => {
            const pageElement = document.getElementById(`${pageId}Page`);
            if (pageElement) {
                // Focus first focusable element or the page itself
                const firstFocusable = pageElement.querySelector('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                } else {
                    pageElement.focus();
                }
            }
        }, 100);
    }

    /**
     * Load page-specific data
     */
    async loadPageData(pageId) {
        try {
            switch (pageId) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'profile':
                    await this.loadProfileData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading data for page ${pageId}:`, error);
            this.showToast('Error loading page data. Please refresh and try again.', 'error');
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        if (!window.authManager || !window.authManager.isAuthenticated) {
            return;
        }
        
        try {
            const user = await window.authManager.getUserProfile();
            this.updateUserInfo(user);
            this.updateTokenInfo();
            this.updateSecurityStatus();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    /**
     * Load profile data
     */
    async loadProfileData() {
        if (!window.authManager || !window.authManager.isAuthenticated) {
            return;
        }
        
        try {
            const user = await window.authManager.getUserProfile();
            this.populateProfileForm(user);
        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }

    /**
     * Update user info display
     */
    updateUserInfo(user) {
        const userInfoElement = document.getElementById('userInfo');
        if (!userInfoElement || !user) return;
        
        userInfoElement.innerHTML = `
            <div class="user-detail">
                <span class="detail-label">Username:</span>
                <span class="detail-value">${this.escapeHtml(user.username || 'N/A')}</span>
            </div>
            <div class="user-detail">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${this.escapeHtml(user.email || 'N/A')}</span>
            </div>
            <div class="user-detail">
                <span class="detail-label">User ID:</span>
                <span class="detail-value">${this.escapeHtml(user.id || 'N/A')}</span>
            </div>
            <div class="user-detail">
                <span class="detail-label">Created:</span>
                <span class="detail-value">${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
        `;
    }

    /**
     * Update token info display
     */
    updateTokenInfo() {
        const tokenInfoElement = document.getElementById('tokenInfo');
        if (!tokenInfoElement || !window.authManager) return;
        
        const status = window.authManager.getAuthStatus();
        const token = window.authManager.tokens.accessToken;
        
        let tokenInfo = 'No token available';
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiry = new Date(payload.exp * 1000);
                const isExpiringSoon = window.authManager.isTokenExpiringSoon();
                
                tokenInfo = `
                    <div class="token-detail">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value ${isExpiringSoon ? 'text-warning' : 'text-success'}">
                            ${isExpiringSoon ? 'Expiring Soon' : 'Valid'}
                        </span>
                    </div>
                    <div class="token-detail">
                        <span class="detail-label">Expires:</span>
                        <span class="detail-value">${expiry.toLocaleString()}</span>
                    </div>
                    <div class="token-detail">
                        <span class="detail-label">Issued:</span>
                        <span class="detail-value">${new Date(payload.iat * 1000).toLocaleString()}</span>
                    </div>
                `;
            } catch (error) {
                tokenInfo = '<div class="token-detail text-error">Invalid token format</div>';
            }
        }
        
        tokenInfoElement.innerHTML = tokenInfo;
    }

    /**
     * Update security status
     */
    updateSecurityStatus() {
        const securityStatusElement = document.getElementById('securityStatus');
        if (!securityStatusElement) return;
        
        const isOnline = navigator.onLine;
        const hasSecureConnection = location.protocol === 'https:';
        const hasValidToken = window.authManager && window.authManager.tokens.accessToken;
        
        securityStatusElement.innerHTML = `
            <div class="security-detail">
                <span class="detail-label">Connection:</span>
                <span class="detail-value ${hasSecureConnection ? 'text-success' : 'text-warning'}">
                    ${hasSecureConnection ? '🔒 Secure (HTTPS)' : '⚠️ Insecure (HTTP)'}
                </span>
            </div>
            <div class="security-detail">
                <span class="detail-label">Network Status:</span>
                <span class="detail-value ${isOnline ? 'text-success' : 'text-error'}">
                    ${isOnline ? '🌐 Online' : '📵 Offline'}
                </span>
            </div>
            <div class="security-detail">
                <span class="detail-label">Authentication:</span>
                <span class="detail-value ${hasValidToken ? 'text-success' : 'text-error'}">
                    ${hasValidToken ? '✅ Authenticated' : '❌ Not Authenticated'}
                </span>
            </div>
        `;
    }

    /**
     * Populate profile form
     */
    populateProfileForm(user) {
        if (!user) return;
        
        const usernameInput = document.getElementById('profileUsername');
        const emailInput = document.getElementById('profileEmail');
        
        if (usernameInput) usernameInput.value = user.username || '';
        if (emailInput) emailInput.value = user.email || '';
    }

    /**
     * Update authentication state
     */
    updateAuthenticationState(isAuthenticated) {
        // Show/hide navigation items
        const publicNavItems = ['navHome', 'navLogin', 'navRegister'];
        const privateNavItems = ['navDashboard', 'navProfile', 'navLogout'];
        
        if (isAuthenticated) {
            publicNavItems.forEach(id => {
                const item = document.getElementById(id);
                if (item && !['navHome'].includes(id)) {
                    item.classList.add('hidden');
                }
            });
            
            privateNavItems.forEach(id => {
                const item = document.getElementById(id);
                if (item) {
                    item.classList.remove('hidden');
                }
            });
            
            // Redirect to dashboard if on login/register page
            if (['login', 'register'].includes(this.currentPage)) {
                this.showPage(window.AppConfig.APP.AUTHENTICATED_DEFAULT_PAGE);
            }
        } else {
            publicNavItems.forEach(id => {
                const item = document.getElementById(id);
                if (item) {
                    item.classList.remove('hidden');
                }
            });
            
            privateNavItems.forEach(id => {
                const item = document.getElementById(id);
                if (item) {
                    item.classList.add('hidden');
                }
            });
            
            // Redirect to home if on protected page
            if (window.AppConfig.APP.ROUTES.AUTH_REQUIRED.includes(this.currentPage)) {
                this.showPage(window.AppConfig.APP.DEFAULT_PAGE);
            }
        }
    }

    /**
     * Animate page transition
     */
    animatePageTransition(pageElement) {
        if (!pageElement) return;
        
        pageElement.style.opacity = '0';
        pageElement.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            pageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            pageElement.style.opacity = '1';
            pageElement.style.transform = 'translateY(0)';
            
            setTimeout(() => {
                pageElement.style.transition = '';
            }, 300);
        });
    }

    /**
     * Handle form submissions
     */
    async handleLoginSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm(event.target)) {
            return;
        }
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe') === 'on';
        
        try {
            this.setButtonLoading('loginBtn', true);
            await window.loginUser(email, password, rememberMe);
        } catch (error) {
            this.showAlert('loginAlert', error.message, 'error');
        } finally {
            this.setButtonLoading('loginBtn', false);
        }
    }

    async handleRegisterSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm(event.target)) {
            return;
        }
        
        const formData = new FormData(event.target);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };
        
        try {
            this.setButtonLoading('registerBtn', true);
            await window.registerUser(userData);
            this.showPage('login');
        } catch (error) {
            this.showAlert('registerAlert', error.message, 'error');
        } finally {
            this.setButtonLoading('registerBtn', false);
        }
    }

    async handleProfileSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm(event.target)) {
            return;
        }
        
        const formData = new FormData(event.target);
        const profileData = {
            username: formData.get('username'),
            email: formData.get('email')
        };
        
        try {
            this.setButtonLoading('updateProfileBtn', true);
            await window.updateUserProfile(profileData);
            await this.loadDashboardData(); // Refresh dashboard
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.setButtonLoading('updateProfileBtn', false);
        }
    }

    async handlePasswordSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm(event.target)) {
            return;
        }
        
        const formData = new FormData(event.target);
        const passwordData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword')
        };
        
        try {
            this.setButtonLoading('changePasswordBtn', true);
            await window.changeUserPassword(passwordData);
            event.target.reset(); // Clear form on success
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.setButtonLoading('changePasswordBtn', false);
        }
    }

    /**
     * Validate form
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateInput(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    /**
     * Validate individual input
     */
    validateInput(input) {
        const value = input.value.trim();
        const type = input.type;
        const name = input.name;
        let isValid = true;
        let errorMessage = '';
        
        // Required validation
        if (input.required && !value) {
            isValid = false;
            errorMessage = `${this.getFieldLabel(name)} is required.`;
        }
        // Email validation
        else if (type === 'email' && value && !window.AppConfig.VALIDATION.EMAIL_REGEX.test(value)) {
            isValid = false;
            errorMessage = window.AppConfig.ERROR_MESSAGES.EMAIL_INVALID;
        }
        // Password validation
        else if (type === 'password' && name === 'password' && value && !window.AppConfig.VALIDATION.PASSWORD_REGEX.test(value)) {
            isValid = false;
            errorMessage = window.AppConfig.ERROR_MESSAGES.PASSWORD_WEAK;
        }
        // Username validation
        else if (name === 'username' && value) {
            if (value.length < window.AppConfig.VALIDATION.USERNAME_MIN_LENGTH) {
                isValid = false;
                errorMessage = `Username must be at least ${window.AppConfig.VALIDATION.USERNAME_MIN_LENGTH} characters.`;
            } else if (!window.AppConfig.VALIDATION.USERNAME_REGEX.test(value)) {
                isValid = false;
                errorMessage = window.AppConfig.ERROR_MESSAGES.USERNAME_INVALID;
            }
        }
        
        // Special validation for confirm password
        if (name === 'confirmPassword' || name === 'confirmNewPassword') {
            const passwordField = name === 'confirmPassword' ? 
                document.getElementById('registerPassword') : 
                document.getElementById('newPassword');
            
            if (passwordField && value !== passwordField.value) {
                isValid = false;
                errorMessage = window.AppConfig.ERROR_MESSAGES.PASSWORD_MISMATCH;
            }
        }
        
        if (isValid) {
            this.clearInputError(input);
        } else {
            this.showInputError(input, errorMessage);
        }
        
        return isValid;
    }

    /**
     * Get field label for error messages
     */
    getFieldLabel(name) {
        const labels = {
            email: 'Email',
            password: 'Password',
            username: 'Username',
            confirmPassword: 'Confirm Password',
            currentPassword: 'Current Password',
            newPassword: 'New Password',
            confirmNewPassword: 'Confirm New Password'
        };
        
        return labels[name] || name;
    }

    /**
     * Show input error
     */
    showInputError(input, message) {
        input.classList.add('error');
        const errorElement = document.getElementById(`${input.id}Error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    /**
     * Clear input error
     */
    clearInputError(input) {
        input.classList.remove('error');
        const errorElement = document.getElementById(`${input.id}Error`);
        if (errorElement) {
            errorElement.textContent = '';
        }
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(input) {
        const password = input.value;
        const strengthElement = document.getElementById('strengthFill') || document.querySelector('.strength-fill');
        const strengthTextElement = document.getElementById('strengthText') || document.querySelector('.strength-text');
        
        if (!strengthElement || !strengthTextElement) return;
        
        let score = 0;
        let feedback = 'Enter a password';
        
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        strengthElement.className = 'strength-fill';
        
        if (password.length === 0) {
            feedback = 'Enter a password';
        } else if (score < 2) {
            strengthElement.classList.add('weak');
            feedback = 'Weak password';
        } else if (score < 3) {
            strengthElement.classList.add('fair');
            feedback = 'Fair password';
        } else if (score < 5) {
            strengthElement.classList.add('good');
            feedback = 'Good password';
        } else {
            strengthElement.classList.add('strong');
            feedback = 'Strong password';
        }
        
        strengthTextElement.textContent = feedback;
    }

    /**
     * Validate password match
     */
    validatePasswordMatch(confirmInput) {
        const passwordInput = confirmInput.id === 'confirmPassword' ? 
            document.getElementById('registerPassword') : 
            document.getElementById('newPassword');
        
        if (!passwordInput) return;
        
        if (confirmInput.value && confirmInput.value !== passwordInput.value) {
            this.showInputError(confirmInput, window.AppConfig.ERROR_MESSAGES.PASSWORD_MISMATCH);
        } else {
            this.clearInputError(confirmInput);
        }
    }

    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        const textSpan = button.querySelector('.btn-text');
        const loaderSpan = button.querySelector('.btn-loader');
        
        if (isLoading) {
            button.disabled = true;
            if (textSpan) textSpan.classList.add('hidden');
            if (loaderSpan) loaderSpan.classList.remove('hidden');
        } else {
            button.disabled = false;
            if (textSpan) textSpan.classList.remove('hidden');
            if (loaderSpan) loaderSpan.classList.add('hidden');
        }
    }

    /**
     * Show alert in specific container
     */
    showAlert(containerId, message, type = 'info') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.className = `alert ${type}`;
        container.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
            ${this.escapeHtml(message)}
        `;
        container.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }

    /**
     * Get alert icon based on type
     */
    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        return icons[type] || 'info-circle';
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = null) {
        duration = duration || window.AppConfig.UI.TOAST_DURATION;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
            <span>${this.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            
            // Auto-remove toast
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, duration);
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        
        if (show) {
            this.loadingCount++;
            overlay.classList.remove('hidden');
        } else {
            this.loadingCount = Math.max(0, this.loadingCount - 1);
            if (this.loadingCount === 0) {
                overlay.classList.add('hidden');
            }
        }
    }

    /**
     * Show profile tab
     */
    showProfileTab(tabId) {
        // Hide all tabs
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => tab.classList.remove('active'));
        
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show selected tab
        const selectedTab = document.getElementById(`profile${tabId.charAt(0).toUpperCase() + tabId.slice(1)}Tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Update button state
        const selectedButton = document.querySelector(`[onclick="showProfileTab('${tabId}')"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
    }

    /**
     * Toggle password visibility
     */
    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const eyeIcon = document.getElementById(`${inputId}Eye`);
        
        if (!input || !eyeIcon) return;
        
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown.open');
        dropdowns.forEach(dropdown => dropdown.classList.remove('open'));
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * Check if mobile device
     */
    isMobile() {
        return window.innerWidth <= 768 || window.AppConfig.BROWSER.IS_MOBILE;
    }
}

// Create global UI manager instance
window.uiManager = new UIManager();

// Export functions for global access
window.showPage = window.uiManager.showPage.bind(window.uiManager);
window.showToast = window.uiManager.showToast.bind(window.uiManager);
window.showLoading = window.uiManager.showLoading.bind(window.uiManager);
window.showProfileTab = window.uiManager.showProfileTab.bind(window.uiManager);
window.togglePassword = window.uiManager.togglePassword.bind(window.uiManager);
window.updateAuthenticationState = window.uiManager.updateAuthenticationState.bind(window.uiManager);

// Debug functions
if (window.AppConfig.DEV.DEBUG) {
    window.debugUI = function() {
        console.log('🎨 UI Debug Info:', {
            currentPage: window.uiManager.currentPage,
            loadingCount: window.uiManager.loadingCount,
            isMobile: window.uiManager.isMobile()
        });
    };
}