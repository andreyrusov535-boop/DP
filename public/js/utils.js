// Utilities Module
const Utils = (() => {
    const formatDate = (date) => {
        if (!date) return '';
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (date) => {
        if (!date) return '';
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDeadlineStatus = (deadline) => {
        if (!deadline) return null;

        const now = new Date();
        const deadlineDate = new Date(deadline);
        const timeDiff = deadlineDate - now;

        if (timeDiff < CONFIG.DEADLINE_THRESHOLDS.OVERDUE) {
            return { status: 'overdue', label: 'Overdue' };
        } else if (timeDiff < CONFIG.DEADLINE_THRESHOLDS.APPROACHING) {
            return { status: 'approaching', label: 'Approaching' };
        } else {
            return { status: 'normal', label: 'On Track' };
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePasswordStrength = (password) => {
        const hasLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*]/.test(password);

        return {
            isValid: hasLength && hasUppercase && hasLowercase && hasNumber,
            suggestions: [
                !hasLength && 'At least 8 characters',
                !hasUppercase && 'At least one uppercase letter',
                !hasLowercase && 'At least one lowercase letter',
                !hasNumber && 'At least one number',
            ].filter(Boolean),
        };
    };

    const validateFile = (file) => {
        const errors = [];

        if (file.size > CONFIG.FILE_CONFIG.MAX_SIZE) {
            errors.push(`File size must be less than ${Utils.formatFileSize(CONFIG.FILE_CONFIG.MAX_SIZE)}`);
        }

        if (!CONFIG.FILE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
            errors.push(`File type must be one of: ${CONFIG.FILE_CONFIG.ALLOWED_TYPES.join(', ')}`);
        }

        const extension = file.name.split('.').pop().toLowerCase();
        if (!CONFIG.FILE_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
            errors.push(`File extension must be one of: ${CONFIG.FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    };

    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    const throttle = (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const capitalizeFirstLetter = (string) => {
if (!string || typeof string !== 'string') return '';
if (string.length === 0) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    const convertToLocalDateTime = (date) => {
        if (!date) return '';
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toISOString().slice(0, 16);
    };

    const convertFromLocalDateTime = (localDateTime) => {
        if (!localDateTime) return '';
        return new Date(localDateTime).toISOString();
    };

    const formatCurrency = (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(amount);
    };

    const pluralize = (count, singular, plural = null) => {
        if (count === 1) return singular;
        return plural || singular + 's';
    };

    const escapeHtml = (text) => {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    };

    const formatPercentage = (value, total) => {
        if (!total || total === 0) return '0%';
        const percentage = (value / total) * 100;
        return `${percentage.toFixed(1)}%`;
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const calculateTrend = (current, previous) => {
        if (!previous || previous === 0) {
            return current > 0 ? '+100%' : '0%';
        }
        const diff = ((current - previous) / previous) * 100;
        const sign = diff > 0 ? '+' : '';
        return `${sign}${diff.toFixed(1)}%`;
    };

    const truncateText = (text, maxLength = 50) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Accessibility utilities
    const prefersReducedMotion = () => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };

    // Accessibility utilities
    const announceToScreenReader = (message, priority = 'polite') => {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    };

    const generateUniqueId = (prefix = 'id') => {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const trapFocus = (element) => {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        const handleKeydown = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        lastFocusable.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        firstFocusable.focus();
                        e.preventDefault();
                    }
                }
            } else if (e.key === 'Escape') {
                element.dispatchEvent(new CustomEvent('modalEscape'));
            }
        };

        element.addEventListener('keydown', handleKeydown);
        firstFocusable?.focus();

        return () => {
            element.removeEventListener('keydown', handleKeydown);
        };
    };

    // Performance utilities
    const createVirtualScroll = (container, items, renderItem, itemHeight = 100) => {
        let scrollTop = 0;
        let containerHeight = container.clientHeight;
        let visibleStart = 0;
        let visibleEnd = Math.ceil(containerHeight / itemHeight);
        let abortController = null;

        const updateVisibleRange = () => {
            const newVisibleStart = Math.floor(scrollTop / itemHeight);
            const newVisibleEnd = newVisibleStart + Math.ceil(containerHeight / itemHeight) + 2; // Buffer
            
            if (newVisibleStart !== visibleStart || newVisibleEnd !== visibleEnd) {
                visibleStart = newVisibleStart;
                visibleEnd = newVisibleEnd;
                renderVisibleItems();
            }
        };

        const renderVisibleItems = () => {
            const fragment = document.createDocumentFragment();
            
            for (let i = visibleStart; i < Math.min(visibleEnd, items.length); i++) {
                const itemElement = renderItem(items[i], i);
                itemElement.style.position = 'absolute';
                itemElement.style.top = `${i * itemHeight}px`;
                itemElement.style.width = '100%';
                fragment.appendChild(itemElement);
            }

            const content = container.querySelector('.virtual-scroll-content') || 
                           document.createElement('div');
            content.className = 'virtual-scroll-content';
            content.style.height = `${items.length * itemHeight}px`;
            content.innerHTML = '';
            content.appendChild(fragment);
            
            if (!container.contains(content)) {
                container.appendChild(content);
            }
        };

        const handleScroll = Utils.throttle(() => {
            scrollTop = container.scrollTop;
            updateVisibleRange();
        }, 16); // ~60fps

        const handleResize = Utils.debounce(() => {
            containerHeight = container.clientHeight;
            updateVisibleRange();
        }, 250);

        container.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleResize);

        updateVisibleRange();

        return {
            updateItems: (newItems) => {
                items = newItems;
                updateVisibleRange();
            },
            destroy: () => {
                container.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', handleResize);
                if (abortController) {
                    abortController.abort();
                }
            }
        };
    };

    // Enhanced debounce with AbortController support
    const createDebouncedFetch = (fetchFunction, delay = 300) => {
        let timeoutId = null;
        let abortController = null;

        return (...args) => {
            // Cancel previous request
            if (abortController) {
                abortController.abort();
            }

            // Clear previous timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Create new AbortController for this request
            abortController = new AbortController();

            // Set new timeout
            timeoutId = setTimeout(async () => {
                try {
                    const result = await fetchFunction(...args, { signal: abortController.signal });
                    abortController = null;
                    return result;
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        throw error;
                    }
                    // Request was aborted, don't throw
                    return null;
                }
            }, delay);

            // Return promise that resolves when request completes
            return new Promise((resolve, reject) => {
                const originalTimeoutId = timeoutId;
                timeoutId.then = (onFulfilled, onRejected) => {
                    return new Promise((res, rej) => {
                        const checkResult = () => {
                            if (timeoutId === originalTimeoutId) {
                                // This is the current request
                                setTimeout(() => {
                                    fetchFunction(...args, { signal: abortController.signal })
                                        .then(res)
                                        .catch(rej);
                                }, delay);
                            }
                        };
                        checkResult();
                    });
                };
            });
        };
    };

    // Form validation utilities
    const validateField = (field, rules) => {
        const errors = [];
        const value = field.value.trim();

        rules.forEach(rule => {
            if (rule.required && !value) {
                errors.push(rule.message || 'This field is required');
            } else if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(rule.message || 'Invalid format');
            } else if (rule.minLength && value.length < rule.minLength) {
                errors.push(rule.message || `Minimum ${rule.minLength} characters required`);
            } else if (rule.custom && !rule.custom(value)) {
                errors.push(rule.message || 'Invalid input');
            }
        });

        // Update field accessibility attributes
        if (errors.length > 0) {
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', `${field.id}-error`);
        } else {
            field.setAttribute('aria-invalid', 'false');
            field.removeAttribute('aria-describedby');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    const showFieldError = (fieldId, errors) => {
        let errorElement = document.getElementById(`${fieldId}-error`);
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${fieldId}-error`;
            errorElement.className = 'error-message';
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'polite');
            
            const field = document.getElementById(fieldId);
            if (field) {
                field.parentNode.appendChild(errorElement);
            }
        }

        if (errors.length > 0) {
            errorElement.innerHTML = `
                <ul class="error-list">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            `;
            errorElement.style.display = 'block';
        } else {
            errorElement.style.display = 'none';
        }
    };

    return {
        formatDate,
        formatDateTime,
        getDeadlineStatus,
        formatFileSize,
        validateEmail,
        validatePasswordStrength,
        validateFile,
        debounce,
        throttle,
        getInitials,
        capitalizeFirstLetter,
        convertToLocalDateTime,
        convertFromLocalDateTime,
        formatCurrency,
        pluralize,
        escapeHtml,
        formatPercentage,
        formatNumber,
        calculateTrend,
        truncateText,
        prefersReducedMotion,
        announceToScreenReader,
        generateUniqueId,
        trapFocus,
        createVirtualScroll,
        createDebouncedFetch,
        validateField,
        showFieldError,
    };
})();
