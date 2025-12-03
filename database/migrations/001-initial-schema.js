/**
 * Initial database schema migration
 * Creates all core tables with proper relationships, indexes, and constraints
 */

async function up(db) {
  // Users table for authentication and authorization
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'executor', 'user')),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      department TEXT,
      position TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Enhanced nomenclature tables with JSON metadata support
  await db.exec(`
    CREATE TABLE nomenclature (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('request_type', 'topic', 'receipt_form', 'executor', 'priority')),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      metadata TEXT, -- JSON for extensibility
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      sort_order INTEGER DEFAULT 0,
      parent_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, code),
      FOREIGN KEY (parent_id) REFERENCES nomenclature(id) ON DELETE SET NULL
    );
  `);

  // Requests table with enhanced fields
  await db.exec(`
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
      is_overdue INTEGER NOT NULL DEFAULT 0 CHECK (is_overdue IN (0, 1)),
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
  `);

  // Files table with enhanced metadata
  await db.exec(`
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
  `);

  // Enhanced audit log
  await db.exec(`
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
  `);

  // Enhanced request proceedings
  await db.exec(`
    CREATE TABLE request_proceedings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      user_id INTEGER,
      action TEXT NOT NULL CHECK (action IN ('note', 'status_change', 'assignment', 'deadline_change', 'resolution', 'rejection')),
      notes TEXT NOT NULL,
      internal_note INTEGER DEFAULT 0 CHECK (internal_note IN (0, 1)),
      visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('internal', 'public', 'executor_only')),
      metadata TEXT, -- JSON for additional data
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Create indexes for performance
  await db.exec(`
    -- Users indexes
    CREATE INDEX idx_users_username ON users(username);
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_users_active ON users(is_active);

    -- Nomenclature indexes
    CREATE INDEX idx_nomenclature_type ON nomenclature(type);
    CREATE INDEX idx_nomenclature_type_active ON nomenclature(type, is_active);
    CREATE INDEX idx_nomenclature_parent ON nomenclature(parent_id);
    CREATE INDEX idx_nomenclature_sort ON nomenclature(type, sort_order);

    -- Requests indexes
    CREATE INDEX idx_requests_citizen_fio ON requests(citizen_fio);
    CREATE INDEX idx_requests_status ON requests(status);
    CREATE INDEX idx_requests_priority ON requests(priority_id);
    CREATE INDEX idx_requests_executor ON requests(executor_id);
    CREATE INDEX idx_requests_due_date ON requests(due_date);
    CREATE INDEX idx_requests_control_status ON requests(control_status);
    CREATE INDEX idx_requests_overdue ON requests(is_overdue);
    CREATE INDEX idx_requests_created_at ON requests(created_at);
    CREATE INDEX idx_requests_type_topic ON requests(request_type_id, request_topic_id);
    CREATE INDEX idx_requests_status_executor ON requests(status, executor_id);

    -- Files indexes
    CREATE INDEX idx_files_request ON files(request_id);
    CREATE INDEX idx_files_category ON files(category);
    CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);

    -- Audit log indexes
    CREATE INDEX idx_audit_request ON audit_log(request_id);
    CREATE INDEX idx_audit_user ON audit_log(user_id);
    CREATE INDEX idx_audit_action ON audit_log(action);
    CREATE INDEX idx_audit_created_at ON audit_log(created_at);

    -- Request proceedings indexes
    CREATE INDEX idx_proceedings_request ON request_proceedings(request_id);
    CREATE INDEX idx_proceedings_user ON request_proceedings(user_id);
    CREATE INDEX idx_proceedings_action ON request_proceedings(action);
    CREATE INDEX idx_proceedings_visibility ON request_proceedings(visibility);
    CREATE INDEX idx_proceedings_created_at ON request_proceedings(created_at);
  `);

  // Create triggers for maintaining data consistency
  await db.exec(`
    -- Update updated_at timestamp for users
    CREATE TRIGGER update_users_updated_at 
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

    -- Update updated_at timestamp for nomenclature
    CREATE TRIGGER update_nomenclature_updated_at 
      AFTER UPDATE ON nomenclature
      FOR EACH ROW
      BEGIN
        UPDATE nomenclature SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

    -- Update updated_at timestamp for requests
    CREATE TRIGGER update_requests_updated_at 
      AFTER UPDATE ON requests
      FOR EACH ROW
      BEGIN
        UPDATE requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

    -- Auto-update overdue status based on due_date
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

    -- Auto-log status changes to audit_log
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

    -- Auto-log executor assignments to audit_log
    CREATE TRIGGER log_executor_assignment
      AFTER UPDATE OF executor_id ON requests
      FOR EACH ROW
      WHEN OLD.executor_id != NEW.executor_id
      BEGIN
        INSERT INTO audit_log (request_id, action, old_values, new_values, description)
        VALUES (
          NEW.id,
          'assigned',
          CASE WHEN OLD.executor_id IS NOT NULL THEN json_object('executor_id', OLD.executor_id) ELSE NULL END,
          CASE WHEN NEW.executor_id IS NOT NULL THEN json_object('executor_id', NEW.executor_id) ELSE NULL END,
          CASE 
            WHEN OLD.executor_id IS NULL AND NEW.executor_id IS NOT NULL THEN 'Request assigned'
            WHEN OLD.executor_id IS NOT NULL AND NEW.executor_id IS NULL THEN 'Request unassigned'
            ELSE 'Executor reassigned'
          END
        );
      END;
  `);
}

async function down(db) {
  // Drop triggers first
  await db.exec(`
    DROP TRIGGER IF EXISTS update_users_updated_at;
    DROP TRIGGER IF EXISTS update_nomenclature_updated_at;
    DROP TRIGGER IF EXISTS update_requests_updated_at;
    DROP TRIGGER IF EXISTS update_request_overdue_status;
    DROP TRIGGER IF EXISTS log_status_change;
    DROP TRIGGER IF EXISTS log_executor_assignment;
  `);

  // Drop indexes (they will be dropped with tables, but let's be explicit)
  await db.exec(`
    DROP INDEX IF EXISTS idx_users_username;
    DROP INDEX IF EXISTS idx_users_email;
    DROP INDEX IF EXISTS idx_users_role;
    DROP INDEX IF EXISTS idx_users_active;
    DROP INDEX IF EXISTS idx_nomenclature_type;
    DROP INDEX IF EXISTS idx_nomenclature_type_active;
    DROP INDEX IF EXISTS idx_nomenclature_parent;
    DROP INDEX IF EXISTS idx_nomenclature_sort;
    DROP INDEX IF EXISTS idx_requests_citizen_fio;
    DROP INDEX IF EXISTS idx_requests_status;
    DROP INDEX IF EXISTS idx_requests_priority;
    DROP INDEX IF EXISTS idx_requests_executor;
    DROP INDEX IF EXISTS idx_requests_due_date;
    DROP INDEX IF EXISTS idx_requests_control_status;
    DROP INDEX IF EXISTS idx_requests_overdue;
    DROP INDEX IF EXISTS idx_requests_created_at;
    DROP INDEX IF EXISTS idx_requests_type_topic;
    DROP INDEX IF EXISTS idx_requests_status_executor;
    DROP INDEX IF EXISTS idx_files_request;
    DROP INDEX IF EXISTS idx_files_category;
    DROP INDEX IF EXISTS idx_files_uploaded_by;
    DROP INDEX IF EXISTS idx_audit_request;
    DROP INDEX IF EXISTS idx_audit_user;
    DROP INDEX IF EXISTS idx_audit_action;
    DROP INDEX IF EXISTS idx_audit_created_at;
    DROP INDEX IF EXISTS idx_proceedings_request;
    DROP INDEX IF EXISTS idx_proceedings_user;
    DROP INDEX IF EXISTS idx_proceedings_action;
    DROP INDEX IF EXISTS idx_proceedings_visibility;
    DROP INDEX IF EXISTS idx_proceedings_created_at;
  `);

  // Drop tables in reverse order of dependencies
  await db.exec(`
    DROP TABLE IF EXISTS request_proceedings;
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS files;
    DROP TABLE IF EXISTS requests;
    DROP TABLE IF EXISTS nomenclature;
    DROP TABLE IF EXISTS users;
  `);
}

module.exports = { up, down };