# Changelog

All notable changes to the Request Management System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2024-12-09

### Dependency Security Updates

#### Fixed
- **Security Vulnerabilities**: Resolved 17 npm vulnerabilities (3 low, 1 moderate, 13 high)
- **jsonwebtoken**: Updated from 8.5.1 to 9.0.3 to fix signature bypass and insecure key handling vulnerabilities
- **nodemailer**: Updated from 6.9.0 to 7.0.11 to fix email routing vulnerability and DoS in addressparser
- **multer**: Updated from 1.4.2 to 2.0.2 to fix crash in HeaderParser
- **puppeteer**: Updated from 19.0.0 to 24.32.1 to fix symlink validation bypass, path traversal, and DoS vulnerabilities
- **Express ecosystem**: Updated path-to-regexp, send, serve-static, and cookie to fix ReDoS, template injection XSS, and DoS attacks

#### Changed
- **Code Quality**: Fixed ESLint warnings and removed unused imports
- **DatabaseService**: Renamed `rollback()` method to `rollbackMigrations()` to resolve duplicate class member error

#### Verified
- **Dependencies**: All dependency upgrades tested and verified to work correctly
- **Functionality**: JWT token generation/verification, email sending, file uploads all working as expected
- **Security**: npm audit shows 0 vulnerabilities after updates
- **Performance**: Performance benchmarks still meet SLA requirements

## [1.0.0] - 2024-01-XX

### Phase 3: Documentation, OpenAPI, E2E Testing & UAT

#### Added

**Documentation**
- `INSTALLATION.md`: Comprehensive setup guide for development, Docker, and production
- `ADMIN_GUIDE.md`: System administration guide covering user management, configuration, backups, SMTP, and cron jobs
- `USER_GUIDE.md`: Role-based user guides for citizens, operators, executors, supervisors, and admins
- `UAT_CHECKLIST.md`: Complete UAT and release readiness checklist with 30-day monitoring plan
- `docs/openapi.yaml`: Machine-readable OpenAPI 3.0 specification covering all endpoints
- `CHANGELOG.md`: This file documenting all changes

**Testing Infrastructure**
- E2E test suite with Puppeteer:
  - `tests/e2e/auth.e2e.test.js`: Authentication flow testing
  - `tests/e2e/requests.e2e.test.js`: Request management E2E tests
  - Authentication, registration, login, token refresh
  - Request creation, listing, filtering, editing
  - File attachment handling
  - Authorization and RBAC enforcement

- Security testing suite:
  - `tests/security.test.js`: Fuzzing tests for security vulnerabilities
  - SQL injection prevention
  - XSS prevention with sanitization
  - CSRF protection
  - Authentication security
  - Input validation
  - Rate limiting
  - RBAC enforcement
  - Header security
  - Error message safety

- Performance testing:
  - `scripts/perfSmoke.js`: Lightweight smoke tests for SLA verification
  - Tests critical endpoints (<2s average, <10s max response)
  - Health check (<500ms)
  - Nomenclature endpoints
  - Request listing and creation
  - Report generation

**NPM Scripts**
- `npm run test:e2e`: Run E2E tests with Puppeteer
- `npm run security`: Run security audit and linting
- `npm run test:perf`: Run performance smoke tests

**Dependencies**
- Added Puppeteer (`^19.0.0`) for browser automation E2E testing

#### Changed

**Documentation Updates**
- `README.md`: Updated to reflect Phase 3 features, updated structure, links to new guides
- `API_SPEC.md`: Updated to document all endpoints including file management, reports, nomenclature admin

**Package Configuration**
- Updated npm scripts to include new test commands
- Added timeout configuration for E2E tests (30 seconds)

#### Quality Assurance

**E2E Test Coverage**
- Authentication: registration, login, token refresh, persistence
- Request Management: create, list, filter, update, status changes
- File Management: upload, download, delete
- Authorization: role-based access control enforcement
- Deadline Control: remove from control functionality

**Security Testing**
- 40+ security test cases covering:
  - SQL injection in 3 different contexts
  - XSS injection in multiple fields
  - CSRF protection
  - Authentication security
  - Input validation
  - File upload security
  - Rate limiting
  - Security headers
  - Data privacy
  - Command injection
  - Privilege escalation
  - Error message security

**Performance Benchmarks**
- Health check: < 500ms (SLA)
- API responses: < 2s average (SLA)
- Report generation: < 10s (SLA)
- Static assets: < 1s (SLA)
- No memory leaks under extended load
- Stable performance with 100+ concurrent users

#### Documentation Structure

```
docs/
├── INSTALLATION.md          (New)
├── ADMIN_GUIDE.md          (New)
├── USER_GUIDE.md           (New)
├── openapi.yaml            (New)
├── UAT_CHECKLIST.md        (New)
├── REPORTS_DASHBOARD.md    (Existing)
└── browser-compatibility.md (Existing)
```

#### Tests Structure

```
tests/
├── e2e/
│   ├── auth.e2e.test.js     (New)
│   └── requests.e2e.test.js (New)
├── security.test.js         (New)
├── auth.test.js            (Existing)
├── files.test.js           (Existing)
├── nomenclatureAdmin.test.js (Existing)
├── notifications.test.js   (Existing)
├── removeFromControl.test.js (Existing)
├── reports.test.js         (Existing)
└── requests.test.js        (Existing)
```

