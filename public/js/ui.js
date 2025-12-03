// UI Module - DOM manipulation and rendering
const UI = (() => {
    const showNotification = (message, type = 'info', duration = 5000) => {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'Close notification');

        notification.appendChild(messageSpan);
        notification.appendChild(closeButton);

        const removeNotification = () => {
            notification.remove();
        };

        closeButton.addEventListener('click', removeNotification);

        if (duration > 0) {
            setTimeout(removeNotification, duration);
        }

        container.appendChild(notification);
    };

    const showMessage = (elementId, message, type = 'info') => {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = message;
        element.className = `message show ${type}`;

        if (type === 'success') {
            setTimeout(() => {
                element.classList.remove('show');
            }, 3000);
        }
    };

    const clearMessage = (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('show');
            element.textContent = '';
        }
    };

    const renderRequestList = (requests, userRole) => {
        const container = document.getElementById('requests-list');

        if (!requests || requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No requests found. Try adjusting your filters.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = requests.map(request => {
            const deadlineStatus = request.deadline ? Utils.getDeadlineStatus(request.deadline) : null;
            const canEdit = userRole === CONFIG.ROLES.OPERATOR && request.status !== 'completed';
            const canAssign = userRole === CONFIG.ROLES.SUPERVISOR;
            const canView = true;

            let actionsHtml = '';

            if (canEdit) {
                actionsHtml = `
                    <button class="btn btn-primary btn-sm edit-request-btn" data-id="${request.id}" aria-label="Edit request ${request.id}">
                        Edit
                    </button>
                    <button class="btn btn-secondary btn-sm delete-request-btn" data-id="${request.id}" aria-label="Delete request ${request.id}">
                        Delete
                    </button>
                `;
            }

            if (canAssign) {
                actionsHtml += `
                    <button class="btn btn-primary btn-sm assign-request-btn" data-id="${request.id}" aria-label="Assign request ${request.id}">
                        Assign
                    </button>
                    <button class="btn btn-secondary btn-sm edit-request-btn" data-id="${request.id}" aria-label="Edit status for request ${request.id}">
                        Manage
                    </button>
                `;
            }

            if (canView && !canEdit && !canAssign) {
                actionsHtml = `
                    <button class="btn btn-secondary btn-sm view-request-btn" data-id="${request.id}" aria-label="View request ${request.id}">
                        View
                    </button>
                `;
            }

            const deadlineBadge = deadlineStatus ? `
                <span class="badge badge-deadline-${deadlineStatus.status}" aria-label="Deadline status: ${deadlineStatus.label}">
                    ${deadlineStatus.label}
                </span>
            ` : '';

            return `
                <div class="request-item" data-id="${request.id}">
                    <div class="request-info">
                        <div class="request-header">
                            <div class="request-title">${Utils.escapeHtml(request.description.substring(0, 50))}</div>
                            <span class="badge badge-status-${request.status}" aria-label="Status: ${request.status}">
                                ${request.status}
                            </span>
                        </div>
                        <div class="request-meta">
                            <div class="request-meta-item">
                                <strong>Type:</strong> ${Utils.capitalizeFirstLetter(request.type)}
                            </div>
                            <div class="request-meta-item">
                                <strong>Location:</strong> ${Utils.escapeHtml(request.location)}
                            </div>
                            ${request.executor ? `<div class="request-meta-item"><strong>Executor:</strong> ${Utils.escapeHtml(request.executor)}</div>` : ''}
                            <div class="request-meta-item">
                                <strong>Created:</strong> ${Utils.formatDateTime(request.created_at)}
                            </div>
                            ${request.deadline ? `<div class="request-meta-item"><strong>Deadline:</strong> ${Utils.formatDateTime(request.deadline)}</div>` : ''}
                        </div>
                    </div>
                    <div class="request-actions">
                        <div class="request-status">
                            <span class="badge badge-status-${request.status}">
                                ${Utils.capitalizeFirstLetter(request.status)}
                            </span>
                        </div>
                        ${deadlineBadge}
                        ${actionsHtml}
                    </div>
                </div>
            `;
        }).join('');
    };

    const renderStatsOverview = (stats) => {
        // Update status counts
        for (const [status, count] of Object.entries(stats.status_counts || {})) {
            const element = document.getElementById(`count-${status}`);
            if (element) {
                element.textContent = count;
            }
        }

        // Update type counts
        const typeCountsContainer = document.getElementById('type-counts');
        if (typeCountsContainer && stats.type_counts) {
            typeCountsContainer.innerHTML = Object.entries(stats.type_counts)
                .map(([type, count]) => `
                    <div class="stat-item">
                        <span class="stat-label">${Utils.capitalizeFirstLetter(type)}</span>
                        <span class="stat-value">${count}</span>
                    </div>
                `)
                .join('');
        }
    };

    const renderViewModal = (request) => {
        const container = document.getElementById('view-content');

        const deadlineStatus = request.deadline ? Utils.getDeadlineStatus(request.deadline) : null;
        const deadlineBadge = deadlineStatus ? `
            <div style="margin-top: 1rem;">
                <span class="badge badge-deadline-${deadlineStatus.status}">
                    ${deadlineStatus.label}
                </span>
            </div>
        ` : '';

        container.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                <div>
                    <strong>Description:</strong>
                    <p>${Utils.escapeHtml(request.description)}</p>
                </div>
                <div>
                    <strong>Type:</strong>
                    <p>${Utils.capitalizeFirstLetter(request.type)}</p>
                </div>
                <div>
                    <strong>Location:</strong>
                    <p>${Utils.escapeHtml(request.location)}</p>
                </div>
                <div>
                    <strong>Status:</strong>
                    <p><span class="badge badge-status-${request.status}">${Utils.capitalizeFirstLetter(request.status)}</span></p>
                </div>
                ${request.executor ? `
                    <div>
                        <strong>Assigned to:</strong>
                        <p>${Utils.escapeHtml(request.executor)}</p>
                    </div>
                ` : ''}
                <div>
                    <strong>Created:</strong>
                    <p>${Utils.formatDateTime(request.created_at)}</p>
                </div>
                ${request.deadline ? `
                    <div>
                        <strong>Deadline:</strong>
                        <p>${Utils.formatDateTime(request.deadline)}</p>
                        ${deadlineBadge}
                    </div>
                ` : ''}
                ${request.attachment_url ? `
                    <div>
                        <strong>Attachment:</strong>
                        <p><a href="${request.attachment_url}" target="_blank" rel="noopener noreferrer">Download</a></p>
                    </div>
                ` : ''}
            </div>
        `;
    };

    const showModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    };

    const hideModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    };

    const showLoadingState = (show = true) => {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    };

    const setFormData = (formId, data) => {
        const form = document.getElementById(formId);
        if (!form) return;

        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = data[key];
                } else if (input.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    input.value = data[key] || '';
                }
            }
        });
    };

    const getFormData = (formId) => {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            if (data[key]) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        });

        return data;
    };

    const switchView = (viewId) => {
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.style.display = 'none';
        });

        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.style.display = 'flex';
        }
    };

    const switchSection = (sectionId) => {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
        }
    };

    const switchTab = (tabName) => {
        const tabs = document.querySelectorAll('.auth-tab-btn');
        const forms = document.querySelectorAll('.auth-form');

        tabs.forEach(tab => tab.classList.remove('active'));
        forms.forEach(form => form.classList.remove('active'));

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activeForm = document.getElementById(`${tabName}-form`);

        if (activeTab) activeTab.classList.add('active');
        if (activeForm) activeForm.classList.add('active');
    };

    const updateUserProfile = (user) => {
        const nameElement = document.getElementById('user-name');
        const roleElement = document.getElementById('user-role');

        if (nameElement) nameElement.textContent = user.name;
        if (roleElement) {
            roleElement.textContent = Utils.capitalizeFirstLetter(user.role);
            roleElement.className = `user-role badge badge-role-${user.role}`;
        }
    };

    const setActiveNavItem = (itemId) => {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        const activeItem = document.getElementById(itemId);
        if (activeItem) activeItem.classList.add('active');
    };

    const resetForm = (formId) => {
        const form = document.getElementById(formId);
        if (form) form.reset();
    };

    return {
        showNotification,
        showMessage,
        clearMessage,
        renderRequestList,
        renderStatsOverview,
        renderViewModal,
        showModal,
        hideModal,
        showLoadingState,
        setFormData,
        getFormData,
        switchView,
        switchSection,
        switchTab,
        updateUserProfile,
        setActiveNavItem,
        resetForm,
    };
})();
