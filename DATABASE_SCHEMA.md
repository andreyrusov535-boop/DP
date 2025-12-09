# Database Schema Documentation

## Overview

This document describes the database schema, migration system, and data management for the Request Management API.

## Architecture

### Database Service

The application uses SQLite as the database with a comprehensive service layer (`src/database/databaseService.js`) that provides:

- **Connection Management**: Optimized SQLite configuration with WAL mode
- **Migration System**: Version-controlled schema migrations
- **Prepared Statements**: Cached prepared statements for performance and SQL injection prevention
- **Transaction Support**: Built-in transaction management
- **Health Monitoring**: Database health checks and statistics

### Migration System

Migrations are located in `database/migrations/` and follow the naming convention `XXX-description.js`:

- `001-initial-schema.js` - Creates all core tables, indexes, and triggers
- `002-seed-data.js` - Populates nomenclature tables with essential data

Each migration file exports `up()` and `down()` functions for applying and rolling back changes.

## Core Tables

### Users

Authentication and authorization data for system users.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'executor', 'user')),
  is_active INTEGER NOT NULL DEFAULT 1,
  department TEXT,
  position TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `role`: User role (admin, executor, user)
- `is_active`: Whether the user account is active
- `department`: User's department
- `position`: User's position/title

### Nomenclature

Centralized lookup table for all reference data with JSON metadata support.

```sql
CREATE TABLE nomenclature (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('request_type', 'topic', 'receipt_form', 'executor', 'priority')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata TEXT, -- JSON for extensibility
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  parent_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, code),
  FOREIGN KEY (parent_id) REFERENCES nomenclature(id) ON DELETE SET NULL
);
```

**Types:**
- `request_type`: Categories of requests (water supply, road maintenance, etc.)
- `topic`: Specific topics linked to request types
- `receipt_form`: How requests are received (phone, email, in-person, etc.)
- `executor`: Departments or individuals responsible for handling requests
- `priority`: Request priority levels

**Metadata Examples:**
```json
{
  "response_time_hours": 24,
  "escalation_hours": 48,
  "email": "water@city.gov",
  "phone": "+12345678901",
  "requires_signature": true,
  "processing_days": 3
}
```

### Requests

Main entity for citizen requests with enhanced tracking capabilities.

```sql
CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  citizen_fio TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  request_type_id INTEGER,
  request_topic_id INTEGER,
  receipt_form_id INTEGER,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'pending_info', 'resolved', 'rejected', 'closed')),
  priority_id INTEGER NOT NULL DEFAULT 3,
  executor_id INTEGER,
  assigned_by INTEGER, -- User who assigned the executor
  due_date TEXT,
  resolved_at TEXT,
  control_status TEXT NOT NULL DEFAULT 'no' CHECK (control_status IN ('yes', 'no', 'overdue')),
  is_overdue INTEGER NOT NULL DEFAULT 0,
  external_id TEXT, -- For integration with external systems
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'import')),
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_type_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
  FOREIGN KEY (request_topic_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
  FOREIGN KEY (receipt_form_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
  FOREIGN KEY (priority_id) REFERENCES nomenclature(id) ON DELETE SET NULL,
  FOREIGN KEY (executor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

**Status Values:**
- `new`: Newly created request
- `in_progress`: Being worked on
- `pending_info`: Waiting for additional information
- `resolved`: Successfully completed
- `rejected`: Request rejected
- `closed`: Request closed (final state)

**Control Status:**
- `yes`: Under deadline control
- `no`: Not under deadline control
- `overdue`: Past due date

### Files

File attachments for requests with integrity tracking.

```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  file_hash TEXT, -- SHA-256 hash for integrity
  description TEXT,
  category TEXT DEFAULT 'attachment' CHECK (category IN ('attachment', 'evidence', 'document', 'photo')),
  uploaded_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
```

**File Categories:**
- `attachment`: General attachment
- `evidence`: Evidence documentation
- `document`: Official documents
- `photo`: Photographs

### Audit Log

Comprehensive audit trail for all request activities.

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'assigned', 'status_changed', 'file_uploaded', 'file_deleted', 'commented', 'resolved', 'rejected', 'closed')),
  old_values TEXT, -- JSON with previous values
  new_values TEXT, -- JSON with new values
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Request Proceedings

Detailed notes and proceedings for request handling.

```sql
CREATE TABLE request_proceedings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('note', 'status_change', 'assignment', 'deadline_change', 'resolution', 'rejection')),
  notes TEXT NOT NULL,
  internal_note INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('internal', 'public', 'executor_only')),
  metadata TEXT, -- JSON for additional data
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## Indexes

Performance indexes are created for frequently queried fields:

```sql
-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Requests
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_executor ON requests(executor_id);
CREATE INDEX idx_requests_due_date ON requests(due_date);
CREATE INDEX idx_requests_control_status ON requests(control_status);
CREATE INDEX idx_requests_overdue ON requests(is_overdue);
CREATE INDEX idx_requests_created_at ON requests(created_at);

-- Composite indexes
CREATE INDEX idx_requests_type_topic ON requests(request_type_id, request_topic_id);
CREATE INDEX idx_requests_status_executor ON requests(status, executor_id);
```

## Triggers

Automated triggers maintain data consistency:

