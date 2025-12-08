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
            if (filters.address) params.append('address', filters.address);
            if (filters.territory) params.append('territory', filters.territory);
            if (filters.social_group_id) params.append('social_group_id', filters.social_group_id);
            if (filters.intake_form_id) params.append('intake_form_id', filters.intake_form_id);
            if (filters.contact_channel) params.append('contact_channel', filters.contact_channel);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.search) params.append('search', filters.search);

            const queryString = params.toString();
            const url = queryString ? `/requests?${queryString}` : '/requests';
            return request(url);
        },

        get: (id) => request(`/requests/${id}`),

        create: (data, files = null) => {
            if (files && files.length > 0) {
                const formData = new FormData();
                formData.append('citizenFio', data.citizenFio || '');
                formData.append('description', data.description);
                formData.append('address', data.address || '');
                formData.append('contactEmail', data.contactEmail || '');
                formData.append('contactPhone', data.contactPhone || '');
                if (data.requestTypeId) {
                    formData.append('requestTypeId', data.requestTypeId);
                }
                if (data.requestTopicId) {
                    formData.append('requestTopicId', data.requestTopicId);
                }
                if (data.dueDate) {
                    formData.append('dueDate', data.dueDate);
                }
                if (data.socialGroupId) {
                    formData.append('socialGroupId', data.socialGroupId);
                }
                if (data.intakeFormId) {
                    formData.append('intakeFormId', data.intakeFormId);
                }
                if (data.territory) {
                    formData.append('territory', data.territory);
                }
                if (data.contactChannel) {
                    formData.append('contactChannel', data.contactChannel);
                }
                for (const file of files) {
                    formData.append('attachments', file);
                }

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

        update: (id, data, files = null) => {
            if (files && files.length > 0) {
                const formData = new FormData();
                
                for (const [key, value] of Object.entries(data)) {
                    if (value !== null && value !== undefined) {
                        formData.append(key, value);
                    }
                }
                
                for (const file of files) {
                    formData.append('attachments', file);
                }

                return request(`/requests/${id}`, {
                    method: 'PATCH',
                    body: formData,
                    isFormData: true,
                });
            }

            return request(`/requests/${id}`, {
                method: 'PATCH',
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

        removeFromControl: (id, payload = {}) => {
            return request(`/requests/${id}/remove-from-control`, {
                method: 'PATCH',
                body: payload,
            });
        },
    };

    // Dashboard stats API
    const stats = {
        getOverview: () => request('/stats/overview'),
    };

    // Files API
    const files = {
        delete: (id) => {
            return request(`/files/${id}`, {
                method: 'DELETE',
            });
        },
    };

    // Nomenclature Admin API
    const nomenclatureAdmin = {
        list: (entity, options = {}) => {
            const params = new URLSearchParams();
            if (options.limit) params.append('limit', options.limit);
            if (options.offset) params.append('offset', options.offset);
            if (options.includeInactive) params.append('includeInactive', options.includeInactive);

            const queryString = params.toString();
            const url = queryString ? `/nomenclature-admin/${entity}?${queryString}` : `/nomenclature-admin/${entity}`;
            return request(url);
        },

        get: (entity, id) => request(`/nomenclature-admin/${entity}/${id}`),

        create: (entity, data) => {
            return request(`/nomenclature-admin/${entity}`, {
                method: 'POST',
                body: data,
            });
        },

        update: (entity, id, data) => {
            return request(`/nomenclature-admin/${entity}/${id}`, {
                method: 'PATCH',
                body: data,
            });
        },

        toggleActive: (entity, id, active) => {
            return request(`/nomenclature-admin/${entity}/${id}/toggle`, {
                method: 'PATCH',
                body: { active },
            });
        },
    };

    // Reports API
    const reports = {
        getOverview: (filters = {}) => {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.type) params.append('type', filters.type);
            if (filters.topic) params.append('topic', filters.topic);
            if (filters.territory) params.append('territory', filters.territory);
            if (filters.executor) params.append('executor', filters.executor);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.social_group_id) params.append('social_group_id', filters.social_group_id);
            if (filters.intake_form_id) params.append('intake_form_id', filters.intake_form_id);
            if (filters.search) params.append('search', filters.search);

            const queryString = params.toString();
            const url = queryString ? `/reports/overview?${queryString}` : '/reports/overview';
            return request(url);
        },

        getDynamics: (filters = {}, groupBy = 'weekly') => {
            const params = new URLSearchParams();
            params.append('groupBy', groupBy);
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.type) params.append('type', filters.type);
            if (filters.topic) params.append('topic', filters.topic);
            if (filters.territory) params.append('territory', filters.territory);
            if (filters.executor) params.append('executor', filters.executor);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.social_group_id) params.append('social_group_id', filters.social_group_id);
            if (filters.intake_form_id) params.append('intake_form_id', filters.intake_form_id);
            if (filters.search) params.append('search', filters.search);

            const queryString = params.toString();
            return request(`/reports/dynamics?${queryString}`);
        },

        exportReport: async (format, filters = {}) => {
            const params = new URLSearchParams();
            params.append('format', format);
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.type) params.append('type', filters.type);
            if (filters.topic) params.append('topic', filters.topic);
            if (filters.territory) params.append('territory', filters.territory);
            if (filters.executor) params.append('executor', filters.executor);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.social_group_id) params.append('social_group_id', filters.social_group_id);
            if (filters.intake_form_id) params.append('intake_form_id', filters.intake_form_id);
            if (filters.search) params.append('search', filters.search);

            const queryString = params.toString();
            const url = `${CONFIG.API_BASE_URL}/reports/export?${queryString}`;

            const token = Auth.getAccessToken();
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    message: `HTTP Error: ${response.status}`,
                }));
                throw new Error(error.message || 'Export failed');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `report_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            
            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
        },
    };

    return {
        request,
        requests,
        files,
        stats,
        nomenclatureAdmin,
        reports,
        getCsrfToken,
    };
})();
