// Main Application Module
const App = (() => {
    const currentUser = Auth.getUserInfo();
    let currentRequests = [];
    let allRequests = [];
    let statsRefreshTimer = null;
    let statusChartInstance = null;
    let dynamicsChartInstance = null;
    let currentReportFilters = {};
    let debouncedLoadRequests = null;
    let abortController = null;
    let requestCache = {}; // Cache for fetched requests to avoid duplicate API calls

    const init = () => {
        // Initialize debounced function for filters
        debouncedLoadRequests = Utils.createDebouncedFetch((filters) => {
            return performLoadRequests(filters);
        }, 300);
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
                } else if (section === 'reports') {
                     loadReportNomenclature();
                     loadReports();
                } else if (section === 'reference-data') {
                     setupReferenceDataListeners();
                     loadReferenceData('request_types');
                }

                // Clean up charts when navigating away from reports
                if (section !== 'reports') {
                    cleanupCharts();
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

        // Add debounced input handling for search and filters
        const filterInputs = [
            'filter-search',
            'filter-type', 
            'filter-status',
            'filter-executor',
            'filter-address',
            'filter-territory',
            'filter-social-group',
            'filter-intake-form',
            'filter-date-from',
            'filter-date-to'
        ];

        filterInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // Use different debounce delays for different inputs
                const delay = inputId === 'filter-search' ? 500 : 300;
                
                input.addEventListener('input', Utils.debounce(() => {
                    applyFilters();
                }, delay));

                // Also handle change events for selects and dates
                input.addEventListener('change', () => {
                    applyFilters();
                });
            }
        });

        // Keyboard navigation support
        document.addEventListener('keydown', (e) => {
            // ESC key closes modals
            if (e.key === 'Escape') {
                if (currentModal) {
                    UI.hideModal();
                }
            }
            
            // Ctrl/Cmd + K focuses search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('filter-search');
                if (searchInput) {
                    searchInput.focus();
                    Utils.announceToScreenReader('Search field focused');
                }
            }
        });

        // Add keyboard navigation class to body for better focus indicators
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-nav');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-nav');
        });

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

        // Reports section
        const reportFilterApplyBtn = document.getElementById('report-filter-apply-btn');
        if (reportFilterApplyBtn) {
            reportFilterApplyBtn.addEventListener('click', applyReportFilters);
        }

        const exportExcelBtn = document.getElementById('export-excel-btn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => handleExportReport('excel'));
        }

        const exportPdfBtn = document.getElementById('export-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => handleExportReport('pdf'));
        }

        const dynamicsGrouping = document.getElementById('dynamics-grouping');
        if (dynamicsGrouping) {
            dynamicsGrouping.addEventListener('change', () => loadReports(currentReportFilters));
        }
    };

    const showAuth = () => {
        UI.switchView('auth-view');
    };

    const showDashboard = () => {
        UI.switchView('dashboard-view');
        const user = Auth.getUserInfo();
        if (user) {
            UI.updateUserProfile(user);
            
            const navReports = document.getElementById('nav-reports');
            if (navReports) {
                if (user.role === 'supervisor' || user.role === 'admin') {
                    navReports.style.display = 'block';
                } else {
                    navReports.style.display = 'none';
                }
            }

            const navReferenceData = document.getElementById('nav-reference-data');
            if (navReferenceData) {
                if (user.role === 'supervisor' || user.role === 'admin') {
                    navReferenceData.style.display = 'block';
                } else {
                    navReferenceData.style.display = 'none';
                }
            }
        }
        // Load initial data
        loadStats();
        loadNomenclature();
    };

    const loadNomenclature = async () => {
        try {
            // Load request types
            const typesResponse = await API.nomenclature.getTypes();
            const types = typesResponse.types || [];

            // Load social groups
            const socialGroupsResponse = await API.nomenclature.getSocialGroups();
            const socialGroups = socialGroupsResponse.socialGroups || [];

            // Load intake forms
            const intakeFormsResponse = await API.nomenclature.getIntakeForms();
            const intakeForms = intakeFormsResponse.intakeForms || [];

            // Populate request type selects
            const typeSelects = ['filter-type', 'create-type', 'edit-type'];
            typeSelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Clear existing options except the first one
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    types.forEach(type => {
                        const option = document.createElement('option');
                        option.value = type.id;
                        option.textContent = type.name;
                        select.appendChild(option);
                    });
                }
            });

            // Populate social group selects
            const socialGroupSelects = ['filter-social-group', 'create-social-group', 'edit-social-group'];
            socialGroupSelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Keep the first option
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    socialGroups.forEach(group => {
                        const option = document.createElement('option');
                        option.value = group.id;
                        option.textContent = group.name;
                        select.appendChild(option);
                    });
                }
            });

            // Populate intake form selects
            const intakeFormSelects = ['filter-intake-form', 'create-intake-form', 'edit-intake-form'];
            intakeFormSelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Keep the first option
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    intakeForms.forEach(form => {
                        const option = document.createElement('option');
                        option.value = form.id;
                        option.textContent = form.name;
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            console.error('Failed to load nomenclature:', error);
        }
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

    const performLoadRequests = async (filters = {}) => {
        // Cancel previous request
        if (abortController) {
            abortController.abort();
        }

        // Create new AbortController
        abortController = new AbortController();

        UI.showLoadingState(true);
        Utils.announceToScreenReader('Loading requests...');

        try {
            const response = await API.requests.list(filters, { signal: abortController.signal });
            
            // Check if request was aborted
            if (abortController.signal.aborted) {
                return;
            }

            currentRequests = response.data || [];
            allRequests = currentRequests;
            const userRole = Auth.getUserInfo()?.role || CONFIG.ROLES.CITIZEN;
            UI.renderRequestList(currentRequests, userRole);
            UI.showLoadingState(false);
            
            Utils.announceToScreenReader(`Loaded ${currentRequests.length} requests`);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to load requests:', error);
                UI.showNotification('Failed to load requests: ' + error.message, 'error');
                UI.showLoadingState(false);
                Utils.announceToScreenReader('Failed to load requests', 'assertive');
            }
        } finally {
            abortController = null;
        }
    };

    const loadRequests = async (filters = {}) => {
        return performLoadRequests(filters);
    };

    const applyFilters = () => {
        const type = document.getElementById('filter-type').value;
        const status = document.getElementById('filter-status').value;
        const executor = document.getElementById('filter-executor').value;
        const address = document.getElementById('filter-address')?.value;
        const territory = document.getElementById('filter-territory')?.value;
        const socialGroupId = document.getElementById('filter-social-group')?.value;
        const intakeFormId = document.getElementById('filter-intake-form')?.value;
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;
        const search = document.getElementById('filter-search').value;

        const filters = {};
        if (type) filters.type = type;
        if (status) filters.status = status;
        if (executor) filters.executor = executor;
        if (address) filters.address = address;
        if (territory) filters.territory = territory;
        if (socialGroupId) filters.social_group_id = socialGroupId;
        if (intakeFormId) filters.intake_form_id = intakeFormId;
        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;
        if (search) filters.search = search;

        // Use debounced function for better performance
        debouncedLoadRequests(filters);
    };

    const resetFilters = () => {
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-executor').value = '';
        const addressFilter = document.getElementById('filter-address');
        if (addressFilter) addressFilter.value = '';
        const territoryFilter = document.getElementById('filter-territory');
        if (territoryFilter) territoryFilter.value = '';
        const socialGroupFilter = document.getElementById('filter-social-group');
        if (socialGroupFilter) socialGroupFilter.value = '';
        const intakeFormFilter = document.getElementById('filter-intake-form');
        if (intakeFormFilter) intakeFormFilter.value = '';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-search').value = '';
        loadRequests();
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Enhanced validation
        const requestTypeField = document.getElementById('create-type');
        const descriptionField = document.getElementById('create-description');
        const addressField = document.getElementById('create-address');
        
        let isValid = true;
        let errorMessages = [];

        // Validate required fields
        const typeValidation = Utils.validateField(requestTypeField, [
            { required: true, message: 'Request type is required' }
        ]);
        
        const descriptionValidation = Utils.validateField(descriptionField, [
            { required: true, message: 'Description is required' },
            { minLength: 10, message: 'Description must be at least 10 characters' }
        ]);
        
        const addressValidation = Utils.validateField(addressField, [
            { required: true, message: 'Address is required' }
        ]);

        if (!typeValidation.isValid) {
            Utils.showFieldError('create-type', typeValidation.errors);
            isValid = false;
        } else {
            Utils.showFieldError('create-type', []);
        }

        if (!descriptionValidation.isValid) {
            Utils.showFieldError('create-description', descriptionValidation.errors);
            isValid = false;
        } else {
            Utils.showFieldError('create-description', []);
        }

        if (!addressValidation.isValid) {
            Utils.showFieldError('create-address', addressValidation.errors);
            isValid = false;
        } else {
            Utils.showFieldError('create-address', []);
        }

        if (!isValid) {
            Utils.announceToScreenReader('Please correct the errors in the form', 'assertive');
            return;
        }

        const requestTypeId = requestTypeField.value;
        const description = descriptionField.value;
        const address = addressField.value;
        const dueDate = document.getElementById('create-deadline').value;
        const attachmentInput = document.getElementById('create-attachment');
        const citizenFio = currentUser?.name || 'Unknown User';
        const contactEmail = currentUser?.email || '';

        let file = null;
        if (attachmentInput.files.length > 0) {
            file = attachmentInput.files[0];
            const validation = Utils.validateFile(file);
            if (!validation.isValid) {
                UI.showMessage('create-message', validation.errors.join(', '), 'error');
                return;
            }
        }

        // Set loading states
        UI.setFormLoading(form, true);
        Utils.announceToScreenReader('Creating request...');

        try {
            const data = {
                citizenFio,
                description,
                address,
                contactEmail,
                requestTypeId: Number(requestTypeId)
            };

            const socialGroupId = document.getElementById('create-social-group')?.value;
            if (socialGroupId) {
                data.socialGroupId = Number(socialGroupId);
            }

            const intakeFormId = document.getElementById('create-intake-form')?.value;
            if (intakeFormId) {
                data.intakeFormId = Number(intakeFormId);
            }

            const territory = document.getElementById('create-territory')?.value;
            if (territory) {
                data.territory = territory;
            }

            const contactChannel = document.getElementById('create-contact-channel')?.value;
            if (contactChannel) {
                data.contactChannel = contactChannel;
            }

            if (dueDate) {
                data.dueDate = Utils.convertFromLocalDateTime(dueDate);
            }

            const result = await API.requests.create(data, file);
            
            UI.showNotification('Request created successfully!', 'success');
            Utils.announceToScreenReader('Request created successfully', 'assertive');
            
            UI.resetForm('create-request-form');
            UI.clearMessage('create-message');
            loadRequests();
            UI.switchSection('requests-section');
            UI.setActiveNavItem('nav-requests');
        } catch (error) {
            console.error('Failed to create request:', error);
            UI.showMessage('create-message', 'Failed to create request: ' + error.message, 'error');
            Utils.announceToScreenReader('Failed to create request', 'assertive');
        } finally {
            UI.setFormLoading(form, false);
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
            // Use cached request if available, otherwise fetch from API
            let request = requestCache[requestId];
            if (!request) {
                request = await API.requests.get(requestId);
                requestCache[requestId] = request; // Cache the request
            }

            const userRole = Auth.getUserInfo()?.role || CONFIG.ROLES.CITIZEN;

            // Populate form
            document.getElementById('edit-request-id').value = request.id;
            document.getElementById('edit-type').value = request.requestType?.id || '';
            document.getElementById('edit-description').value = request.description || '';
            document.getElementById('edit-address').value = request.address || '';
            document.getElementById('edit-status').value = request.status;
            document.getElementById('edit-executor').value = request.executor || '';

            if (request.dueDate) {
                document.getElementById('edit-deadline').value = Utils.convertToLocalDateTime(request.dueDate);
            }

            const editSocialGroup = document.getElementById('edit-social-group');
            if (editSocialGroup && request.socialGroup) {
                editSocialGroup.value = request.socialGroup.id;
            }

            const editIntakeForm = document.getElementById('edit-intake-form');
            if (editIntakeForm && request.intakeForm) {
                editIntakeForm.value = request.intakeForm.id;
            }

            const editTerritory = document.getElementById('edit-territory');
            if (editTerritory) {
                editTerritory.value = request.territory || '';
            }

            const editContactChannel = document.getElementById('edit-contact-channel');
            if (editContactChannel) {
                editContactChannel.value = request.contactChannel || '';
            }

            // Show/hide fields based on role
            if (userRole === CONFIG.ROLES.OPERATOR) {
                document.getElementById('edit-status').parentElement.style.display = 'none';
                document.getElementById('edit-executor').parentElement.style.display = 'none';
            } else if (userRole === CONFIG.ROLES.SUPERVISOR) {
                document.getElementById('edit-type').parentElement.style.display = 'none';
                document.getElementById('edit-description').parentElement.style.display = 'none';
                document.getElementById('edit-address').parentElement.style.display = 'none';
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
            const typeValue = document.getElementById('edit-type').value;
            if (typeValue) updateData.requestTypeId = Number(typeValue);
            updateData.description = document.getElementById('edit-description').value;
            updateData.address = document.getElementById('edit-address').value;
            
            const socialGroupId = document.getElementById('edit-social-group')?.value;
            if (socialGroupId) updateData.socialGroupId = Number(socialGroupId);
            
            const intakeFormId = document.getElementById('edit-intake-form')?.value;
            if (intakeFormId) updateData.intakeFormId = Number(intakeFormId);
            
            const territory = document.getElementById('edit-territory')?.value;
            if (territory) updateData.territory = territory;
            
            const deadline = document.getElementById('edit-deadline').value;
            if (deadline) {
                updateData.dueDate = Utils.convertFromLocalDateTime(deadline);
            }
        } else if (userRole === CONFIG.ROLES.SUPERVISOR) {
            updateData.status = document.getElementById('edit-status').value;
            updateData.executor = document.getElementById('edit-executor').value;
        }

        try {
            await API.requests.update(requestId, updateData);
            // Clear cache for this request to force fresh fetch next time
            delete requestCache[requestId];
            UI.showNotification('Request updated successfully!', 'success');
            UI.hideModal('edit-modal');
            // Clear cache for this request to ensure fresh data on next view
            UI.clearModalCache();
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
            // Clear cache for this request
            delete requestCache[requestId];
            UI.showNotification('Request deleted successfully!', 'success');
            // Clear cache for this request since it's deleted
            UI.clearModalCache();
            loadRequests();
        } catch (error) {
            console.error('Failed to delete request:', error);
            UI.showNotification('Failed to delete request: ' + error.message, 'error');
        }
    };

    const openViewModal = async (requestId) => {
        try {
const cacheKey = `request_${requestId}`;
let request = UI.getCachedModalData(cacheKey);

if (!request) {
    request = await API.requests.get(requestId);
    UI.setCachedModalData(cacheKey, request);
}
            UI.renderViewModal(request);
            UI.showModal('view-modal');
        } catch (error) {
            console.error('Failed to load request:', error);
            UI.showNotification('Failed to load request: ' + error.message, 'error');
        }
    };

    const loadReportNomenclature = async () => {
        try {
            const response = await API.request('/nomenclature');
            const { types, intakeForms } = response;

            const reportTypeSelect = document.getElementById('report-filter-type');
            if (reportTypeSelect && reportTypeSelect.children.length === 1) {
                types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name;
                    reportTypeSelect.appendChild(option);
                });
            }

            const reportIntakeFormSelect = document.getElementById('report-filter-intake-form');
            if (reportIntakeFormSelect && reportIntakeFormSelect.children.length === 1) {
                intakeForms.forEach(form => {
                    const option = document.createElement('option');
                    option.value = form.id;
                    option.textContent = form.name;
                    reportIntakeFormSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load report nomenclature:', error);
        }
    };

    const loadReports = async (filters = {}) => {
        UI.showReportLoadingState(true);
        currentReportFilters = filters;

        try {
            const [overview, dynamics] = await Promise.all([
                API.reports.getOverview(filters),
                API.reports.getDynamics(filters, document.getElementById('dynamics-grouping')?.value || 'weekly'),
            ]);

            UI.renderKpiCards(overview);
            renderStatusChart(overview);
            renderDynamicsChart(dynamics);
            UI.renderTrendsTable(dynamics);

            UI.showReportLoadingState(false);

            const chartsContainer = document.getElementById('charts-container');
            if (chartsContainer) {
                chartsContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
            UI.showNotification('Failed to load reports: ' + error.message, 'error');
            UI.showReportLoadingState(false);
        }
    };

    const applyReportFilters = () => {
        const status = document.getElementById('report-filter-status')?.value;
        const type = document.getElementById('report-filter-type')?.value;
        const territory = document.getElementById('report-filter-territory')?.value;
        const intakeFormId = document.getElementById('report-filter-intake-form')?.value;
        const executor = document.getElementById('report-filter-executor')?.value;
        const dateFrom = document.getElementById('report-filter-date-from')?.value;
        const dateTo = document.getElementById('report-filter-date-to')?.value;

        const filters = {};
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (territory) filters.territory = territory;
        if (intakeFormId) filters.intake_form_id = intakeFormId;
        if (executor) filters.executor = executor;
        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;

        loadReports(filters);
    };

    const cleanupCharts = () => {
        if (statusChartInstance) {
            statusChartInstance.destroy();
            statusChartInstance = null;
        }
        
        if (dynamicsChartInstance) {
            dynamicsChartInstance.destroy();
            dynamicsChartInstance = null;
        }
    };

    const renderStatusChart = (overview) => {
        const canvas = document.getElementById('status-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const byStatus = overview.byStatus || [];

        // Clean up previous instance
        if (statusChartInstance) {
            statusChartInstance.destroy();
            statusChartInstance = null;
        }

        const labels = byStatus.map(item => Utils.capitalizeFirstLetter(item.status.replace('_', ' ')));
        const data = byStatus.map(item => item.count);
        const colors = byStatus.map(item => {
            const colorMap = {
                'new': '#0ea5e9',
                'in_progress': '#f59e0b',
                'completed': '#10b981',
                'cancelled': '#ef4444',
            };
            return colorMap[item.status] || '#64748b';
        });

        statusChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                // Memory optimization
                animation: {
                    duration: Utils.prefersReducedMotion() ? 0 : 300,
                },
            },
        });
    };

    const renderDynamicsChart = (dynamics) => {
        const canvas = document.getElementById('dynamics-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const periods = dynamics.periods || [];

        // Clean up previous instance
        if (dynamicsChartInstance) {
            dynamicsChartInstance.destroy();
            dynamicsChartInstance = null;
        }

        const labels = periods.map(p => p.period);
        const statusMap = {};

        periods.forEach(period => {
            (period.byStatus || []).forEach(statusItem => {
                if (!statusMap[statusItem.status]) {
                    statusMap[statusItem.status] = [];
                }
            });
        });

        periods.forEach(period => {
            const periodStatusMap = {};
            (period.byStatus || []).forEach(statusItem => {
                periodStatusMap[statusItem.status] = statusItem.count;
            });

            Object.keys(statusMap).forEach(status => {
                statusMap[status].push(periodStatusMap[status] || 0);
            });
        });

        const datasets = Object.keys(statusMap).map(status => {
            const colorMap = {
                'new': '#0ea5e9',
                'in_progress': '#f59e0b',
                'completed': '#10b981',
                'cancelled': '#ef4444',
            };

            return {
                label: Utils.capitalizeFirstLetter(status.replace('_', ' ')),
                data: statusMap[status],
                backgroundColor: colorMap[status] || '#64748b',
                borderColor: colorMap[status] || '#64748b',
                borderWidth: 2,
            };
        });

        dynamicsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                        }
                    },
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                // Memory optimization
                animation: {
                    duration: Utils.prefersReducedMotion() ? 0 : 300,
                },
            },
        });
    };

    const handleExportReport = async (format) => {
        try {
            UI.showNotification(`Preparing ${format.toUpperCase()} export...`, 'info');
            await API.reports.exportReport(format, currentReportFilters);
            UI.showNotification(`${format.toUpperCase()} report downloaded successfully!`, 'success');
        } catch (error) {
            console.error('Failed to export report:', error);
            UI.showNotification(`Failed to export report: ${error.message}`, 'error');
        }
    };

    let currentNomenclatureEntity = 'request_types';

    const loadReferenceData = async (entity) => {
        try {
            const refLoading = document.getElementById('ref-loading');
            if (refLoading) refLoading.style.display = 'block';
            
            currentNomenclatureEntity = entity;
            const result = await API.nomenclatureAdmin.list(entity, { includeInactive: true, limit: 50, offset: 0 });
            UI.renderReferenceDataTable(result.items);
            
            if (refLoading) refLoading.style.display = 'none';
        } catch (error) {
            console.error('Failed to load reference data:', error);
            UI.showNotification(`Failed to load ${entity}: ${error.message}`, 'error');
        }
    };

    const handleCreateReferenceItem = async (e) => {
        e.preventDefault();
        const form = e.target;
        const code = form.elements['code'].value.trim();
        const name = form.elements['name'].value.trim();

        if (!code || !name) {
            UI.showMessage('reference-data-message', 'Code and Name are required', 'error');
            return;
        }

        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Creating...';

            const result = await API.nomenclatureAdmin.create(currentNomenclatureEntity, { code, name });
            
            UI.showMessage('reference-data-message', `${currentNomenclatureEntity} created successfully!`, 'success');
            UI.clearReferenceDataForm();
            await loadReferenceData(currentNomenclatureEntity);
            UI.showNotification(`${result.name} created successfully!`, 'success');
            
            btn.disabled = false;
            btn.textContent = 'Create Item';
        } catch (error) {
            UI.showMessage('reference-data-message', error.message, 'error');
            console.error('Failed to create reference item:', error);
        }
    };

    const handleEditReferenceItem = async (e) => {
        e.preventDefault();
        const form = e.target;
        const id = parseInt(document.getElementById('ref-edit-id').value);
        const code = form.elements['code'].value.trim();
        const name = form.elements['name'].value.trim();
        const entity = document.getElementById('ref-edit-entity').value;

        if (!code || !name) {
            UI.showMessage('ref-edit-message', 'Code and Name are required', 'error');
            return;
        }

        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            await API.nomenclatureAdmin.update(entity, id, { code, name });
            
            UI.showMessage('ref-edit-message', 'Item updated successfully!', 'success');
            UI.closeReferenceDataEditModal();
            await loadReferenceData(entity);
            UI.showNotification('Item updated successfully!', 'success');
            
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        } catch (error) {
            UI.showMessage('ref-edit-message', error.message, 'error');
            console.error('Failed to update reference item:', error);
        }
    };

    const handleToggleReferenceItem = async (e) => {
        const btn = e.target;
        const id = parseInt(btn.dataset.id);
        const currentActive = btn.textContent.includes('Deactivate');

        try {
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'Loading...';

            await API.nomenclatureAdmin.toggleActive(currentNomenclatureEntity, id, !currentActive);
            
            await loadReferenceData(currentNomenclatureEntity);
            const action = currentActive ? 'deactivated' : 'activated';
            UI.showNotification(`Item ${action} successfully!`, 'success');
            
            btn.disabled = false;
            btn.textContent = originalText;
        } catch (error) {
            UI.showNotification(`Failed to toggle item: ${error.message}`, 'error');
            btn.disabled = false;
        }
    };

    const setupReferenceDataListeners = () => {
        const nomenclatureTabs = document.querySelectorAll('.nomenclature-tab-btn');
        nomenclatureTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const entity = e.target.dataset.nomenclature;
                
                document.querySelectorAll('.nomenclature-tab-btn').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                loadReferenceData(entity);
            });
        });

        const createForm = document.getElementById('reference-data-create-form');
        if (createForm) {
            createForm.addEventListener('submit', handleCreateReferenceItem);
        }

        const editForm = document.getElementById('ref-edit-form');
        if (editForm) {
            editForm.addEventListener('submit', handleEditReferenceItem);
        }

        const refEditModalClose = document.getElementById('ref-edit-modal-close');
        if (refEditModalClose) {
            refEditModalClose.addEventListener('click', UI.closeReferenceDataEditModal);
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-ref-item-btn')) {
                const id = e.target.dataset.id;
                const code = e.target.dataset.code;
                const name = e.target.dataset.name;
                UI.openReferenceDataEditModal(id, code, name, currentNomenclatureEntity);
            }

            if (e.target.classList.contains('toggle-ref-item-btn')) {
                handleToggleReferenceItem(e);
            }
        });
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