### Update Timestamps
Automatically updates `updated_at` fields when records are modified.

### Overdue Status Management
```sql
CREATE TRIGGER update_request_overdue_status
  AFTER UPDATE OF due_date, status ON requests
  FOR EACH ROW
  WHEN NEW.due_date IS NOT NULL AND NEW.status NOT IN ('resolved', 'rejected', 'closed')
  BEGIN
    UPDATE requests 
    SET is_overdue = CASE 
      WHEN date(NEW.due_date) < date('now') THEN 1 
      ELSE 0 
    END,
    control_status = CASE 
      WHEN date(NEW.due_date) < date('now') THEN 'overdue'
      ELSE 'no'
    END
    WHERE id = NEW.id;
  END;
```

### Audit Logging
```sql
CREATE TRIGGER log_status_change
  AFTER UPDATE OF status ON requests
  FOR EACH ROW
  WHEN OLD.status != NEW.status
  BEGIN
    INSERT INTO audit_log (request_id, action, old_values, new_values, description)
    VALUES (
      NEW.id,
      'status_changed',
      json_object('status', OLD.status),
      json_object('status', NEW.status),
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END;
```

## Migration Commands

### Basic Usage

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate -- --status

# Rollback last migration
npm run migrate -- --rollback

# Rollback 3 migrations
npm run migrate -- --rollback 3

# Seed database with initial data
npm run seed

# Refresh seed data (drop and recreate)
npm run seed -- --refresh

# Run smoke tests to verify setup
npm run smoke-test
```

### Advanced Usage

```javascript
const { dbService } = require('./src/database/databaseService');

// Direct database access
await dbService.initialize();
const db = dbService.getDatabase();

// Using prepared statements
const users = await dbService.getAll('get_active_users', [
  'SELECT * FROM users WHERE is_active = 1 ORDER BY username'
]);

// Transactions
await dbService.transaction(async (db) => {
  await db.run('INSERT INTO requests (...) VALUES (...)');
  await db.run('INSERT INTO audit_log (...) VALUES (...)');
});

// Health check
const health = await dbService.healthCheck();
console.log(health);
```

## Seed Data

### Default Users
- **admin**: System administrator (password: admin123)
- **water_manager**: Water department manager
- **roads_manager**: Roads department manager  
- **clerk**: Office clerk

### Request Types
- Water Supply
- Sewerage
- Street Lighting
- Road Maintenance
- Waste Management
- Public Transport
- Parks & Recreation
- Noise Control
- Building Permits
- Public Health

### Priorities
- Critical (immediate attention)
- High (urgent attention)
- Medium (normal priority)
- Low (can be addressed later)

### Receipt Forms
- Written Application
- Electronic Portal
- Phone Call
- Email
- Personal Visit
- Mobile Application

### Executors
- Water Supply Department
- Road Maintenance Department
- Waste Management Department
- Transport Department
- Parks Department
- Public Health Department
- Building Department
- Administrative Office

## Security Features

### SQL Injection Prevention
- All queries use parameterized statements
- Input validation in `dbService.validateParams()`
- Prepared statement caching

### Data Integrity
- Foreign key constraints enforced
- Check constraints for enum values
- Triggers for consistency
- SHA-256 file hashes for integrity

### Access Control
- User roles and permissions
- Internal vs public note visibility
- Audit logging of all actions

## Performance Optimizations

### SQLite Configuration
```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456; -- 256MB
```

### Index Strategy
- Individual indexes on frequently filtered columns
- Composite indexes for common query patterns
- Covering indexes for performance-critical queries

## Monitoring and Maintenance

### Health Checks
```javascript
const health = await dbService.healthCheck();
// Returns: status, connected, totalTables, totalRecords, pendingMigrations
```

### Statistics
```javascript
const stats = await dbService.getStats();
// Returns: array of tables with record counts, total records
```

### Smoke Testing
Automated verification of:
- Database connectivity
- Table and index existence
- Trigger functionality
- Seed data integrity
- Constraint enforcement
- Transaction support

## Backup and Recovery

### Database Location
- Default: `./data/requests.sqlite`
- Configurable via `DB_PATH` environment variable

### Backup Strategy
```bash
# Create backup
cp data/requests.sqlite data/requests.backup.$(date +%Y%m%d_%H%M%S).sqlite

# Restore from backup
cp data/requests.backup.20231201_120000.sqlite data/requests.sqlite
```

### Migration Safety
- All migrations are transactional
- Automatic rollback on failure
- Version tracking prevents duplicate migrations
- Down migrations available for rollback

## Troubleshooting

### Common Issues

1. **Migration fails with "database is locked"**
   - Ensure no other processes are using the database
   - Check for hanging transactions

2. **Foreign key constraint errors**
   - Verify parent records exist before creating children
   - Check for orphaned records

3. **Performance issues**
   - Run `EXPLAIN QUERY PLAN` on slow queries
   - Check if appropriate indexes exist
   - Consider adding composite indexes

### Debug Mode
```bash
# Enable SQLite debug output
SQLITE_DEBUG=1 npm run migrate
```

### Manual Database Access
```bash
# Open database with SQLite CLI
sqlite3 data/requests.sqlite

# View schema
.schema

# Check tables
.tables
```