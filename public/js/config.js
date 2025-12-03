// API Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'access_token',
        REFRESH_TOKEN: 'refresh_token',
        USER_INFO: 'user_info',
    },
    TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
    FILE_CONFIG: {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
        ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'pdf'],
    },
    ROLES: {
        CITIZEN: 'citizen',
        OPERATOR: 'operator',
        SUPERVISOR: 'supervisor',
    },
    REQUEST_STATUS: ['new', 'in_progress', 'completed', 'cancelled'],
    REQUEST_TYPES: ['repair', 'maintenance', 'installation', 'inspection', 'other'],
    DEADLINE_THRESHOLDS: {
        OVERDUE: 0, // deadline passed
        APPROACHING: 48 * 60 * 60 * 1000, // 48 hours before deadline
    },
};
