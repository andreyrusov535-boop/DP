// Main Application Module
const App = (() => {
    const currentUser = Auth.getUserInfo();
    let currentRequests = [];
    let allRequests = [];
    let statsRefreshTimer = null;

    const init = () => {
        if (Auth.isAuthenticated()) {
            showDashboard();
        } else {
            showAuth();
        }
        setupEventListeners();
    };

    const setupEventListeners = () => {
        // Auth events
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }

        const loginTab = document.getElementById('login-tab');
        if (loginTab) {
            loginTab.addEventListener('click', () => UI.switchTab('login'));
        }

        const registerTab = document.getElementById('register-tab');
        if (registerTab) {
            registerTab.addEventListener('click', () => UI.switchTab('register'));
        }

        // Dashboard events
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.target.getAttribute('data-section');
                const itemId = e.target.getAttribute('id');
                UI.switchSection(`${section}-section`);
                UI.setActiveNavItem(itemId);

                if (section === 'requests') {
                    loadRequests();
                } else if (section === 'overview') {
                    loadStats();
                }
            });
        });

        // Requests section
        const createRequestBtn = document.getElementById('create-request-btn');
        if (createRequestBtn) {
            createRequestBtn.addEventListener('click', () => {
                UI.switchSection('create-section');
                UI.setActiveNavItem('nav-create');
            });
        }

        const createRequestForm = document.getElementById('create-request-form');
        if (createRequestForm) {
            createRequestForm.addEventListener('submit', handleCreateRequest);
        }

        // File validation
        const attachmentInput = document.getElementById('create-attachment');
        if (attachmentInput) {
            attachmentInput.addEventListener('change', handleFileChange);
        }

        // Filters
        const filterApplyBtn = document.getElementById('filter-apply-btn');
        if (filterApplyBtn) {
            filterApplyBtn.addEventListener('click', applyFilters);
        }

        const filterResetBtn = document.getElementById('filter-reset-btn');
        if (filterResetBtn) {
            filterResetBtn.addEventListener('click', resetFilters);
        }

        // Edit modal
        const editModalClose = document.getElementById('edit-modal-close');
        if (editModalClose) {
            editModalClose.addEventListener('click', () => UI.hideModal('edit-modal'));
        }

        const editForm = document.getElementById('edit-request-form');
        if (editForm) {
            editForm.addEventListener('submit', handleEditRequest);
        }

        // View modal
        const viewModalClose = document.getElementById('view-modal-close');
        if (viewModalClose) {
            viewModalClose.addEventListener('click', () => UI.hideModal('view-modal'));
        }

        // Modal click outside
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') {
                UI.hideModal('edit-modal');
            }
        });

        document.getElementById('view-modal').addEventListener('click', (e) => {
            if (e.target.id === 'view-modal') {
                UI.hideModal('view-modal');
            }
        });

        // Request list events (delegated)
        document.addEventListener('click', handleRequestListActions);
    };

    const showAuth = () => {
        UI.switchView('auth-view');
    };

    const showDashboard = () => {
        UI.switchView('dashboard-view');
        const user = Auth.getUserInfo();
        if (user) {
            UI.updateUserProfile(user);
        }
        // Load initial data
        loadStats();
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            UI.showMessage('login-message', 'Please enter email and password', 'error');
            return;
        }

        UI.showMessage('login-message', 'Logging in...', 'info');

        const result = await Auth.login(email, password);

        if (result.success) {
            UI.showNotification('Login successful!', 'success');
            showDashboard();
        } else {
            UI.showMessage('login-message', result.error, 'error');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const role = document.getElementById('register-role').value;

        if (!name || !email || !password || !passwordConfirm || !role) {
            UI.showMessage('register-message', 'Please fill all fields', 'error');
            return;
        }

        if (!Utils.validateEmail(email)) {
            UI.showMessage('register-message', 'Please enter a valid email', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            UI.showMessage('register-message', 'Passwords do not match', 'error');
            return;
        }

        const passwordStrength = Utils.validatePasswordStrength(password);
        if (!passwordStrength.isValid) {
            UI.showMessage('register-message', `Password must: ${passwordStrength.suggestions.join(', ')}`, 'error');
            return;
        }

        UI.showMessage('register-message', 'Creating account...', 'info');

        const result = await Auth.register(name, email, password, role);

        if (result.success) {
            UI.showNotification('Account created successfully!', 'success');
            showDashboard();
        } else {
            UI.showMessage('register-message', result.error, 'error');
        }
    };

    const handleLogout = () => {
        Auth.logout();
        if (statsRefreshTimer) {
            clearInterval(statsRefreshTimer);
        }
        UI.showNotification('Logged out successfully', 'info');
        showAuth();
    };

    const loadStats = async () => {
        try {
            const stats = await API.stats.getOverview();
            UI.renderStatsOverview(stats);

            // Setup auto-refresh
            if (!statsRefreshTimer) {
                statsRefreshTimer = setInterval(() => {
                    API.stats.getOverview()
                        .then(stats => UI.renderStatsOverview(stats))
                        .catch(err => console.error('Failed to refresh stats:', err));
                }, 30000); // Refresh every 30 seconds
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
            UI.showNotification('Failed to load dashboard stats', 'error');
        }
    };

    const loadRequests = async (filters = {}) => {
        UI.showLoadingState(true);
        try {
            const data = await API.requests.list(filters);
            currentRequests = data.requests || [];
            allRequests = currentRequests;
            const userRole = Auth.getUserInfo()?.role || CONFIG.ROLES.CITIZEN;
            UI.renderRequestList(currentRequests, userRole);
            UI.showLoadingState(false);
        } catch (error) {
            console.error('Failed to load requests:', error);
            UI.showNotification('Failed to load requests: ' + error.message, 'error');
            UI.showLoadingState(false);
        }
    };

    const applyFilters = () => {
        const type = document.getElementById('filter-type').value;
        const status = document.getElementById('filter-status').value;
        const executor = document.getElementById('filter-executor').value;
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;
        const search = document.getElementById('filter-search').value;

        const filters = {};
        if (type) filters.type = type;
        if (status) filters.status = status;
        if (executor) filters.executor = executor;
        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;
        if (search) filters.search = search;

        loadRequests(filters);
    };

    const resetFilters = () => {
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-executor').value = '';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-search').value = '';
        loadRequests();
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();

        const type = document.getElementById('create-type').value;
        const description = document.getElementById('create-description').value;
        const location = document.getElementById('create-location').value;
        const deadline = document.getElementById('create-deadline').value;
        const attachmentInput = document.getElementById('create-attachment');

        if (!type || !description || !location) {
            UI.showMessage('create-message', 'Please fill all required fields', 'error');
            return;
        }

        let file = null;
        if (attachmentInput.files.length > 0) {
            file = attachmentInput.files[0];
            const validation = Utils.validateFile(file);
            if (!validation.isValid) {
                UI.showMessage('create-message', validation.errors.join(', '), 'error');
                return;
            }
        }

        UI.showMessage('create-message', 'Creating request...', 'info');

        try {
            const data = {
                type,
                description,
                location,
            };

            if (deadline) {
                data.deadline = Utils.convertFromLocalDateTime(deadline);
            }

            const result = await API.requests.create(data, file);
            UI.showNotification('Request created successfully!', 'success');
            UI.resetForm('create-request-form');
            UI.clearMessage('create-message');
            loadRequests();
            UI.switchSection('requests-section');
            UI.setActiveNavItem('nav-requests');
        } catch (error) {
            console.error('Failed to create request:', error);
            UI.showMessage('create-message', 'Failed to create request: ' + error.message, 'error');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validation = Utils.validateFile(file);
            const errorDiv = document.getElementById('file-validation-error');

            if (!validation.isValid) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = validation.errors.join(', ');
                e.target.value = '';
            } else {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }
        }
    };

    const handleRequestListActions = (e) => {
        if (e.target.classList.contains('edit-request-btn')) {
            const requestId = e.target.getAttribute('data-id');
            openEditModal(requestId);
        } else if (e.target.classList.contains('delete-request-btn')) {
            const requestId = e.target.getAttribute('data-id');
            handleDeleteRequest(requestId);
        } else if (e.target.classList.contains('view-request-btn')) {
            const requestId = e.target.getAttribute('data-id');
            openViewModal(requestId);
        } else if (e.target.classList.contains('assign-request-btn')) {
            const requestId = e.target.getAttribute('data-id');
            openEditModal(requestId);
        }
    };

    const openEditModal = async (requestId) => {
        try {
            const request = await API.requests.get(requestId);
            const userRole = Auth.getUserInfo()?.role || CONFIG.ROLES.CITIZEN;

            // Populate form
            document.getElementById('edit-request-id').value = request.id;
            document.getElementById('edit-type').value = request.type;
            document.getElementById('edit-description').value = request.description;
            document.getElementById('edit-location').value = request.location;
            document.getElementById('edit-status').value = request.status;
            document.getElementById('edit-executor').value = request.executor || '';

            if (request.deadline) {
                document.getElementById('edit-deadline').value = Utils.convertToLocalDateTime(request.deadline);
            }

            // Show/hide fields based on role
            if (userRole === CONFIG.ROLES.OPERATOR) {
                document.getElementById('edit-status').parentElement.style.display = 'none';
                document.getElementById('edit-executor').parentElement.style.display = 'none';
            } else if (userRole === CONFIG.ROLES.SUPERVISOR) {
                document.getElementById('edit-type').parentElement.style.display = 'none';
                document.getElementById('edit-description').parentElement.style.display = 'none';
                document.getElementById('edit-location').parentElement.style.display = 'none';
            }

            UI.showModal('edit-modal');
        } catch (error) {
            console.error('Failed to load request:', error);
            UI.showNotification('Failed to load request: ' + error.message, 'error');
        }
    };

    const handleEditRequest = async (e) => {
        e.preventDefault();

        const requestId = document.getElementById('edit-request-id').value;
        const userRole = Auth.getUserInfo()?.role || CONFIG.ROLES.CITIZEN;

        const updateData = {};

        if (userRole === CONFIG.ROLES.OPERATOR) {
            updateData.type = document.getElementById('edit-type').value;
            updateData.description = document.getElementById('edit-description').value;
            updateData.location = document.getElementById('edit-location').value;
            const deadline = document.getElementById('edit-deadline').value;
            if (deadline) {
                updateData.deadline = Utils.convertFromLocalDateTime(deadline);
            }
        } else if (userRole === CONFIG.ROLES.SUPERVISOR) {
            updateData.status = document.getElementById('edit-status').value;
            updateData.executor = document.getElementById('edit-executor').value;
        }

        try {
            await API.requests.update(requestId, updateData);
            UI.showNotification('Request updated successfully!', 'success');
            UI.hideModal('edit-modal');
            loadRequests();
        } catch (error) {
            console.error('Failed to update request:', error);
            UI.showMessage('edit-message', 'Failed to update request: ' + error.message, 'error');
        }
    };

    const handleDeleteRequest = async (requestId) => {
        if (!confirm('Are you sure you want to delete this request?')) {
            return;
        }

        try {
            await API.requests.delete(requestId);
            UI.showNotification('Request deleted successfully!', 'success');
            loadRequests();
        } catch (error) {
            console.error('Failed to delete request:', error);
            UI.showNotification('Failed to delete request: ' + error.message, 'error');
        }
    };

    const openViewModal = async (requestId) => {
        try {
            const request = await API.requests.get(requestId);
            UI.renderViewModal(request);
            UI.showModal('view-modal');
        } catch (error) {
            console.error('Failed to load request:', error);
            UI.showNotification('Failed to load request: ' + error.message, 'error');
        }
    };

    return {
        init,
    };
})();

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}
