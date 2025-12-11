// Authentication Module
const Auth = (() => {
    let accessToken = null;
    let refreshToken = null;
    let userInfo = null;
    let tokenRefreshTimer = null;

    const init = () => {
        loadStoredTokens();
        if (accessToken && refreshToken) {
            setupTokenRefresh();
        }
    };

    const loadStoredTokens = () => {
        // In a production app, you might use localStorage more carefully
        // For now, we use in-memory storage with sessionStorage as fallback
        const stored = sessionStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        if (stored) {
            accessToken = stored;
        }

        const storedRefresh = sessionStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        if (storedRefresh) {
            refreshToken = storedRefresh;
        }

        const storedUser = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO);
        if (storedUser) {
            try {
                userInfo = JSON.parse(storedUser);
            } catch (e) {
                console.warn('Failed to parse stored user info');
            }
        }
    };

    const login = async (email, password) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();

            setTokens(data.accessToken, data.refreshToken);
            userInfo = {
                userId: data.userId,
                email: data.email,
                name: data.name,
                role: data.role
            };
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));

            setupTokenRefresh();
            return { success: true, user: userInfo };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const register = async (name, email, password, role) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, role }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registration failed');
            }

            const data = await response.json();

            setTokens(data.accessToken, data.refreshToken);
            userInfo = {
                userId: data.userId,
                email: data.email,
                name: data.name,
                role: data.role
            };
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));

            setupTokenRefresh();
            return { success: true, user: userInfo };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const refreshAccessToken = async () => {
        if (!refreshToken) {
            logout();
            return false;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) {
                logout();
                return false;
            }

            const data = await response.json();
            setTokens(data.accessToken, data.refreshToken);
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
            return false;
        }
    };

    const setupTokenRefresh = () => {
        clearTokenRefresh();
        tokenRefreshTimer = setInterval(async () => {
            await refreshAccessToken();
        }, CONFIG.TOKEN_REFRESH_INTERVAL);
    };

    const clearTokenRefresh = () => {
        if (tokenRefreshTimer) {
            clearInterval(tokenRefreshTimer);
            tokenRefreshTimer = null;
        }
    };

    const setTokens = (newAccessToken, newRefreshToken) => {
        accessToken = newAccessToken;
        refreshToken = newRefreshToken;
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    };

    const logout = () => {
        accessToken = null;
        refreshToken = null;
        userInfo = null;
        clearTokenRefresh();
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER_INFO);
    };

    const getAccessToken = () => accessToken;
    const getRefreshToken = () => refreshToken;
    const getUserInfo = () => userInfo;
    const isAuthenticated = () => !!accessToken && !!userInfo;

    return {
        init,
        login,
        register,
        logout,
        refreshAccessToken,
        getAccessToken,
        getRefreshToken,
        getUserInfo,
        isAuthenticated,
        loadStoredTokens,
    };
})();

// Initialize auth on page load
Auth.init();
