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
    };
})();
