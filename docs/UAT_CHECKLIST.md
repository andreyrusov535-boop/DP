# UAT & Release Readiness Checklist

This document outlines the User Acceptance Testing (UAT) procedures and release readiness criteria for the Request Management System Phase 3.

## Table of Contents

1. [Pre-UAT Checklist](#pre-uat-checklist)
2. [Functional UAT](#functional-uat)
3. [Security & Compliance UAT](#security--compliance-uat)
4. [Performance & Load Testing](#performance--load-testing)
5. [Accessibility & Browser UAT](#accessibility--browser-uat)
6. [Post-UAT Checklist](#post-uat-checklist)
7. [30-Day Stability Monitoring](#30-day-stability-monitoring)
8. [Rollback Procedures](#rollback-procedures)

## Pre-UAT Checklist

### Infrastructure & Environment Setup

- [ ] **Staging Server Ready**
  - [ ] Ubuntu 18.04+ or equivalent Linux
  - [ ] Node.js 18+ installed and verified
  - [ ] SQLite3 database initialized
  - [ ] `/uploads` directory created and writable
  - [ ] Port 3000 (or configured port) accessible
  - [ ] SSL/TLS certificate installed (if using HTTPS)

- [ ] **Configuration Verified**
  - [ ] `.env` file created with all required variables
  - [ ] `JWT_SECRET` set to production value (minimum 32 characters)
  - [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` configured
  - [ ] Database backup location configured
  - [ ] Rate limits set appropriately
  - [ ] File upload limits configured (5 files, 10MB each)

- [ ] **Database & Data**
  - [ ] Database migration completed: `npm run migrate`
  - [ ] Nomenclature seeded: `npm run seed`
  - [ ] Test users created (citizen, operator, executor, supervisor, admin)
  - [ ] Database backup created and verified
  - [ ] Audit log table empty/ready

- [ ] **Backup & Recovery**
  - [ ] Backup script created and tested
  - [ ] Backup storage location configured
  - [ ] Recovery procedure documented
  - [ ] Restore test completed successfully

- [ ] **Documentation**
  - [ ] INSTALLATION.md reviewed and tested
  - [ ] ADMIN_GUIDE.md reviewed for completeness
  - [ ] USER_GUIDE.md role-specific sections validated
  - [ ] API_SPEC.md updated for Phase 3
  - [ ] OpenAPI spec generated and validated

### Application Build & Deployment

- [ ] **Code Quality**
  - [ ] ESLint passes: `npm run lint`
  - [ ] No security vulnerabilities: `npm audit`
  - [ ] Unit tests pass: `npm test`
  - [ ] Code coverage acceptable (>80% target)

- [ ] **Dependencies**
  - [ ] All dependencies up to date
  - [ ] No vulnerable packages
  - [ ] package-lock.json committed
  - [ ] Security audit clean: `npm audit --production`

- [ ] **Build & Deploy**
  - [ ] Application starts successfully: `npm start`
  - [ ] Health check responds: `/health` endpoint
  - [ ] Static files served correctly
  - [ ] API routes respond with 200/appropriate status
  - [ ] Database queries execute successfully

## Functional UAT

### Authentication & Authorization

#### Citizen Role
- [ ] **Registration**
  - [ ] User can register with valid email and password
  - [ ] Email validation works (rejects invalid emails)
  - [ ] Password strength validation enforced (8+ chars, uppercase, lowercase, number)
  - [ ] Cannot register with existing email
  - [ ] Default role is "citizen"

- [ ] **Login**
  - [ ] Citizen can log in with correct credentials
  - [ ] Login fails with incorrect password
  - [ ] Login fails with non-existent email
  - [ ] JWT tokens generated correctly
  - [ ] Tokens expire at configured time (15 minutes default)
  - [ ] Refresh token works (7 days default)

- [ ] **Authorization**
  - [ ] Can view only own requests
  - [ ] Cannot edit requests
  - [ ] Cannot delete files
  - [ ] Cannot access reports
  - [ ] Cannot access admin settings

#### Operator Role
- [ ] **Permissions**
  - [ ] Can view all requests
  - [ ] Can create requests
  - [ ] Can edit requests (status, priority, executor, etc.)
  - [ ] Can delete individual file attachments
  - [ ] Can assign executors
  - [ ] Can remove requests from deadline control
  - [ ] Cannot access admin features

- [ ] **Request Management**
  - [ ] Can change request status
  - [ ] Can add notes to requests
  - [ ] Can upload additional files
  - [ ] Can edit all request fields (except ID, timestamps)

#### Supervisor Role
- [ ] **Permissions**
  - [ ] All operator permissions
  - [ ] Can access reports and analytics
  - [ ] Can manage nomenclature items (types, topics, groups, forms)
  - [ ] Can view audit log
  - [ ] Can export reports (Excel, PDF)
  - [ ] Cannot create users
  - [ ] Cannot change user roles

- [ ] **Reporting**
  - [ ] Dashboard displays statistics
  - [ ] Can filter reports by status, date, type
  - [ ] Charts render correctly (Requests by Status, Monthly Dynamics)
  - [ ] Export to Excel works
  - [ ] Export to PDF works

#### Admin Role
- [ ] **Full Permissions**
  - [ ] All supervisor permissions
  - [ ] Can create users
  - [ ] Can change user roles
  - [ ] Can lock/unlock users
  - [ ] Can modify system configuration
  - [ ] Can view complete audit log
  - [ ] Can access all system features

- [ ] **User Management**
  - [ ] Can create new user accounts
  - [ ] Can assign roles (citizen, operator, executor, supervisor, admin)
  - [ ] Can change existing user roles
  - [ ] Can lock user accounts
  - [ ] Can unlock locked accounts
  - [ ] Can view all users and their details

### Request Management

#### Create Request
- [ ] **Citizen Creating Request**
  - [ ] Form displays all fields
  - [ ] Required fields enforced (citizenFio, description)
  - [ ] Email validation works
  - [ ] Phone validation works (minimum 5 characters)
  - [ ] File upload works (up to 5 files)
  - [ ] Supported formats accepted (JPEG, PNG, GIF, PDF)
  - [ ] File size limit enforced (10MB per file)
  - [ ] Request created with status "new"
  - [ ] Audit log records creation

- [ ] **Operator Creating Request**
  - [ ] All citizen fields available
  - [ ] Can assign executor
  - [ ] Can set due date
  - [ ] Can set priority
  - [ ] Can set initial status

#### View Requests
- [ ] **Request List**
  - [ ] Pagination works (20 items per page default)
  - [ ] Sorting works (by created date, due date, priority, status)
  - [ ] Filtering works:
    - [ ] By status
    - [ ] By type
    - [ ] By topic
    - [ ] By priority
    - [ ] By executor
    - [ ] By date range
    - [ ] By citizen name
  - [ ] Full-text search works (description, citizen FIO, executor, email)
  - [ ] Debounced search (no excessive API calls)
  - [ ] Virtual scrolling for large lists (50+ items)
  - [ ] Request counts displayed correctly

- [ ] **Request Details**
  - [ ] All request information displays correctly
  - [ ] Attachments section shows files with metadata
  - [ ] Download links work
  - [ ] Status badge shows current status
  - [ ] Control status shows correctly (no/normal/approaching/overdue)
  - [ ] Deadline date displays if set
  - [ ] Assigned executor displays if set
  - [ ] Notes/proceedings display in chronological order

#### Edit Request
- [ ] **Operator Can Edit**
  - [ ] Description can be edited
  - [ ] Status can be changed
  - [ ] Priority can be changed
  - [ ] Executor can be assigned/reassigned
  - [ ] Due date can be modified
  - [ ] Files can be added (respecting 5-file limit)
  - [ ] Files can be deleted (if operator/supervisor/admin)
  - [ ] Changes recorded in audit log
  - [ ] Updated timestamp changes

- [ ] **Update Validation**
  - [ ] Invalid email rejected
  - [ ] Invalid phone rejected (< 5 chars)
  - [ ] HTML in description sanitized
  - [ ] Empty description rejected
  - [ ] Invalid date rejected

#### Request Status Changes
- [ ] **Status Workflow**
  - [ ] Can change from new → in_progress
  - [ ] Can change from in_progress → paused
  - [ ] Can change from paused → in_progress
  - [ ] Can change to completed (for completed work)
  - [ ] Can change to archived (to close request)
  - [ ] Can change to cancelled (unable to process)
  - [ ] Cannot change status after removed (removed is terminal)
  - [ ] Status changes logged in audit_log and request_proceedings

#### Remove from Control
- [ ] **Remove from Control**
  - [ ] Requires operator role or higher
  - [ ] Changes status to "removed"
  - [ ] Request no longer subject to deadline tracking
  - [ ] Notes recorded in proceedings
  - [ ] Audit log records the action
  - [ ] Cannot change status after removal (terminal state)

### File Management

#### Upload Files
- [ ] **Supported Formats**
  - [ ] JPEG (.jpg, .jpeg) accepted
  - [ ] PNG (.png) accepted
  - [ ] GIF (.gif) accepted
  - [ ] PDF (.pdf) accepted
  - [ ] Other formats rejected with error message

- [ ] **File Size Limits**
  - [ ] Files under 10MB accepted
  - [ ] Files over 10MB rejected
  - [ ] Total request size respects 50MB limit (5 × 10MB)
  - [ ] Meaningful error messages displayed

- [ ] **File Count Limits**
  - [ ] Up to 5 files per request allowed
  - [ ] 6th file rejected with error message
  - [ ] When editing, respects 5-file total limit
  - [ ] Cannot exceed 5 even with multiple edits

#### Download Files
- [ ] **Download Functionality**
  - [ ] Click download triggers browser download
  - [ ] Original filename preserved
  - [ ] File content intact after download
  - [ ] Correct MIME type in response

#### Delete Files (Operator+)
- [ ] **Delete Permissions**
  - [ ] Only operator, supervisor, admin can delete
  - [ ] Citizens cannot delete
  - [ ] Public download access still works

- [ ] **Delete Functionality**
  - [ ] Click delete button removes from UI
  - [ ] Confirmation dialog appears
  - [ ] File removed from database
  - [ ] File removed from disk
  - [ ] Audit log records deletion
  - [ ] Proceeding entry created
  - [ ] Cannot re-download deleted file (404)

### Deadline & Control Status

#### Deadline Calculation
- [ ] **Control Status Updates**
  - [ ] Status "no" for requests without deadline
  - [ ] Status "normal" for on-track requests
  - [ ] Status "approaching" for requests within 48 hours
  - [ ] Status "overdue" for past-deadline requests
  - [ ] Status updates run via scheduled job (hourly)

- [ ] **Deadline Job**
  - [ ] Runs automatically on startup
  - [ ] Runs every hour via cron
  - [ ] Updates control_status correctly
  - [ ] Triggers notifications for approaching deadlines

#### Notifications
- [ ] **Email Notifications**
  - [ ] Sends 24 hours before deadline (configurable)
  - [ ] Includes request details
  - [ ] Recipients: assigned executor and operators
  - [ ] Can configure cron schedule
  - [ ] Works with SMTP configuration

### Reports & Analytics (Supervisor+)

#### Dashboard
- [ ] **Statistics Cards**
  - [ ] Total requests displayed
  - [ ] Requests by status breakdown
  - [ ] Requests by priority breakdown
  - [ ] Requests by type breakdown
  - [ ] Overdue/approaching counts

#### Reports
- [ ] **Overview Report**
  - [ ] Shows total counts
  - [ ] Counts by status
  - [ ] Counts by type
  - [ ] Counts by priority
  - [ ] Average response time
  - [ ] Filters work correctly

- [ ] **Dynamics Report**
  - [ ] Shows time-series data
  - [ ] Daily grouping option
  - [ ] Weekly grouping option
  - [ ] Charts render correctly
  - [ ] Includes stacked bar chart
  - [ ] Includes doughnut chart

#### Export
- [ ] **Excel Export**
  - [ ] Downloads .xlsx file
  - [ ] Contains request data
  - [ ] Properly formatted
  - [ ] Can open in Excel/Sheets
  - [ ] All filters applied to export

- [ ] **PDF Export**
  - [ ] Downloads .pdf file
  - [ ] Contains formatted report
  - [ ] Charts included (if applicable)
  - [ ] Professional appearance
  - [ ] All filters applied to export

### Nomenclature Management (Supervisor+)

#### List Nomenclature
- [ ] **Entity Types**
  - [ ] Request Types list displays
  - [ ] Request Topics list displays
  - [ ] Social Groups list displays
  - [ ] Intake Forms list displays
  - [ ] Pagination works (50 items default)
  - [ ] Can include inactive items in filter

#### Create Item
- [ ] **Add New Item**
  - [ ] Form displays for new item
  - [ ] Code field required (unique)
  - [ ] Name field required
  - [ ] Default active status true
  - [ ] Cannot create with duplicate code
  - [ ] New item immediately available in requests

#### Update Item
- [ ] **Edit Item**
  - [ ] Code cannot be changed (unique constraint)
  - [ ] Name can be edited
  - [ ] Changes apply to future requests
  - [ ] Already-created requests keep original item reference

#### Toggle Active
- [ ] **Activate/Deactivate**
  - [ ] Active items appear in create/edit forms
  - [ ] Inactive items hidden from form (option in list)
  - [ ] Can toggle between active and inactive
  - [ ] Does not affect requests already using the item

## Security & Compliance UAT

### HTTPS & TLS
- [ ] **SSL/TLS Configuration**
  - [ ] Reverse proxy (nginx/Apache) configured
  - [ ] SSL certificate installed and valid
  - [ ] HTTP redirects to HTTPS
  - [ ] HSTS header present
  - [ ] TLS 1.2+ enforced

### JWT Security
- [ ] **Token Security**
  - [ ] JWT_SECRET is strong (minimum 32 characters)
  - [ ] Tokens expire correctly (15 minutes)
  - [ ] Refresh tokens expire correctly (7 days)
  - [ ] Token validation enforced
  - [ ] Invalid tokens rejected (401)
  - [ ] Expired tokens rejected (401)

### Password Security
- [ ] **Password Requirements**
  - [ ] Minimum 8 characters enforced
  - [ ] Uppercase letter required
  - [ ] Lowercase letter required
  - [ ] Number required
  - [ ] Passwords hashed with bcrypt
  - [ ] Bcrypt rounds: 10 (or higher)

### CSRF Protection
- [ ] **State-changing Operations**
  - [ ] POST/PATCH/DELETE require proper methods
  - [ ] No CSRF tokens needed (stateless JWT)
  - [ ] SameSite cookie attribute set (if cookies used)

### SQL Injection Prevention
- [ ] **Query Safety**
  - [ ] All user input parameterized
  - [ ] No string concatenation in SQL
  - [ ] SQLite prepared statements used
  - [ ] Security tests pass (see security.test.js)

### XSS Prevention
- [ ] **Output Encoding**
  - [ ] User input sanitized (sanitize-html)
  - [ ] HTML tags stripped from descriptions
  - [ ] No inline JavaScript in responses
  - [ ] CSP headers configured
  - [ ] Security tests pass

### Rate Limiting
- [ ] **API Rate Limits**
  - [ ] Rate limiting enabled: 100 req/15 min per IP
  - [ ] Auth endpoints stricter: 5 attempts/15 min
  - [ ] Returns 429 when limit exceeded
  - [ ] Limits apply correctly to /api/auth
  - [ ] Can be bypassed in test environment

### Headers Security
- [ ] **Security Headers**
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: SAMEORIGIN
  - [ ] Strict-Transport-Security (HSTS)
  - [ ] Content-Security-Policy configured
  - [ ] X-XSS-Protection present

### Data Privacy
- [ ] **Data Protection**
  - [ ] No sensitive data in logs
  - [ ] No passwords in audit log
  - [ ] No tokens in audit log
  - [ ] Users can view their own data
  - [ ] Users cannot view other citizens' requests

### Audit Trail
- [ ] **Audit Logging**
  - [ ] All user actions logged
  - [ ] Creation, update, delete logged
  - [ ] File operations logged
  - [ ] Status changes logged
  - [ ] User actions logged
  - [ ] Audit log cannot be deleted
  - [ ] Timestamps included
  - [ ] User ID included
  - [ ] Changes recorded in request_proceedings

### Role-Based Access Control
- [ ] **RBAC Enforcement**
  - [ ] Public endpoints: auth, health, nomenclature
  - [ ] Authenticated endpoints: requests, files
  - [ ] Role-based endpoints: reports, users, settings
  - [ ] Forbidden actions return 403
  - [ ] Unauthenticated actions return 401

## Performance & Load Testing

### Response Time Targets
- [ ] **API Response Times**
  - [ ] GET /health: < 100ms average, < 500ms max
  - [ ] GET /requests: < 2s average, < 10s max
  - [ ] POST /requests: < 2s average, < 5s max
  - [ ] GET /reports/overview: < 3s average, < 10s max
  - [ ] File download: < 2s average (depends on file size)

### Load Testing
- [ ] **Concurrent Users**
  - [ ] System handles 10 concurrent users
  - [ ] System handles 50 concurrent users
  - [ ] System handles 100 concurrent users
  - [ ] Performance degrades gracefully
  - [ ] No data corruption under load
  - [ ] Database locks handled properly

- [ ] **Data Stress**
  - [ ] System handles 1,000+ requests in database
  - [ ] System handles 5,000+ files in storage
  - [ ] Search still responsive with large data
  - [ ] Pagination works correctly
  - [ ] No memory leaks observed

### Smoke Tests
- [ ] **Automated Tests**
  - [ ] `npm run test:perf` completes successfully
  - [ ] All endpoints respond under SLA
  - [ ] No timeout errors
  - [ ] Memory usage remains stable
  - [ ] CPU usage reasonable

### Database Performance
- [ ] **Query Performance**
  - [ ] Requests list query < 1s (with 1000+ records)
  - [ ] Search query < 2s
  - [ ] Audit log query < 2s
  - [ ] No N+1 queries
  - [ ] Indexes are utilized

### File Upload Performance
- [ ] **Upload Speed**
  - [ ] 10MB file upload completes in < 5s
  - [ ] 5 files upload together completes in < 10s
  - [ ] Disk space not exhausted on full requests
  - [ ] Cleanup of incomplete uploads works

### Memory Usage
- [ ] **Memory Stability**
  - [ ] Process starts at < 100MB
  - [ ] Under load, stays < 500MB
  - [ ] No memory leaks after extended runtime
  - [ ] Garbage collection works properly

## Accessibility & Browser UAT

### Browser Compatibility
- [ ] **Modern Browsers**
  - [ ] Chrome 90+ tested and working
  - [ ] Firefox 88+ tested and working
  - [ ] Safari 14+ tested and working
  - [ ] Edge 90+ tested and working
  - [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### Responsive Design
- [ ] **Breakpoints**
  - [ ] 1280×720 (Large desktop): Fully functional
  - [ ] 1024×768 (Tablet): Fully functional
  - [ ] 480×320 (Mobile): Fully functional
  - [ ] No horizontal scroll at any resolution
  - [ ] Touch targets >= 44px on mobile
  - [ ] Form inputs accessible on mobile
  - [ ] Modals display correctly on small screens

### Accessibility (WCAG 2.1 AA)
- [ ] **Keyboard Navigation**
  - [ ] All interactive elements keyboard accessible
  - [ ] Tab order logical
  - [ ] Escape closes modals
  - [ ] Ctrl/Cmd+K focuses search
  - [ ] Arrow keys work in lists
  - [ ] Focus visible at all times

- [ ] **Screen Reader Support**
  - [ ] Tested with NVDA (Windows)
  - [ ] Tested with JAWS (Windows)
  - [ ] Tested with VoiceOver (Mac/iOS)
  - [ ] Page structure announced correctly
  - [ ] Form labels associated with inputs
  - [ ] Error messages announced
  - [ ] Status updates announced
  - [ ] Skip navigation link present

- [ ] **Visual Accessibility**
  - [ ] Color contrast >= 4.5:1 for text
  - [ ] Focus indicators visible
  - [ ] No color-only information
  - [ ] Text resizable to 200% without loss of function
  - [ ] High contrast mode supported
  - [ ] Reduced motion respected

- [ ] **Form Accessibility**
  - [ ] All inputs have associated labels
  - [ ] Required fields marked and announced
  - [ ] Error messages clear and actionable
  - [ ] Inline validation feedback provided
  - [ ] Form submission feedback provided
  - [ ] Autocomplete attributes present

### Performance Accessibility
- [ ] **Performance**
  - [ ] First Contentful Paint < 3s
  - [ ] Largest Contentful Paint < 4s
  - [ ] Cumulative Layout Shift < 0.1
  - [ ] Time to Interactive < 5s
  - [ ] Core Web Vitals in "good" range

## Post-UAT Checklist

### Documentation Review
- [ ] **Documentation Complete**
  - [ ] README.md updated for Phase 3
  - [ ] INSTALLATION.md tested and accurate
  - [ ] ADMIN_GUIDE.md covers all admin tasks
  - [ ] USER_GUIDE.md role-specific sections accurate
  - [ ] API_SPEC.md matches OpenAPI spec
  - [ ] OpenAPI spec passes validation
  - [ ] CHANGELOG.md documents Phase 3 changes

### Sign-Off
- [ ] **UAT Sign-Off**
  - [ ] Functional testing completed
  - [ ] All acceptance criteria met
  - [ ] No critical bugs remaining
  - [ ] Performance acceptable
  - [ ] Security reviewed and approved
  - [ ] Accessibility compliant
  - [ ] Documentation approved
  - [ ] Stakeholder sign-off obtained

### Release Preparation
- [ ] **Deployment Ready**
  - [ ] Backup system tested
  - [ ] Rollback procedure documented
  - [ ] Deployment runbook created
  - [ ] Maintenance window scheduled
  - [ ] Communication plan finalized
  - [ ] Support team trained
  - [ ] Monitoring configured
  - [ ] Log rotation configured

- [ ] **Version Management**
  - [ ] Version number updated (e.g., 1.0.0)
  - [ ] CHANGELOG.md updated
  - [ ] Git tag created
  - [ ] Release notes published
  - [ ] Dependencies locked in package-lock.json

## 30-Day Stability Monitoring

### Daily Checks (Days 1-30)
- [ ] **Operational Health**
  - [ ] Application running without errors
  - [ ] API responses within SLA
  - [ ] Database integrity verified
  - [ ] Disk space adequate
  - [ ] Email notifications working (if configured)
  - [ ] Scheduled jobs executing

- [ ] **Error Monitoring**
  - [ ] Check logs for errors: `tail -f logs/app.log | grep ERROR`
  - [ ] Check for 5xx errors in access logs
  - [ ] No unhandled exceptions
  - [ ] Database errors < 0.1%
  - [ ] Rate limit errors < 1%

- [ ] **User Activity**
  - [ ] Users can create requests
  - [ ] Users can log in successfully
  - [ ] File uploads working
  - [ ] Reports generating correctly
  - [ ] Notifications being sent

### Weekly Checks (Days 1-30)
- [ ] **Performance Metrics**
  - [ ] Average response time < 2s
  - [ ] Peak response time < 10s
  - [ ] Memory usage stable < 500MB
  - [ ] CPU usage reasonable
  - [ ] Database queries optimized

- [ ] **Data Quality**
  - [ ] No orphaned files in uploads/
  - [ ] Database integrity check: `sqlite3 data/requests.sqlite "PRAGMA integrity_check;"`
  - [ ] Audit log growing normally
  - [ ] No duplicate data
  - [ ] File references correct

- [ ] **Security**
  - [ ] No suspicious login attempts
  - [ ] No SQL injection attempts
  - [ ] No XSS attempts in audit log
  - [ ] Rate limiting working
  - [ ] JWT validation working

### Monthly Check (Day 30+)
- [ ] **Stability Report**
  - [ ] Uptime > 99%
  - [ ] No critical bugs reported
  - [ ] Performance stable
  - [ ] Security no issues
  - [ ] User satisfaction high
  - [ ] Document findings

### Issues Found
If any issues found during 30-day period:
1. Document the issue with date and time
2. Determine severity (critical, major, minor)
3. Prioritize for fixing
4. Deploy fix in hotfix release if critical
5. Continue monitoring for regression
6. Update 30-day clock if critical issue found

## Rollback Procedures

### Pre-Rollback Checklist
- [ ] **Decision Made**
  - [ ] Critical issues identified
  - [ ] Rollback decision approved by management
  - [ ] Backup verified and accessible
  - [ ] Rollback procedure reviewed
  - [ ] Stakeholders notified

### Database Rollback
```bash
# 1. Stop application
pkill -f "node src/server.js"

# 2. Restore database from backup
cp backups/requests.sqlite.<timestamp> data/requests.sqlite

# 3. Verify database integrity
sqlite3 data/requests.sqlite "PRAGMA integrity_check;"

# 4. Restart application
npm start
```

### File Rollback
```bash
# 1. Restore uploads directory
rm -rf uploads/
tar -xzf backups/uploads.<timestamp>.tar.gz

# 2. Verify files
ls -la uploads/ | wc -l
```

### Code Rollback
```bash
# 1. Checkout previous version
git checkout v1.0.0  # or previous version tag

# 2. Install dependencies if changed
npm install

# 3. Restart application
npm start
```

### Post-Rollback
- [ ] Verify application starts successfully
- [ ] Test key functionality:
  - [ ] User can log in
  - [ ] Can view requests
  - [ ] Can create request
  - [ ] Can download files
  - [ ] Health check passes
- [ ] Notify stakeholders
- [ ] Document what failed
- [ ] Plan investigation and fix

## Success Criteria

The system is ready for production when:

1. ✅ All functional UAT tests pass
2. ✅ Security audit passes
3. ✅ Performance targets met
4. ✅ Accessibility compliance verified
5. ✅ Browser compatibility confirmed
6. ✅ Documentation complete and reviewed
7. ✅ Backup and recovery procedures tested
8. ✅ Support team trained
9. ✅ Stakeholder sign-off obtained
10. ✅ No critical bugs remaining
11. ✅ 30-day monitoring plan documented
12. ✅ Rollback procedures documented and tested

---

**Document Version**: 1.0.0  
**Last Updated**: Phase 3  
**Next Review**: After 30-day stability period
