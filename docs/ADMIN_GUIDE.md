# Administrator Guide

This guide covers system administration tasks including user management, configuration, backups, and system monitoring for the Request Management System.

## Table of Contents

1. [System Overview](#system-overview)
2. [User & Role Management](#user--role-management)
3. [Configuration Management](#configuration-management)
4. [Backup & Restore](#backup--restore)
5. [Email & SMTP Setup](#email--smtp-setup)
6. [Scheduled Jobs (Cron)](#scheduled-jobs-cron)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

## System Overview

### Architecture

The Request Management System consists of:

- **Frontend**: Static HTML/CSS/JavaScript dashboard (public/)
- **API Server**: Express.js REST API (src/)
- **Database**: SQLite3 (data/requests.sqlite)
- **File Storage**: Local filesystem (uploads/)
- **Background Jobs**: Node-cron tasks for deadlines and notifications

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| API Server | REST endpoints, auth, request management | src/app.js, src/routes/ |
| Database | Persistent data storage | data/requests.sqlite |
| Upload Directory | File attachments storage | uploads/ |
| Configuration | Environment settings | .env |
| Migrations | Database schema updates | scripts/migrate.js |

### System Roles

| Role | Capabilities | Visibility |
|------|-------------|-----------|
| **Citizen** | Create requests, view own requests, download own attachments | Own requests only |
| **Operator** | Create/edit requests, manage assignments, delete attachments, view audit log | All requests |
| **Executor** | View assigned requests, update status, add notes | Assigned requests |
| **Supervisor** | Full request management, reports, nomenclature editing, audit log | All requests |
| **Admin** | User management, configuration, system settings, full audit access | Everything |

## User & Role Management

### Creating Users

#### Via Admin Panel

1. Log in as an admin
2. Navigate to Settings → User Management
3. Click "Add User"
4. Fill in:
   - **Email**: User's email address (unique)
   - **Name**: User's display name
   - **Role**: Select role (citizen, operator, executor, supervisor, admin)
5. Click "Create User"
6. Share generated temporary password with user

#### Via API

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@example.com",
    "name": "John Operator",
    "role": "operator"
  }'
```

### Changing User Roles

1. Log in as an admin
2. Navigate to Settings → User Management
3. Find the user in the list
4. Click the three-dot menu → Edit
5. Change the role
6. Click "Update"

#### Role Transition Guidelines

- **Citizen → Operator**: Grant access to manage requests
- **Operator → Supervisor**: Grant access to reporting and nomenclature management
- **Supervisor → Admin**: Grant access to user management and system configuration
- **Remove Admin**: Ensure at least one admin remains active

### Deactivating Users

To disable a user without deleting them:

1. Navigate to Settings → User Management
2. Find the user
3. Click the three-dot menu → Lock User
4. Confirm the lock

This prevents login while preserving the user's request history and audit trail.

### Password Management

Users can reset passwords through the login page's "Forgot Password" link.

For admin password resets:

1. Log in as admin
2. Navigate to Settings → User Management
3. Find the user
4. Click → Send Password Reset Email

The user will receive an email with a reset link.

### Bulk User Import

To import users from a CSV file:

1. Prepare CSV file with columns: email, name, role
2. Log in as admin
3. Navigate to Settings → User Management
4. Click "Import Users"
5. Upload the CSV file
6. Review the preview
7. Click "Import"

CSV Format Example:

```csv
email,name,role
alice@example.com,Alice Smith,operator
bob@example.com,Bob Jones,supervisor
```

## Configuration Management

### Changing Environment Settings

Edit the `.env` file and restart the application:

```bash
# Stop current instance
pkill -f "node src/server.js"

# Edit configuration
nano .env

# Restart
npm start
```

### Key Configuration Parameters

#### Rate Limiting

```env
# Maximum requests per IP in the time window
RATE_LIMIT_MAX_REQUESTS=100

# Time window in milliseconds (default: 15 minutes)
RATE_LIMIT_WINDOW_MS=900000
```

Adjust based on your expected traffic:
- High-traffic systems: 200-500 requests per 15 minutes
- Low-traffic systems: 50-100 requests per 15 minutes
- During migrations: Temporarily increase to 1000+

#### File Upload Limits

```env
# Maximum number of files per request
MAX_ATTACHMENTS=5

# Maximum file size in bytes (default: 10MB)
MAX_FILE_SIZE=10485760
```

Supported MIME types (hardcoded, cannot be changed without code modification):
- image/jpeg
- image/png
- image/gif
- application/pdf

To change allowed file types, edit `src/config.js` and restart.

#### JWT Configuration

```env
# Secret key for JWT signing (minimum 32 characters)
JWT_SECRET=your-very-secure-secret-key-change-in-production

# Access token expiry (default: 15 minutes)
JWT_EXPIRY=15m

# Refresh token expiry (default: 7 days)
JWT_REFRESH_EXPIRY=7d
```

**Important**: Changing `JWT_SECRET` will invalidate all current tokens. Users must log in again.

#### Bcrypt Configuration

```env
# Hash rounds for password encryption (higher = slower but more secure)
BCRYPT_ROUNDS=10
```

For systems with many login attempts:
- Increase to 12 for higher security
- Decrease to 8 for faster login (security trade-off)

### Accessing Configuration at Runtime

Configuration values are loaded once at startup. Changes require an application restart:

```bash
npm restart
```

Or restart via process manager:

```bash
systemctl restart request-management
```

## Backup & Restore

### Automated Backup Strategy

Recommended backup frequency:
- **Development**: Daily
- **Production**: Hourly (database), Real-time (file uploads)

### Manual Database Backup

#### Full Backup

```bash
# Create backup directory
mkdir -p backups

# Backup database
cp data/requests.sqlite backups/requests.sqlite.$(date +%Y%m%d_%H%M%S)

# Backup uploads directory
tar -czf backups/uploads.$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

#### Incremental Backup (SQLite)

```bash
# Using SQLite backup command
sqlite3 data/requests.sqlite ".backup backups/requests.sqlite.incremental"

# Using tar for file changes
tar -czf backups/uploads.incremental.$(date +%Y%m%d).tar.gz \
  --listed-incremental backups/uploads.snapshot \
  uploads/
```

### Backup Verification

Always verify backups before relying on them:

```bash
# Check database integrity
sqlite3 backups/requests.sqlite.20240101_120000 "PRAGMA integrity_check;"

# Test restore (to temporary location)
cp backups/requests.sqlite.20240101_120000 /tmp/requests.test.sqlite
sqlite3 /tmp/requests.test.sqlite "SELECT COUNT(*) FROM requests;"
```

### Database Restore

#### Full Restore

```bash
# Stop application
pkill -f "node src/server.js"

# Restore database
cp backups/requests.sqlite.20240101_120000 data/requests.sqlite

# Restart application
npm start
```

#### Restore to Specific Point in Time

1. Stop the application
2. Copy backup to data/requests.sqlite
3. Restart application
4. Verify data integrity in the dashboard

### File Upload Restore

```bash
# Restore from backup
tar -xzf backups/uploads.20240101_120000.tar.gz -C /

# Or selective restore
tar -xzf backups/uploads.20240101_120000.tar.gz -C uploads/ file123.pdf
```

### Backup Scheduling (Crontab)

Set up automated backups using cron:

```bash
# Edit crontab
crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * /usr/local/bin/backup-request-management.sh
```

Create `/usr/local/bin/backup-request-management.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/request-management"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_PATH="/app/data/requests.sqlite"
UPLOAD_DIR="/app/uploads"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $DB_PATH $BACKUP_DIR/requests.sqlite.$TIMESTAMP

# Backup uploads
tar -czf $BACKUP_DIR/uploads.$TIMESTAMP.tar.gz $UPLOAD_DIR/

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

# Log backup completion
echo "[$(date)] Backup completed: $BACKUP_DIR" >> /var/log/request-management-backup.log
```

Make executable:

```bash
chmod +x /usr/local/bin/backup-request-management.sh
```

## Email & SMTP Setup

### SMTP Configuration

Edit `.env` with your mail server settings:

```env
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=Request Management <noreply@requests.example.com>
```

### SMTP Providers

#### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM_EMAIL=Request System <noreply@gmail.com>
```

**Note**: Use an [App Password](https://myaccount.google.com/apppasswords), not your Gmail password.

#### Office 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=Request Management <noreply@company.com>
```

#### AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

#### Local Mail Server (Development)

Use Mailhog for testing:

```bash
# Run Mailhog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Configure
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

Access sent emails at: http://localhost:8025

### Testing Email Configuration

1. Create or edit a request with a deadline
2. The system sends notifications at the configured time
3. Check if emails are received

For immediate testing:

```bash
npm test -- --testNamePattern="notification"
```

### Notification Settings

```env
# Hours before deadline to send notification
NOTIFICATION_HOURS_BEFORE_DEADLINE=24

# Cron schedule for checking deadlines (see Scheduled Jobs)
NOTIFICATION_CRON_SCHEDULE=0 * * * *
```

### Debugging Email Issues

Check application logs for SMTP errors:

```bash
npm start 2>&1 | grep -i "smtp\|mail\|notification"
```

If emails are not sending:

1. Verify SMTP credentials in `.env`
2. Test SMTP connection manually
3. Check server firewall rules
4. Review application logs for errors

## Scheduled Jobs (Cron)

### Deadline Refresh Job

**Purpose**: Recalculates deadline control statuses (normal, approaching, overdue)

**Default Schedule**: Runs automatically every hour and on startup

**Configuration**: Automatic (no configuration needed)

**What It Does**:
- Compares current date/time with request due dates
- Updates `control_status` field
- Triggers notifications if threshold met

### Notification Job

**Purpose**: Sends email notifications for approaching deadlines

**Default Schedule**: Hourly (configurable)

**Configuration**:

```env
# Run every hour
NOTIFICATION_CRON_SCHEDULE=0 * * * *

# Run every 6 hours
NOTIFICATION_CRON_SCHEDULE=0 */6 * * *

# Run daily at 9 AM
NOTIFICATION_CRON_SCHEDULE=0 9 * * *

# Run Monday at 8 AM
NOTIFICATION_CRON_SCHEDULE=0 8 * * 1
```

### Custom Job Creation

To add custom scheduled tasks:

1. Create a new file in `src/jobs/`
2. Use the `node-cron` library (already installed)
3. Register in `src/app.js` bootstrap function

Example:

```javascript
// src/jobs/archiveJob.js
const cron = require('node-cron');

function scheduleArchiveJob() {
  cron.schedule('0 0 * * 0', async () => {
    // Archive old requests every Sunday at midnight
    console.log('Running archive job...');
  });
}

module.exports = { scheduleArchiveJob };
```

### Monitoring Scheduled Jobs

View job execution logs:

```bash
npm start 2>&1 | grep -i "job\|schedule\|notification"
```

For persistent logging:

```bash
npm start 2>&1 | tee logs/app.log
tail -f logs/app.log | grep -i "job"
```

## Monitoring & Maintenance

### System Health Checks

The application provides a health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

Set up monitoring:

```bash
# Uptime monitoring script
watch -n 60 'curl -s http://localhost:3000/health | grep ok && echo "OK" || echo "FAILED"'
```

### Performance Monitoring

Monitor application performance:

```bash
# View Node.js process memory
ps aux | grep "node src/server.js"

# Monitor real-time usage
top -p $(pgrep -f "node src/server.js")
```

Set up alerts for:
- Memory usage > 500 MB
- Response time > 2 seconds
- Error rate > 1%

### Database Maintenance

#### Optimize Database

```bash
# Defragment database
sqlite3 data/requests.sqlite "VACUUM;"

# Analyze query performance
sqlite3 data/requests.sqlite "ANALYZE;"

# Check integrity
sqlite3 data/requests.sqlite "PRAGMA integrity_check;"
```

#### Clear Old Data

Archive or delete old requests (older than 1 year):

```bash
# Backup first!
cp data/requests.sqlite data/requests.sqlite.backup

# Delete old archived requests (older than 365 days)
sqlite3 data/requests.sqlite "
  DELETE FROM requests
  WHERE status = 'archived'
  AND created_at < datetime('now', '-365 days');
"
```

#### Database Indexes

View current indexes:

```bash
sqlite3 data/requests.sqlite ".indices"
```

Create additional indexes for frequently queried fields:

```bash
sqlite3 data/requests.sqlite "
  CREATE INDEX IF NOT EXISTS idx_requests_territory ON requests(territory);
  CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
"
```

### Audit Log Review

Access audit logs through the dashboard (Supervisors/Admins only).

#### Query Audit Log Directly

```bash
# View recent user actions
sqlite3 data/requests.sqlite "
  SELECT user_id, action, entity_type, created_at
  FROM audit_log
  ORDER BY created_at DESC
  LIMIT 20;
"

# View specific user actions
sqlite3 data/requests.sqlite "
  SELECT action, entity_type, created_at
  FROM audit_log
  WHERE user_id = 123
  ORDER BY created_at DESC;
"
```

## Troubleshooting

### Application Won't Start

1. Check Node.js version: `node --version` (must be 18+)
2. Check port availability: `lsof -i :3000`
3. Check `.env` file syntax
4. Review error logs: `npm start 2>&1 | head -20`

### Database Issues

```bash
# Check database integrity
sqlite3 data/requests.sqlite "PRAGMA integrity_check;"

# Rebuild indexes if corrupted
sqlite3 data/requests.sqlite "REINDEX;"

# Export and verify table structure
sqlite3 data/requests.sqlite ".schema requests"
```

### High Memory Usage

1. Restart application: `pkill -f "node src/server.js" && npm start`
2. Archive old requests: Run database cleanup
3. Increase available system RAM
4. Check for memory leaks in logs

### SMTP Not Working

1. Verify credentials in `.env`
2. Test port connectivity: `telnet mail.example.com 587`
3. Check firewall rules
4. Review application logs: `npm start 2>&1 | grep -i smtp`

### Users Can't Log In

1. Verify user account exists and is active
2. Check JWT settings in `.env`
3. Clear browser cache and cookies
4. Check system time synchronization (important for JWT)

### File Upload Failures

1. Check disk space: `df -h`
2. Verify upload directory permissions: `ls -la uploads/`
3. Check file size limits in `.env`
4. Review error logs

For additional support, refer to the main README and API documentation.