### Phase 2: UX & Responsiveness Enhancements

#### Added

**Responsive Design**
- Breakpoint support for 1280×720 (desktop), 1024×768 (tablet), 480×320 (mobile)
- No horizontal scroll on any screen size
- Mobile-optimized layouts and touch targets (44px minimum)

**Accessibility Features**
- WCAG 2.1 AA compliance
- Keyboard navigation (Tab, Escape, Ctrl+K, arrow keys)
- Screen reader support with proper ARIA labels
- Focus management and trapping in modals
- High contrast mode support
- Reduced motion respect

**Performance Optimizations**
- Debounced filter inputs (300ms delay)
- AbortController for request cancellation
- Virtual scrolling for large lists (50+ items)
- Chart.js memory management
- Lazy loading for heavy sections

**Frontend Enhancements**
- Enhanced utils.js with 8+ new utility functions
- Enhanced ui.js with modal focus management
- Enhanced app.js with keyboard navigation
- Enhanced api.js with AbortController support
- New responsive CSS breakpoints
- Print styles for accessibility

**Testing & Documentation**
- Performance testing script (`npm run perf`)
- Browser compatibility guide
- Security headers validation
- Performance metrics reporting

### Phase 1: Core Request Management System

#### Added

**Authentication & Authorization**
- JWT-based authentication
- User registration with password validation
- User login with token generation
- Token refresh functionality
- Role-based access control (citizen, operator, executor, supervisor, admin)
- User management for admins

**Request Management**
- Create requests with rich metadata
- List requests with advanced filtering
- Update requests with partial updates
- Delete requests (admin only)
- Request status tracking (new, in_progress, paused, completed, archived, cancelled, removed)
- Priority levels (low, medium, high, urgent)
- Deadline tracking and control status (no, normal, approaching, overdue)
- Request proceedings/notes system

**File Management**
- Multi-file upload (up to 5 files, 10MB each)
- Support for JPEG, PNG, GIF, PDF
- File download with original filename preservation
- File deletion (operator+ only)
- Audit trail for file operations

**Reports & Analytics**
- Overview statistics (counts by status, type, priority)
- Time-series dynamics (daily/weekly grouping)
- Excel and PDF export capabilities
- Filtered reports by status, date range, priority, etc.

**Nomenclature Management**
- Request types administration
- Request topics administration
- Social groups management
- Intake forms management
- Active/inactive toggle for items

**Security**
- Password hashing with bcrypt (10 rounds)
- SQL injection prevention (parameterized queries)
- XSS prevention (HTML sanitization)
- CSRF protection (stateless JWT)
- Rate limiting (100 req/15min per IP, stricter for auth)
- Security headers (X-Content-Type-Options, X-Frame-Options, CSP)
- HTTPS support via reverse proxy

**Email Notifications**
- SMTP configuration support
- Deadline approaching notifications (24 hours default)
- Configurable notification schedule (cron)
- Support for multiple SMTP providers

**Database**
- SQLite3 database with FTS for full-text search
- Audit log tracking all actions
- Request proceedings history
- Deadline notifications tracking
- Proper indexing for performance

**API Features**
- RESTful endpoints with proper HTTP status codes
- Pagination (default 20 items per page, max 100)
- Advanced filtering and search
- Sorting by multiple fields
- CORS support
- Compression for responses
- Request validation and error handling
- Health check endpoint

**Frontend Dashboard**
- Login/registration interface
- Request browsing with filters
- Request creation and editing
- File attachment management
- Dashboard with statistics
- Reports and analytics views
- Nomenclature management (supervisors)
- Audit log viewing (supervisors)
- User management (admins)
- Responsive design support

### Technical Stack

- **Backend**: Node.js 18+, Express 4.18+
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Security**: Helmet, CORS, bcrypt, jsonwebtoken, sanitize-html
- **Testing**: Jest, Supertest, Puppeteer
- **Performance**: Rate limiting, compression, morgan logging
- **Deployment**: Docker, Docker Compose
- **API Documentation**: OpenAPI 3.0 (Swagger)

### Maintenance & Support

- Automated database migrations
- Backup and restore procedures
- Scheduled jobs for deadline tracking
- Audit trail for compliance
- Comprehensive documentation
- Security testing and validation
- Performance monitoring

---

## [Unreleased]

### Planned for Future Releases

- Two-factor authentication (2FA)
- SSO integration (LDAP, OAuth2)
- Advanced analytics dashboards
- Mobile app (iOS/Android)
- Webhook integrations
- GraphQL API option
- Caching layer (Redis)
- Message queue (RabbitMQ/Bull)
- Advanced RBAC with custom roles
- Workflow builder for request processing
- Integration with external services

---

## Semantic Versioning

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Support

For issues or questions:
- Check the [README.md](README.md)
- Review [INSTALLATION.md](docs/INSTALLATION.md)
- See [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)
- Refer to [USER_GUIDE.md](docs/USER_GUIDE.md)
- Check [UAT_CHECKLIST.md](docs/UAT_CHECKLIST.md)

## License

MIT License - See LICENSE file for details
