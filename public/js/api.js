// API Module - Fetch helpers with JWT and CSRF support
const API = (() => {
    const getCsrfToken = () => {
        // Try to get CSRF token from meta tag or cookie
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) return meta.getAttribute('content');

        // Try from cookie
        const name = 'csrf-token';
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();

        return null;
    };

    const request = async (endpoint, options = {}) => {
        const {
            method = 'GET',
            body = null,
            headers = {},
            isFormData = false,
        } = options;

        // Prepare headers
        const finalHeaders = {
            ...headers,
        };

        // Add JWT token
        const token = Auth.getAccessToken();
        if (token) {
            finalHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Add CSRF token for state-changing requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                finalHeaders['X-CSRF-Token'] = csrfToken;
            }
        }

        // Set content type if not FormData
        if (!isFormData && body && !finalHeaders['Content-Type']) {
            finalHeaders['Content-Type'] = 'application/json';
        }

        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const fetchOptions = {
            method,
            headers: finalHeaders,
        };

        if (body) {
            fetchOptions.body = isFormData ? body : JSON.stringify(body);
        }

        try {
            let response = await fetch(url, fetchOptions);

            // Handle token expiration
            if (response.status === 401) {
                const refreshed = await Auth.refreshAccessToken();
                if (refreshed) {
                    // Retry request with new token
                    finalHeaders['Authorization'] = `Bearer ${Auth.getAccessToken()}`;
                    response = await fetch(url, fetchOptions);
                } else {
                    // Redirect to login
                    window.location.href = '/index.html';
                    throw new Error('Session expired. Please login again.');
                }
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    message: `HTTP Error: ${response.status}`,
                }));
                throw new Error(error.message || error.error || 'Request failed');
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return response;
        } catch (error) {
            console.error(`API Error (${method} ${endpoint}):`, error);
            throw error;
        }
    };

    // Requests API
    const requests = {
        list: (filters = {}) => {
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.status) params.append('status', filters.status);
            if (filters.executor) params.append('executor', filters.executor);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.search) params.append('search', filters.search);

            const queryString = params.toString();
            const url = queryString ? `/requests?${queryString}` : '/requests';
            return request(url);
        },

        get: (id) => request(`/requests/${id}`),

        create: (data, file = null) => {
            if (file) {
                const formData = new FormData();
                formData.append('type', data.type);
                formData.append('description', data.description);
                formData.append('location', data.location);
                if (data.deadline) {
                    formData.append('deadline', data.deadline);
                }
                formData.append('attachment', file);

                return request('/requests', {
                    method: 'POST',
                    body: formData,
                    isFormData: true,
                });
            }

            return request('/requests', {
                method: 'POST',
                body: data,
            });
        },

        update: (id, data) => {
            return request(`/requests/${id}`, {
                method: 'PUT',
                body: data,
            });
        },

        delete: (id) => {
            return request(`/requests/${id}`, {
                method: 'DELETE',
            });
        },

        assign: (id, executor) => {
            return request(`/requests/${id}/assign`, {
                method: 'POST',
                body: { executor },
            });
        },

        updateStatus: (id, status) => {
            return request(`/requests/${id}/status`, {
                method: 'PATCH',
                body: { status },
            });
        },
    };

    // Dashboard stats API
    const stats = {
        getOverview: () => request('/stats/overview'),
    };

    return {
        request,
        requests,
        stats,
        getCsrfToken,
    };
})();
