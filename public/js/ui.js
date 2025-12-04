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
                                <strong>Citizen:</strong> ${Utils.escapeHtml(request.citizenFio || 'N/A')}
                            </div>
                            ${request.requestType ? `<div class="request-meta-item"><strong>Type:</strong> ${Utils.escapeHtml(request.requestType.name)}</div>` : ''}
                            ${request.address ? `<div class="request-meta-item"><strong>Address:</strong> ${Utils.escapeHtml(request.address)}</div>` : ''}
                            ${request.territory ? `<div class="request-meta-item"><strong>Territory:</strong> ${Utils.escapeHtml(request.territory)}</div>` : ''}
                            ${request.executor ? `<div class="request-meta-item"><strong>Executor:</strong> ${Utils.escapeHtml(request.executor)}</div>` : ''}
                            <div class="request-meta-item">
                                <strong>Created:</strong> ${Utils.formatDateTime(request.createdAt)}
                            </div>
                            ${request.dueDate ? `<div class="request-meta-item"><strong>Deadline:</strong> ${Utils.formatDateTime(request.dueDate)}</div>` : ''}
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

    const showReportLoadingState = (show = true) => {
        const loadingIndicator = document.getElementById('report-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    };

    const renderKpiCards = (overview) => {
        const container = document.getElementById('kpi-grid');
        const cardsContainer = document.getElementById('kpi-cards-container');
        
        if (!container || !overview) return;

        const total = overview.total || 0;
        const byStatus = overview.byStatus || [];
        const byType = overview.byType || [];
        const byPriority = overview.byPriority || [];

        const cards = [
            {
                title: 'Total Requests',
                value: Utils.formatNumber(total),
                icon: '📊',
                color: 'primary',
            },
        ];

        byStatus.forEach(item => {
            cards.push({
                title: Utils.capitalizeFirstLetter(item.status.replace('_', ' ')),
                value: Utils.formatNumber(item.count),
                subtitle: Utils.formatPercentage(item.count, total),
                icon: getStatusIcon(item.status),
                color: getStatusColor(item.status),
            });
        });

        container.innerHTML = cards.map(card => `
            <div class="kpi-card kpi-card-${card.color}" role="article" aria-label="${card.title}: ${card.value}">
                <div class="kpi-icon">${card.icon}</div>
                <div class="kpi-content">
                    <div class="kpi-title">${card.title}</div>
                    <div class="kpi-value">${card.value}</div>
                    ${card.subtitle ? `<div class="kpi-subtitle">${card.subtitle}</div>` : ''}
                </div>
            </div>
        `).join('');

        cardsContainer.style.display = 'block';
    };

    const getStatusIcon = (status) => {
        const icons = {
            'new': '🆕',
            'in_progress': '⚙️',
            'completed': '✅',
            'cancelled': '❌',
        };
        return icons[status] || '📄';
    };

    const getStatusColor = (status) => {
        const colors = {
            'new': 'info',
            'in_progress': 'warning',
            'completed': 'success',
            'cancelled': 'danger',
        };
        return colors[status] || 'secondary';
    };

    const renderTrendsTable = (dynamics) => {
        const tbody = document.getElementById('trends-table-body');
        const container = document.getElementById('trends-container');
        
        if (!tbody || !dynamics || !dynamics.periods) return;

        const periods = dynamics.periods || [];

        if (periods.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">No data available</td>
                </tr>
            `;
        } else {
            tbody.innerHTML = periods.map(period => {
                const statusCounts = period.byStatus || [];
                const statusMap = {};
                statusCounts.forEach(s => {
                    statusMap[s.status] = s.count;
                });

                return `
                    <tr>
                        <td>${Utils.escapeHtml(period.period)}</td>
                        <td><strong>${Utils.formatNumber(period.total)}</strong></td>
                        <td>${Utils.formatNumber(statusMap['new'] || 0)}</td>
                        <td>${Utils.formatNumber(statusMap['in_progress'] || 0)}</td>
                        <td>${Utils.formatNumber(statusMap['completed'] || 0)}</td>
                        <td>${Utils.formatNumber(statusMap['cancelled'] || 0)}</td>
                    </tr>
                `;
            }).join('');
        }

        container.style.display = 'block';
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
        showReportLoadingState,
        renderKpiCards,
        renderTrendsTable,
    };
})();
